import Papa from "papaparse";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { holdings, lots, trades } from "@/server/db/schema";
import { fetchQuote, fetchFundamentals } from "@/server/market/yahoo";
import { adjustCash } from "./portfolio";

export type ImportRow = {
  ticker: string;
  name: string;
  units: number;
  price: number; // in quote currency (pence for GBp)
  date: string; // YYYY-MM-DD
  type: "buy" | "sell";
  currency: "GBp" | "GBP";
  warning?: string;
};

type RawRow = Record<string, string>;

function parseDate(s: string): string | null {
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[0];
  const dmy = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
  return null;
}

function detectBroker(headers: string[]): "trading212" | "freetrade" | "ibkr" | "unknown" {
  const h = headers.map((x) => x.toLowerCase());
  if (h.includes("isin") && h.some((x) => x.includes("action"))) return "trading212";
  if (h.includes("symbol") && h.some((x) => x.includes("trade date"))) return "ibkr";
  if (
    h.some((x) => x.includes("buy / sell")) ||
    h.some((x) => x.includes("buy/sell") && x.length < 20)
  )
    return "freetrade";
  return "unknown";
}

function parseTrading212Row(row: RawRow): Partial<ImportRow> | null {
  const action = (row["Action"] ?? "").toLowerCase();
  if (!action.includes("buy") && !action.includes("sell")) return null;
  const ticker = row["Ticker"] ?? "";
  if (!ticker) return null;
  const units = parseFloat(row["No. of shares"] ?? "0");
  const priceRaw = parseFloat(row["Price / share"] ?? "0");
  const currencyStr = row["Currency (Price / share)"] ?? "GBP";
  const currency: "GBp" | "GBP" = currencyStr === "GBp" || currencyStr === "GBX" ? "GBp" : "GBP";
  // Normalise to pence
  const price = currency === "GBP" ? priceRaw * 100 : priceRaw;
  const date = parseDate(row["Time"] ?? row["Date"] ?? "") ?? "";
  if (!date || units <= 0 || price <= 0) return null;
  return {
    ticker: ticker.toUpperCase(),
    name: row["Name"] ?? ticker,
    units,
    price,
    date,
    type: action.includes("sell") ? "sell" : "buy",
    currency: "GBp",
  };
}

function parseFreetrade(row: RawRow): Partial<ImportRow> | null {
  const action = (row["Buy / Sell"] ?? row["Buy/Sell"] ?? "").toLowerCase();
  if (!action) return null;
  const ticker = row["Symbol"] ?? "";
  const units = parseFloat(row["Quantity"] ?? "0");
  const priceRaw = parseFloat(row["Price"] ?? "0");
  const date = parseDate(row["Order Placed At"] ?? row["Date"] ?? "") ?? "";
  if (!date || units <= 0 || priceRaw <= 0) return null;
  return {
    ticker: ticker.toUpperCase(),
    name: row["Title"] ?? ticker,
    units,
    price: priceRaw * 100, // assume GBp
    date,
    type: action.includes("sell") ? "sell" : "buy",
    currency: "GBp",
  };
}

function parseIBKR(row: RawRow): Partial<ImportRow> | null {
  const action = (row["Buy/Sell"] ?? "").toLowerCase();
  if (!action) return null;
  const ticker = row["Symbol"] ?? "";
  const units = Math.abs(parseFloat(row["Quantity"] ?? "0"));
  const price = parseFloat(row["T. Price"] ?? row["Price"] ?? "0");
  const date = parseDate(row["Trade Date"] ?? row["Date/Time"] ?? "") ?? "";
  const currencyStr = row["Currency"] ?? "USD";
  const currency: "GBp" | "GBP" = currencyStr === "GBp" || currencyStr === "GBX" ? "GBp" : "GBP";
  if (!date || units <= 0 || price <= 0) return null;
  return {
    ticker: ticker.toUpperCase(),
    name: row["Description"] ?? ticker,
    units,
    price,
    date,
    type: action.includes("sell") ? "sell" : "buy",
    currency,
  };
}

export function parseBrokerCSV(csvText: string): ImportRow[] {
  const { data, meta } = Papa.parse<RawRow>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  const broker = detectBroker(meta.fields ?? []);
  const rows: ImportRow[] = [];

  for (const raw of data) {
    let parsed: Partial<ImportRow> | null = null;
    if (broker === "trading212") parsed = parseTrading212Row(raw);
    else if (broker === "freetrade") parsed = parseFreetrade(raw);
    else if (broker === "ibkr") parsed = parseIBKR(raw);
    if (parsed?.ticker && parsed.date && (parsed.units ?? 0) > 0 && (parsed.price ?? 0) > 0) {
      rows.push(parsed as ImportRow);
    }
  }

  return rows;
}

export async function previewImport(
  userId: string,
  csvText: string,
): Promise<{ rows: ImportRow[]; duplicates: number }> {
  const rows = parseBrokerCSV(csvText);

  const existingTrades = await db
    .select({ ticker: trades.ticker, date: trades.date, units: trades.units, price: trades.price })
    .from(trades)
    .where(eq(trades.userId, userId));

  const existingSet = new Set(
    existingTrades.map((t) => `${t.ticker}:${t.date}:${t.units}:${t.price}`),
  );

  let duplicates = 0;
  const annotated = rows.map((r) => {
    const key = `${r.ticker}:${r.date}:${r.units}:${r.price}`;
    if (existingSet.has(key)) {
      duplicates++;
      return { ...r, warning: "duplicate" as const };
    }
    return r;
  });

  return { rows: annotated, duplicates };
}

export async function confirmImport(
  userId: string,
  rows: ImportRow[],
): Promise<{ imported: number }> {
  const existingTrades = await db
    .select({ ticker: trades.ticker, date: trades.date, units: trades.units, price: trades.price })
    .from(trades)
    .where(eq(trades.userId, userId));

  const existingSet = new Set(
    existingTrades.map((t) => `${t.ticker}:${t.date}:${t.units}:${t.price}`),
  );

  const toImport = rows.filter(
    (r) =>
      r.warning !== "duplicate" && !existingSet.has(`${r.ticker}:${r.date}:${r.units}:${r.price}`),
  );

  let imported = 0;

  for (const row of toImport) {
    const divisor = row.currency === "GBp" ? 100 : 1;

    // Ensure holding exists
    const [existing] = await db
      .select()
      .from(holdings)
      .where(and(eq(holdings.userId, userId), eq(holdings.ticker, row.ticker)))
      .limit(1);

    if (!existing) {
      let name = row.name;
      let currency: "GBp" | "GBP" = row.currency;
      let sector = "";
      try {
        const q = await fetchQuote(row.ticker);
        name = q.name || name;
        currency = q.currency;
      } catch {}
      try {
        const f = await fetchFundamentals(row.ticker);
        sector = f.sector ?? "";
      } catch {}
      await db.insert(holdings).values({
        userId,
        ticker: row.ticker,
        name,
        bucket: "Stock",
        sector,
        currency,
        allocTarget: 0,
        thesis: "",
        bearCase: "",
      });
    }

    if (row.type === "buy") {
      await db.insert(lots).values({
        userId,
        ticker: row.ticker,
        units: row.units,
        buyPrice: row.price,
        dateBought: row.date,
      });
      await adjustCash(userId, -((row.price * row.units) / divisor));
    }

    await db.insert(trades).values({
      userId,
      type: row.type,
      ticker: row.ticker,
      name: row.name,
      units: row.units,
      price: row.price,
      amountGBP: (row.price * row.units) / divisor,
      date: row.date,
    });

    imported++;
  }

  return { imported };
}

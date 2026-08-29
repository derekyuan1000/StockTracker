export const fmtGBP = (v: number, fractionDigits = 2) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(v);

export const fmtGBPSigned = (v: number, fractionDigits = 2) => {
  const s = fmtGBP(Math.abs(v), fractionDigits);
  return (v >= 0 ? "+" : "−") + s;
};

/**
 * Format a canonical GBP value into a chosen display currency.
 *
 * All portfolio math is stored in GBP (see `compute()`); base currency is a
 * display-only concern. `rate` is the GBP→display factor (1 for GBP itself),
 * supplied by the server from live FX. Use this for portfolio-value render
 * sites; keep `fmtGBP` for genuinely GBP-fixed surfaces (e.g. the leaderboard).
 */
export const fmtMoney = (
  valueGBP: number,
  opts: { currency?: string; rate?: number; fractionDigits?: number } = {},
) => {
  const { currency = "GBP", rate = 1, fractionDigits = 2 } = opts;
  const converted = valueGBP * rate;
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(converted);
  } catch {
    // Unknown/non-ISO code — fall back to a plain number with the code appended.
    return `${fmtNum(converted, fractionDigits)} ${currency}`;
  }
};

/**
 * Format a price in its own native currency. Handles the pence-quoted "GBp"
 * convention (shown as `70.50p`) which `Intl` cannot express as a currency.
 */
export const fmtNative = (price: number, currency: string, fractionDigits = 2) => {
  if (currency === "GBp") return `${fmtNum(price, fractionDigits)}p`;
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(price);
  } catch {
    return `${fmtNum(price, fractionDigits)} ${currency}`;
  }
};

export const fmtPct = (v: number, digits = 2) => `${v >= 0 ? "+" : ""}${v.toFixed(digits)}%`;

export const fmtNum = (v: number, digits = 0) =>
  new Intl.NumberFormat("en-GB", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(v);

export const fmtCompact = (v: number) =>
  new Intl.NumberFormat("en-GB", { notation: "compact", maximumFractionDigits: 1 }).format(v);

export const fmtWordNum = (v: number): string => {
  const abs = Math.abs(v);
  if (abs >= 1e12) return `${(v / 1e12).toFixed(2)} trillion`;
  if (abs >= 1e9) return `${(v / 1e9).toFixed(2)} billion`;
  if (abs >= 1e6) return `${(v / 1e6).toFixed(2)} million`;
  if (abs >= 1e3) return `${(v / 1e3).toFixed(2)} thousand`;
  return v.toFixed(2);
};

/** Direction token for a signed value — platform-agnostic replacement for web's `dirClass`. */
export const dir = (v: number): "up" | "down" | "flat" => (v > 0 ? "up" : v < 0 ? "down" : "flat");

export const fmtMarketTime = (iso: string): string => {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    const parts = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/London",
      timeZoneName: "short",
    }).formatToParts(d);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    return `${get("hour")}:${get("minute")} ${get("timeZoneName")}`;
  } catch {
    return "—";
  }
};

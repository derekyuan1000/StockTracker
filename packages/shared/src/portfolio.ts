export type Bucket = "Fund" | "Stock";

export interface Holding {
  ticker: string;
  name: string;
  bucket: Bucket;
  sector: string;
  units: number;
  avgBuyP: number;
  currency: "GBp" | "GBP";
  lastPrice: number;
  prevClose: number;
  dayLow: number;
  dayHigh: number;
  yearLow: number;
  yearHigh: number;
  volume: number;
  avgVol3m: number;
  marketTime: string;
  targetP: number;
  allocTarget: number;
  holdPeriodDays: number;
  spark: number[];
  pe?: number;
  forwardPe?: number;
  eps?: number;
  forwardEps?: number;
  pegRatio?: number;
  priceToBook?: number;
  evEbitda?: number;
  divYield?: number;
  divRateAnnual?: number;
  exDivDate?: string;
  divPayDate?: string;
  payoutRatio?: number;
  fiveYearAvgDivYield?: number;
  mktCap?: number;
  revenueGrowth?: number;
  earningsGrowth?: number;
  grossMargin?: number;
  operatingMargin?: number;
  profitMargin?: number;
  fcfYield?: number;
  netDebtEbitda?: number;
  debtToEquity?: number;
  currentRatio?: number;
  roe?: number;
  roic?: number;
  beta?: number;
  analyst?: { buy: number; hold: number; sell: number; targetHigh: number; targetLow: number };
  thesis?: string;
  bearCase?: string;
  realisedGL?: number | null;
  ytdPct?: number;
}

export const pToGBP = (p: number) => p / 100;

export interface HoldingComputed extends Holding {
  marketValueGBP: number;
  costGBP: number;
  unrealisedGL: number;
  unrealisedPct: number;
  dayChangeGBP: number;
  dayChangePct: number;
  upsidePct: number;
  allocActual: number;
}

export function compute(
  holdings: Holding[],
  cashGBP: number,
): {
  rows: HoldingComputed[];
  marketValue: number;
  totalValue: number;
  cost: number;
  unrealisedGL: number;
  unrealisedPct: number;
  dayChangeGBP: number;
  dayChangePct: number;
} {
  const rows: HoldingComputed[] = holdings.map((h) => {
    // GBP-quoted instruments (funds) don't need the /100 pence conversion
    const d = h.currency === "GBp" ? 100 : 1;
    const mv = (h.lastPrice * h.units) / d;
    const cost = (h.avgBuyP * h.units) / d;
    const ugl = mv - cost;
    const dayChangeGBP = ((h.lastPrice - h.prevClose) * h.units) / d;
    const dayChangePct = h.prevClose > 0 ? (h.lastPrice / h.prevClose - 1) * 100 : 0;
    return {
      ...h,
      marketValueGBP: mv,
      costGBP: cost,
      unrealisedGL: ugl,
      unrealisedPct: cost > 0 ? (ugl / cost) * 100 : 0,
      dayChangeGBP,
      dayChangePct,
      upsidePct:
        h.targetP > 0 && h.lastPrice > 0 ? ((h.targetP - h.lastPrice) / h.lastPrice) * 100 : 0,
      allocActual: 0,
    };
  });
  const marketValue = rows.reduce((s, r) => s + r.marketValueGBP, 0);
  const totalValue = marketValue + cashGBP;
  const cost = rows.reduce((s, r) => s + r.costGBP, 0);
  const ugl = rows.reduce((s, r) => s + r.unrealisedGL, 0);
  const dayChangeGBP = rows.reduce((s, r) => s + r.dayChangeGBP, 0);
  const prevTotal =
    rows.reduce((s, r) => s + (r.prevClose * r.units) / (r.currency === "GBp" ? 100 : 1), 0) +
    cashGBP;
  rows.forEach(
    (r) => (r.allocActual = marketValue > 0 ? (r.marketValueGBP / marketValue) * 100 : 0),
  );
  return {
    rows,
    marketValue,
    totalValue,
    cost,
    unrealisedGL: ugl,
    unrealisedPct: cost > 0 ? (ugl / cost) * 100 : 0,
    dayChangeGBP,
    dayChangePct: prevTotal > 0 ? (totalValue / prevTotal - 1) * 100 : 0,
  };
}

export const bucketTargets: Record<Bucket, number> = {
  Fund: 50,
  Stock: 50,
};

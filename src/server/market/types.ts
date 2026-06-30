export type HistoryRange = "1D" | "5D" | "1M" | "6M" | "YTD" | "1Y" | "5Y" | "All";
export type CacheKind = "quote" | "history" | "fundamentals" | "news" | "earnings";

export interface Quote {
  ticker: string;
  name: string;
  currency: "GBp" | "GBP";
  lastPrice: number;
  prevClose: number;
  dayLow: number;
  dayHigh: number;
  yearLow: number;
  yearHigh: number;
  volume: number;
  avgVol3m: number;
  marketTime: string; // ISO string
  spark: number[]; // last 5 closes
}

export interface Fundamentals {
  pe?: number;
  forwardPe?: number;
  eps?: number;
  forwardEps?: number;
  pegRatio?: number;
  priceToBook?: number;
  mktCap?: number;
  evEbitda?: number;
  divYield?: number;
  divRateAnnual?: number;
  exDivDate?: string;
  divPayDate?: string;
  payoutRatio?: number;
  fiveYearAvgDivYield?: number;
  beta?: number;
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
  targetP?: number;
  sector?: string;
  quoteType?: string;
  analyst?: { buy: number; hold: number; sell: number; targetHigh: number; targetLow: number };
}

export interface EarningsQuarter {
  label: string;
  revenue?: number;
  eps?: number;
  epsEstimate?: number;
}

export interface EarningsData {
  nextEarningsDate?: string;
  quarters: EarningsQuarter[];
}

export interface OHLCBar {
  ts: number; // unix ms
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface NewsItem {
  date: string;
  source: string;
  title: string;
  url: string;
}

export interface SearchResult {
  ticker: string;
  name: string;
}

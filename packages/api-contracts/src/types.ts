export type UserSettings = {
  portfolioPublic: boolean;
  theme: "dark" | "light" | "system";
  onboarded: boolean;
  /** ISO code of the display/base currency. Stored per user; default "GBP". */
  displayCurrency: string;
  /**
   * Live GBP→displayCurrency conversion factor, derived server-side. Not stored;
   * present on read responses so clients can re-denominate GBP values for display.
   */
  gbpToDisplay?: number;
};

export type PublicTrade = {
  displayName: string;
  type: "buy" | "sell";
  ticker: string;
  name: string;
  units: number;
  price: number;
  amountGBP: number;
  date: string;
};

export type LeaderboardEntry = {
  displayName: string;
  userId: string;
  costGBP: number;
  gainGBP: number;
  gainPct: number;
  monthGainPct: number | null;
  yearGainPct: number | null;
};

export type TickerItem = {
  ticker: string;
  name: string;
  last: number;
  changePct: number;
};

export type PublicProfile = {
  userId: string;
  displayName: string;
  trades: PublicTrade[];
  stats: {
    totalInvestedGBP: number;
    realisedGL: number;
    tradeCount: number;
  };
};

export type WatchlistRow = {
  ticker: string;
  name: string;
  /** Last price in the instrument's native currency. */
  lastPrice: number;
  prevClose: number;
  /** Native currency ISO code (or "GBp" for pence-quoted UK listings). */
  currency: string;
  /** Last price converted to GBP, so clients can re-denominate to any base. */
  lastPriceGBP: number;
};

export type WidgetSummary = {
  totalGBP: number;
  dayChangeGBP: number;
  dayChangePct: number;
  lifetimeGBP: number;
  lifetimePct: number;
  asOf: string;
};

export const DEFAULT_SETTINGS: UserSettings = {
  portfolioPublic: false,
  theme: "dark",
  onboarded: false,
  displayCurrency: "GBP",
  gbpToDisplay: 1,
};

// ─── Portfolio Analysis types ─────────────────────────────────────────────────

export type RiskMetrics = {
  annualizedVolPct: number;
  sharpePct: number;
  maxDrawdownPct: number;
  betaVsBenchmark: number | null;
  drawdownSeries: { ts: number; pct: number }[];
};

export type DiversificationMetrics = {
  hhi: number;
  topHoldingsConcentration: { ticker: string; name: string; allocPct: number }[];
  bySector: { label: string; pct: number }[];
  byCurrency: { label: string; pct: number }[];
  byBucket: { label: string; pct: number }[];
  correlation: { tickers: string[]; matrix: number[][] } | null;
};

export type AttributionMetrics = {
  byHolding: { ticker: string; name: string; contribution: number; periodReturnPct: number }[];
  bySector: { label: string; contribution: number }[];
};

export type IncomeMetrics = {
  projectedAnnualGBP: number;
  portfolioYieldPct: number;
  byHolding: {
    ticker: string;
    name: string;
    annualIncomeGBP: number;
    yieldOnCostPct: number;
    exDivDate?: string;
  }[];
};

export type PortfolioAnalysis = {
  range: string;
  benchmark: string | null;
  risk: RiskMetrics;
  diversification: DiversificationMetrics;
  attribution: AttributionMetrics;
  income: IncomeMetrics;
};

// ─── Alert types ──────────────────────────────────────────────────────────────

export type Alert = {
  id: number;
  ticker: string;
  direction: "above" | "below";
  targetPrice: number;
  active: boolean;
  triggeredAt: string | null;
  createdAt: string;
};

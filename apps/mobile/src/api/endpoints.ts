import { api } from "./client";
import type { Holding } from "@stocktracker/shared";
import type {
  UserSettings,
  WidgetSummary,
  PublicTrade,
  LeaderboardEntry,
  TickerItem,
  PortfolioAnalysis,
  PublicProfile,
} from "@stocktracker/api-contracts";
import type { z } from "zod";
import type {
  AddCashFlowSchema,
  UpdateSettingsSchema,
  AddHoldingSchema,
  AddLotSchema,
} from "@stocktracker/api-contracts";

// ─── Identity ───────────────────────────────────────────────────────────────
export type Me = { user: { id: string; email: string; name: string; image: string | null } };
export const getMe = () => api<Me>("/me");

// ─── Portfolio ──────────────────────────────────────────────────────────────
export type Portfolio = { holdings: Holding[]; cashGBP: number; realisedGL: number };
export const getPortfolio = () => api<Portfolio>("/portfolio");

export type HistoryRange = "1D" | "5D" | "15D" | "1M" | "6M" | "YTD" | "1Y" | "5Y" | "All";
export type HistoryPoint = { ts: number; value: number };
export const getPortfolioHistory = (range: HistoryRange) =>
  api<HistoryPoint[]>(`/portfolio/history?range=${encodeURIComponent(range)}`);

export const getWidgetSummary = () => api<WidgetSummary>("/widget/summary");

export type PeriodReturn = { period: string; pct: number; gbp: number; covered: number; total: number };
export const getPortfolioReturns = () => api<PeriodReturn[]>("/portfolio/returns");

export type AnalysisRange = "1M" | "6M" | "YTD" | "1Y" | "5Y" | "All";
export type BenchmarkRange = "1D" | "5D" | "1M" | "6M" | "YTD" | "1Y" | "5Y" | "All";

export const getAnalysis = (range: AnalysisRange, benchmark?: string) => {
  const params = new URLSearchParams({ range });
  if (benchmark) params.set("benchmark", benchmark);
  return api<PortfolioAnalysis>(`/portfolio/analysis?${params}`);
};

export type AiInsights = { narrative: string; model: string; cached: boolean };
export const getInsights = (range: AnalysisRange, benchmark?: string) => {
  const params = new URLSearchParams({ range });
  if (benchmark) params.set("benchmark", benchmark);
  return api<AiInsights>(`/portfolio/insights?${params}`);
};

export const getBenchmarkHistory = (ticker: string, range: BenchmarkRange) =>
  api<HistoryPoint[]>(
    `/portfolio/benchmark?ticker=${encodeURIComponent(ticker)}&range=${encodeURIComponent(range)}`,
  );

// ─── Holdings / Trading ──────────────────────────────────────────────────────
export const addHolding = (data: z.infer<typeof AddHoldingSchema>) =>
  api<void>("/holdings", { json: data });

export const sellUnits = (ticker: string, data: { units: number; price: number }) =>
  api<void>(`/holdings/${encodeURIComponent(ticker)}/sell`, { json: data });

export const addLot = (data: z.infer<typeof AddLotSchema>) =>
  api<void>("/lots", { json: data });

export const deleteHolding = (ticker: string) =>
  api<void>(`/holdings/${encodeURIComponent(ticker)}`, { method: "DELETE" });

// ─── Market / Fundamentals ───────────────────────────────────────────────────
export type SearchResult = { ticker: string; name: string };
export const searchTicker = (q: string) =>
  api<SearchResult[]>(`/market/search?q=${encodeURIComponent(q)}`);

export type OHLCBar = {
  ts: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};
export const getTickerHistory = (ticker: string, range: HistoryRange) =>
  api<OHLCBar[]>(
    `/market/${encodeURIComponent(ticker)}/history?range=${encodeURIComponent(range)}`,
  );

export const getPriceForDate = (ticker: string, date: string) =>
  api<{ price: number }>(
    `/market/${encodeURIComponent(ticker)}/price?date=${encodeURIComponent(date)}`,
  );

export type NewsItem = { date: string; source: string; title: string; url: string };
export const getTickerNews = (ticker: string) =>
  api<NewsItem[]>(`/market/${encodeURIComponent(ticker)}/news`);

export type EarningsQuarter = {
  label: string;
  revenue?: number;
  eps?: number;
  epsEstimate?: number;
};
export type EarningsData = { nextEarningsDate?: string; quarters: EarningsQuarter[] };
export const getEarnings = (ticker: string) =>
  api<EarningsData>(`/market/${encodeURIComponent(ticker)}/earnings`);

// ─── Cash ───────────────────────────────────────────────────────────────────
export type CashFlow = {
  id: number;
  userId: string;
  type: "deposit" | "withdrawal";
  amountGBP: number;
  note: string;
  date: string;
  createdAt: string;
};
export type CashFlows = { flows: CashFlow[]; cashGBP: number };
export const getCashFlows = () => api<CashFlows>("/cash/flows");
export const addCashFlow = (data: z.infer<typeof AddCashFlowSchema>) =>
  api<void>("/cash/flows", { json: data });
export const deleteCashFlow = (id: number) => api<void>(`/cash/flows/${id}`, { method: "DELETE" });
export const setCashBalance = (amountGBP: number) =>
  api<void>("/cash/balance", { method: "PUT", json: { amountGBP } });

// ─── Transactions ────────────────────────────────────────────────────────────
export type LotRow = {
  id: number;
  ticker: string;
  name: string;
  units: number;
  buyPrice: number;
  dateBought: string;
  costGBP: number;
  lastPrice: number;
  valueGBP: number;
  gainGBP: number;
  gainPct: number;
};
export const getTransactions = () => api<LotRow[]>("/transactions");

export type TradeRow = {
  id: number;
  userId: string;
  type: "buy" | "sell" | "deposit" | "fee";
  ticker: string;
  name: string;
  units: number;
  price: number;
  amountGBP: number;
  date: string;
};
export const getTrades = () => api<TradeRow[]>("/trades");

// ─── Settings ───────────────────────────────────────────────────────────────
export const getSettings = () => api<UserSettings>("/settings");
export const updateSettings = (data: z.infer<typeof UpdateSettingsSchema>) =>
  api<void>("/settings", { method: "PATCH", json: data });

// ─── Public ──────────────────────────────────────────────────────────────────
export const getPublicFeed = (limit = 20) => api<PublicTrade[]>(`/public/feed?limit=${limit}`);
export const getPublicLeaderboard = () => api<LeaderboardEntry[]>("/public/leaderboard");
export const getPublicTicker = () => api<TickerItem[]>("/public/ticker");
export const getPublicProfile = (userId: string) =>
  api<PublicProfile>(`/public/profiles/${encodeURIComponent(userId)}`);

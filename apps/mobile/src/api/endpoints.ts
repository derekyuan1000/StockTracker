import { api } from "./client";
import type { Holding } from "@stocktracker/shared";
import type {
  UserSettings,
  WidgetSummary,
  PublicTrade,
  LeaderboardEntry,
  TickerItem,
} from "@stocktracker/api-contracts";
import type { z } from "zod";
import type { AddCashFlowSchema, UpdateSettingsSchema } from "@stocktracker/api-contracts";

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

// ─── Settings ───────────────────────────────────────────────────────────────
export const getSettings = () => api<UserSettings>("/settings");
export const updateSettings = (data: z.infer<typeof UpdateSettingsSchema>) =>
  api<void>("/settings", { method: "PATCH", json: data });

// ─── Public (unauthenticated) ────────────────────────────────────────────────
export const getPublicFeed = (limit = 20) =>
  api<PublicTrade[]>(`/public/feed?limit=${limit}`);
export const getPublicLeaderboard = () => api<LeaderboardEntry[]>("/public/leaderboard");
export const getPublicTicker = () => api<TickerItem[]>("/public/ticker");

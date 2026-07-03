import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "./client";
import type { Holding } from "@/data/portfolio";
import type {
  PublicTrade,
  LeaderboardEntry,
  TickerItem,
  PublicProfile,
  UserSettings,
} from "@stocktracker/api-contracts";

export const queryKeys = {
  me: ["me"] as const,
  portfolio: ["portfolio"] as const,
  portfolioHistory: (range: string) =>
    ["portfolio", "history", range] as const,
  portfolioBenchmark: (ticker: string, range: string) =>
    ["portfolio", "benchmark", ticker, range] as const,
  transactions: ["transactions"] as const,
  trades: ["trades"] as const,
  cashFlows: ["cash", "flows"] as const,
  priceHistory: (ticker: string, range: string) =>
    ["market", ticker, "history", range] as const,
  news: (ticker: string) => ["market", ticker, "news"] as const,
  earnings: (ticker: string) => ["market", ticker, "earnings"] as const,
  research: ["research"] as const,
  settings: ["settings"] as const,
  publicFeed: ["public", "feed"] as const,
  leaderboard: ["public", "leaderboard"] as const,
  publicProfile: (userId: string) => ["public", "profile", userId] as const,
  publicTicker: ["public", "ticker"] as const,
};

export function usePortfolio() {
  return useQuery({
    queryKey: queryKeys.portfolio,
    queryFn: () =>
      apiFetch<{ holdings: Holding[]; cashGBP: number; realisedGL: number }>(
        "/api/v1/portfolio",
      ),
  });
}

export function usePortfolioHistory(range: string) {
  return useQuery({
    queryKey: queryKeys.portfolioHistory(range),
    queryFn: () =>
      apiFetch<{ ts: number; value: number }[]>(
        `/api/v1/portfolio/history?range=${range}`,
      ),
  });
}

export function usePortfolioBenchmark(ticker: string, range: string) {
  return useQuery({
    queryKey: queryKeys.portfolioBenchmark(ticker, range),
    queryFn: () =>
      apiFetch<{ ts: number; value: number }[]>(
        `/api/v1/portfolio/benchmark?ticker=${ticker}&range=${range}`,
      ),
    enabled: !!ticker,
  });
}

export function useTransactions() {
  return useQuery({
    queryKey: queryKeys.transactions,
    queryFn: () => apiFetch<any[]>("/api/v1/transactions"),
  });
}

export function useTrades() {
  return useQuery({
    queryKey: queryKeys.trades,
    queryFn: () =>
      apiFetch<
        {
          id: number;
          type: string;
          ticker: string;
          name: string;
          units: number;
          price: number;
          amountGBP: number;
          date: string;
        }[]
      >("/api/v1/trades"),
  });
}

export function useCashFlows() {
  return useQuery({
    queryKey: queryKeys.cashFlows,
    queryFn: () =>
      apiFetch<{
        flows: {
          id: number;
          type: string;
          amountGBP: number;
          note: string;
          date: string;
        }[];
        cashGBP: number;
      }>("/api/v1/cash/flows"),
  });
}

export function usePriceHistory(ticker: string, range: string) {
  return useQuery({
    queryKey: queryKeys.priceHistory(ticker, range),
    queryFn: () =>
      apiFetch<{ ts: number; open: number; high: number; low: number; close: number; volume: number }[]>(
        `/api/v1/market/${encodeURIComponent(ticker)}/history?range=${range}`,
      ),
    enabled: !!ticker,
  });
}

export function useTickerNews(ticker: string) {
  return useQuery({
    queryKey: queryKeys.news(ticker),
    queryFn: () =>
      apiFetch<{ title: string; url: string; source: string; publishedAt: string }[]>(
        `/api/v1/market/${encodeURIComponent(ticker)}/news`,
      ),
    enabled: !!ticker,
  });
}

export function useEarnings(ticker: string) {
  return useQuery({
    queryKey: queryKeys.earnings(ticker),
    queryFn: () =>
      apiFetch<{
        actual?: number;
        estimate?: number;
        date?: string;
        surprisePct?: number;
      }>(`/api/v1/market/${encodeURIComponent(ticker)}/earnings`),
    enabled: !!ticker,
  });
}

export function useResearch() {
  return useQuery({
    queryKey: queryKeys.research,
    queryFn: () =>
      apiFetch<
        {
          id: number;
          week: number;
          company: string;
          ticker: string;
          sector: string;
          moat: string;
          roic: number;
          pe: number;
          fcfPositive: boolean;
          lowDebt: boolean;
          thesis: string;
          status: string;
          addedDate: string;
          checklist: boolean[];
        }[]
      >("/api/v1/research"),
  });
}

export function useSettings() {
  return useQuery({
    queryKey: queryKeys.settings,
    queryFn: () => apiFetch<UserSettings>("/api/v1/settings"),
  });
}

export function usePublicFeed() {
  return useQuery({
    queryKey: queryKeys.publicFeed,
    queryFn: () => apiFetch<PublicTrade[]>("/api/v1/public/feed?limit=30"),
    refetchInterval: 120_000,
  });
}

export function useLeaderboard() {
  return useQuery({
    queryKey: queryKeys.leaderboard,
    queryFn: () =>
      apiFetch<LeaderboardEntry[]>("/api/v1/public/leaderboard"),
    refetchInterval: 300_000,
  });
}

export function usePublicProfile(userId: string) {
  return useQuery({
    queryKey: queryKeys.publicProfile(userId),
    queryFn: () =>
      apiFetch<PublicProfile | null>(`/api/v1/public/profiles/${userId}`),
    enabled: !!userId,
  });
}

export function usePublicTicker() {
  return useQuery({
    queryKey: queryKeys.publicTicker,
    queryFn: () => apiFetch<TickerItem[]>("/api/v1/public/ticker"),
    refetchInterval: 60_000,
  });
}

export function useMe() {
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: () =>
      apiFetch<{
        user: { id: string; name: string; email: string; image?: string };
      }>("/api/v1/me"),
    retry: false,
  });
}

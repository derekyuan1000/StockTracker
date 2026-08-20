import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as endpoints from "./endpoints";
import type { HistoryRange, AnalysisRange } from "./endpoints";
import type { AddCashFlowSchema, UpdateSettingsSchema, AddHoldingSchema, AddLotSchema } from "@stocktracker/api-contracts";
import type { z } from "zod";

export const qk = {
  me: ["me"] as const,
  portfolio: ["portfolio"] as const,
  portfolioHistory: (range: HistoryRange) => ["portfolio-history", range] as const,
  portfolioReturns: ["portfolio-returns"] as const,
  widgetSummary: ["widget-summary"] as const,
  cashFlows: ["cash-flows"] as const,
  settings: ["settings"] as const,
  analysis: (range: AnalysisRange, benchmark?: string) =>
    ["analysis", range, benchmark ?? null] as const,
  insights: (range: AnalysisRange, benchmark?: string) =>
    ["insights", range, benchmark ?? null] as const,
  tickerHistory: (ticker: string, range: HistoryRange) =>
    ["ticker-history", ticker, range] as const,
  tickerNews: (ticker: string) => ["ticker-news", ticker] as const,
  earnings: (ticker: string) => ["earnings", ticker] as const,
  transactions: ["transactions"] as const,
  trades: ["trades"] as const,
  publicFeed: (limit: number) => ["public-feed", limit] as const,
  publicLeaderboard: ["public-leaderboard"] as const,
  publicProfile: (userId: string) => ["public-profile", userId] as const,
};

export function useMe(enabled = true) {
  return useQuery({ queryKey: qk.me, queryFn: endpoints.getMe, enabled });
}

export function usePortfolio() {
  return useQuery({ queryKey: qk.portfolio, queryFn: endpoints.getPortfolio });
}

export function usePortfolioHistory(range: HistoryRange) {
  return useQuery({
    queryKey: qk.portfolioHistory(range),
    queryFn: () => endpoints.getPortfolioHistory(range),
  });
}

export function usePortfolioReturns() {
  return useQuery({ queryKey: qk.portfolioReturns, queryFn: endpoints.getPortfolioReturns });
}

export function useAnalysis(range: AnalysisRange, benchmark?: string) {
  return useQuery({
    queryKey: qk.analysis(range, benchmark),
    queryFn: () => endpoints.getAnalysis(range, benchmark),
  });
}

export function useInsights(range: AnalysisRange, benchmark?: string) {
  return useQuery({
    queryKey: qk.insights(range, benchmark),
    queryFn: () => endpoints.getInsights(range, benchmark),
    staleTime: 5 * 60 * 1000,
  });
}

export function useTickerHistory(ticker: string, range: HistoryRange) {
  return useQuery({
    queryKey: qk.tickerHistory(ticker, range),
    queryFn: () => endpoints.getTickerHistory(ticker, range),
    enabled: !!ticker,
  });
}

export function useTickerNews(ticker: string) {
  return useQuery({
    queryKey: qk.tickerNews(ticker),
    queryFn: () => endpoints.getTickerNews(ticker),
    enabled: !!ticker,
  });
}

export function useEarnings(ticker: string) {
  return useQuery({
    queryKey: qk.earnings(ticker),
    queryFn: () => endpoints.getEarnings(ticker),
    enabled: !!ticker,
  });
}

export function useTransactions() {
  return useQuery({ queryKey: qk.transactions, queryFn: endpoints.getTransactions });
}

export function useTrades() {
  return useQuery({ queryKey: qk.trades, queryFn: endpoints.getTrades });
}

export function useCashFlows() {
  return useQuery({ queryKey: qk.cashFlows, queryFn: endpoints.getCashFlows });
}

export function useAddCashFlow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: z.infer<typeof AddCashFlowSchema>) => endpoints.addCashFlow(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.cashFlows }),
  });
}

export function useDeleteCashFlow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => endpoints.deleteCashFlow(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.cashFlows }),
  });
}

export function useSetCashBalance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (amountGBP: number) => endpoints.setCashBalance(amountGBP),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.cashFlows }),
  });
}

export function useAddHolding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: z.infer<typeof AddHoldingSchema>) => endpoints.addHolding(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.portfolio });
      qc.invalidateQueries({ queryKey: qk.transactions });
    },
  });
}

export function useSellUnits() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ticker, data }: { ticker: string; data: { units: number; price: number } }) =>
      endpoints.sellUnits(ticker, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.portfolio });
      qc.invalidateQueries({ queryKey: qk.transactions });
    },
  });
}

export function useAddLot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: z.infer<typeof AddLotSchema>) => endpoints.addLot(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.portfolio });
      qc.invalidateQueries({ queryKey: qk.transactions });
    },
  });
}

export function useDeleteHolding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ticker: string) => endpoints.deleteHolding(ticker),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.portfolio });
      qc.invalidateQueries({ queryKey: qk.transactions });
    },
  });
}

export function useSettings(enabled = true) {
  return useQuery({ queryKey: qk.settings, queryFn: endpoints.getSettings, enabled });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: z.infer<typeof UpdateSettingsSchema>) => endpoints.updateSettings(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.settings }),
  });
}

export function usePublicFeed(limit = 20) {
  return useQuery({ queryKey: qk.publicFeed(limit), queryFn: () => endpoints.getPublicFeed(limit) });
}

export function usePublicLeaderboard() {
  return useQuery({ queryKey: qk.publicLeaderboard, queryFn: endpoints.getPublicLeaderboard });
}

export function usePublicProfile(userId: string) {
  return useQuery({
    queryKey: qk.publicProfile(userId),
    queryFn: () => endpoints.getPublicProfile(userId),
    enabled: !!userId,
  });
}

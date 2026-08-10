import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as endpoints from "./endpoints";
import type { HistoryRange } from "./endpoints";
import type { AddCashFlowSchema, UpdateSettingsSchema } from "@stocktracker/api-contracts";
import type { z } from "zod";

export const qk = {
  me: ["me"] as const,
  portfolio: ["portfolio"] as const,
  portfolioHistory: (range: HistoryRange) => ["portfolio-history", range] as const,
  widgetSummary: ["widget-summary"] as const,
  cashFlows: ["cash-flows"] as const,
  settings: ["settings"] as const,
  publicFeed: (limit: number) => ["public-feed", limit] as const,
  publicLeaderboard: ["public-leaderboard"] as const,
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

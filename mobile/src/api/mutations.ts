import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./client";
import { queryKeys } from "./queries";
import type { z } from "zod";
import type {
  AddHoldingSchema,
  AddLotSchema,
  AddCashFlowSchema,
  AddTradeSchema,
  PickSchema,
  UpdateSettingsSchema,
} from "@stocktracker/api-contracts";

export function useAddHolding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: z.infer<typeof AddHoldingSchema>) =>
      apiFetch("/api/v1/holdings", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.portfolio }),
  });
}

export function useDeleteHolding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ticker: string) =>
      apiFetch(`/api/v1/holdings/${encodeURIComponent(ticker)}`, {
        method: "DELETE",
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.portfolio }),
  });
}

export function useSellUnits() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      ticker,
      units,
      price,
    }: {
      ticker: string;
      units: number;
      price: number;
    }) =>
      apiFetch(`/api/v1/holdings/${encodeURIComponent(ticker)}/sell`, {
        method: "POST",
        body: JSON.stringify({ units, price }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.portfolio }),
  });
}

export function useSaveNotes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      ticker,
      thesis,
      bearCase,
    }: {
      ticker: string;
      thesis: string;
      bearCase: string;
    }) =>
      apiFetch(`/api/v1/holdings/${encodeURIComponent(ticker)}/notes`, {
        method: "PUT",
        body: JSON.stringify({ thesis, bearCase }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.portfolio }),
  });
}

export function useAddLot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: z.infer<typeof AddLotSchema>) =>
      apiFetch("/api/v1/lots", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.portfolio }),
  });
}

export function useUpdateLot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...rest
    }: {
      id: number;
      units: number;
      price: number;
      date: string;
    }) =>
      apiFetch(`/api/v1/lots/${id}`, {
        method: "PUT",
        body: JSON.stringify(rest),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.portfolio }),
  });
}

export function useDeleteLot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/api/v1/lots/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.portfolio }),
  });
}

export function useAddCashFlow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: z.infer<typeof AddCashFlowSchema>) =>
      apiFetch("/api/v1/cash/flows", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.cashFlows });
      qc.invalidateQueries({ queryKey: queryKeys.portfolio });
    },
  });
}

export function useDeleteCashFlow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/api/v1/cash/flows/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.cashFlows });
      qc.invalidateQueries({ queryKey: queryKeys.portfolio });
    },
  });
}

export function useAddTrade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: z.infer<typeof AddTradeSchema>) =>
      apiFetch("/api/v1/trades", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.trades }),
  });
}

export function useDeleteTrade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/api/v1/trades/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.trades }),
  });
}

export function useUpsertResearchPick() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: z.infer<typeof PickSchema>) =>
      apiFetch("/api/v1/research", {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.research }),
  });
}

export function useSetChecklist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      checklist,
    }: {
      id: number;
      checklist: boolean[];
    }) =>
      apiFetch(`/api/v1/research/${id}/checklist`, {
        method: "PUT",
        body: JSON.stringify({ checklist }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.research }),
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: z.infer<typeof UpdateSettingsSchema>) =>
      apiFetch("/api/v1/settings", {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.settings }),
  });
}

export function useRegisterDevice() {
  return useMutation({
    mutationFn: ({
      expoPushToken,
      platform,
    }: {
      expoPushToken: string;
      platform: "ios" | "android";
    }) =>
      apiFetch("/api/v1/devices", {
        method: "POST",
        body: JSON.stringify({ expoPushToken, platform }),
      }),
  });
}

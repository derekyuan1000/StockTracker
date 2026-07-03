import type { RouteEntry } from "../router";
import * as cash from "@/server/services/cash";
import { AddCashFlowSchema } from "@stocktracker/api-contracts";
import { z } from "zod";

export const cashRoutes: RouteEntry[] = [
  {
    method: "GET",
    pattern: "/api/v1/cash/flows",
    requireAuth: true,
    handler: async ({ userId }) => cash.getCashFlows(userId!),
  },
  {
    method: "POST",
    pattern: "/api/v1/cash/flows",
    requireAuth: true,
    handler: async ({ request, userId }) => {
      const body = AddCashFlowSchema.parse(await request.json());
      await cash.addCashFlow(userId!, body);
      return { ok: true };
    },
  },
  {
    method: "DELETE",
    pattern: "/api/v1/cash/flows/:id",
    requireAuth: true,
    handler: async ({ params, userId }) => {
      await cash.deleteCashFlow(userId!, Number(params.id));
      return { ok: true };
    },
  },
  {
    method: "POST",
    pattern: "/api/v1/cash/adjust",
    requireAuth: true,
    handler: async ({ request, userId }) => {
      const { delta } = z.object({ delta: z.number() }).parse(await request.json());
      await cash.updateCash(userId!, delta);
      return { ok: true };
    },
  },
  {
    method: "PUT",
    pattern: "/api/v1/cash/balance",
    requireAuth: true,
    handler: async ({ request, userId }) => {
      const { amountGBP } = z.object({ amountGBP: z.number() }).parse(await request.json());
      await cash.setCashBalance(userId!, amountGBP);
      return { ok: true };
    },
  },
];

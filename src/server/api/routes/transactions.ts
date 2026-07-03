import type { RouteEntry } from "../router";
import * as txns from "@/server/services/transactions";
import { AddTradeSchema } from "@stocktracker/api-contracts";

export const transactionsRoutes: RouteEntry[] = [
  {
    method: "GET",
    pattern: "/api/v1/transactions",
    requireAuth: true,
    handler: async ({ userId }) => txns.getTransactions(userId!),
  },
  {
    method: "GET",
    pattern: "/api/v1/trades",
    requireAuth: true,
    handler: async ({ userId }) => txns.getTrades(userId!),
  },
  {
    method: "POST",
    pattern: "/api/v1/trades",
    requireAuth: true,
    handler: async ({ request, userId }) => {
      const body = AddTradeSchema.parse(await request.json());
      await txns.addTrade(userId!, body);
      return { ok: true };
    },
  },
  {
    method: "DELETE",
    pattern: "/api/v1/trades/:id",
    requireAuth: true,
    handler: async ({ params, userId }) => {
      await txns.deleteTrade(userId!, Number(params.id));
      return { ok: true };
    },
  },
];

import type { RouteEntry } from "../router";
import * as holdings from "@/server/services/holdings";
import * as portfolio from "@/server/services/portfolio";
import {
  AddHoldingSchema,
  SaveNotesSchema,
  SellUnitsSchema,
  AddLotSchema,
  UpdateLotSchema,
} from "@stocktracker/api-contracts";

export const holdingsRoutes: RouteEntry[] = [
  {
    method: "POST",
    pattern: "/api/v1/holdings",
    requireAuth: true,
    handler: async ({ request, userId }) => {
      const body = AddHoldingSchema.parse(await request.json());
      return holdings.addHolding(userId!, body);
    },
  },
  {
    method: "DELETE",
    pattern: "/api/v1/holdings/:ticker",
    requireAuth: true,
    handler: async ({ params, userId }) => {
      await holdings.deleteHolding(userId!, params.ticker);
      return { ok: true };
    },
  },
  {
    method: "PUT",
    pattern: "/api/v1/holdings/:ticker/notes",
    requireAuth: true,
    handler: async ({ request, params, userId }) => {
      const body = (await request.json()) as { thesis: string; bearCase: string };
      await portfolio.saveNotes(userId!, { ticker: params.ticker, ...body });
      return { ok: true };
    },
  },
  {
    method: "POST",
    pattern: "/api/v1/holdings/:ticker/sell",
    requireAuth: true,
    handler: async ({ request, params, userId }) => {
      const body = SellUnitsSchema.parse({ ticker: params.ticker, ...(await request.json()) });
      return holdings.sellUnits(userId!, body);
    },
  },
  {
    method: "POST",
    pattern: "/api/v1/lots",
    requireAuth: true,
    handler: async ({ request, userId }) => {
      const body = AddLotSchema.parse(await request.json());
      await holdings.addLot(userId!, body);
      return { ok: true };
    },
  },
  {
    method: "PUT",
    pattern: "/api/v1/lots/:id",
    requireAuth: true,
    handler: async ({ request, params, userId }) => {
      const body = UpdateLotSchema.parse({ id: Number(params.id), ...(await request.json()) });
      await holdings.updateLot(userId!, body);
      return { ok: true };
    },
  },
  {
    method: "DELETE",
    pattern: "/api/v1/lots/:id",
    requireAuth: true,
    handler: async ({ params, userId }) => {
      await holdings.deleteLot(userId!, Number(params.id));
      return { ok: true };
    },
  },
];

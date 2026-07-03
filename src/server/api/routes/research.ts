import type { RouteEntry } from "../router";
import * as research from "@/server/services/research";
import { PickSchema } from "@stocktracker/api-contracts";
import { z } from "zod";

export const researchRoutes: RouteEntry[] = [
  {
    method: "GET",
    pattern: "/api/v1/research",
    requireAuth: true,
    handler: async ({ userId }) => research.listResearchPicks(userId!),
  },
  {
    method: "PUT",
    pattern: "/api/v1/research",
    requireAuth: true,
    handler: async ({ request, userId }) => {
      const body = PickSchema.parse(await request.json());
      await research.upsertResearchPick(userId!, body);
      return { ok: true };
    },
  },
  {
    method: "PUT",
    pattern: "/api/v1/research/:id/checklist",
    requireAuth: true,
    handler: async ({ request, params, userId }) => {
      const { checklist } = z
        .object({ checklist: z.array(z.boolean()) })
        .parse(await request.json());
      await research.setChecklist(userId!, Number(params.id), checklist);
      return { ok: true };
    },
  },
];

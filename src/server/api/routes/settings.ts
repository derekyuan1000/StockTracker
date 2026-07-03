import type { RouteEntry } from "../router";
import * as settings from "@/server/services/settings";
import { UpdateSettingsSchema } from "@stocktracker/api-contracts";

export const settingsRoutes: RouteEntry[] = [
  {
    method: "GET",
    pattern: "/api/v1/settings",
    requireAuth: true,
    handler: async ({ userId }) => settings.getSettings(userId!),
  },
  {
    method: "PATCH",
    pattern: "/api/v1/settings",
    requireAuth: true,
    handler: async ({ request, userId }) => {
      const body = UpdateSettingsSchema.parse(await request.json());
      await settings.updateSettings(userId!, body);
      return { ok: true };
    },
  },
];

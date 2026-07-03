import type { RouteEntry } from "../router";
import * as devices from "@/server/services/devices";
import { RegisterDeviceSchema } from "@stocktracker/api-contracts";

export const devicesRoutes: RouteEntry[] = [
  {
    method: "POST",
    pattern: "/api/v1/devices",
    requireAuth: true,
    handler: async ({ request, userId }) => {
      const { expoPushToken, platform } = RegisterDeviceSchema.parse(await request.json());
      await devices.registerDevice(userId!, expoPushToken, platform);
      return { ok: true };
    },
  },
  {
    method: "DELETE",
    pattern: "/api/v1/devices/:token",
    requireAuth: true,
    handler: async ({ params, userId }) => {
      await devices.unregisterDevice(userId!, params.token);
      return { ok: true };
    },
  },
];

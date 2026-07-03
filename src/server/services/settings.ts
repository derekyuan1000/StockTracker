import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { userSettings } from "@/server/db/schema";
import type { z } from "zod";
import type { UpdateSettingsSchema } from "@stocktracker/api-contracts";

export type UserSettings = {
  portfolioPublic: boolean;
  theme: "dark" | "light" | "system";
  onboarded: boolean;
};

export const DEFAULT_SETTINGS: UserSettings = {
  portfolioPublic: false,
  theme: "dark",
  onboarded: false,
};

// ─── getSettings ─────────────────────────────────────────────────────────────

export async function getSettings(userId: string): Promise<UserSettings> {
  await db
    .insert(userSettings)
    .values({ userId, ...DEFAULT_SETTINGS })
    .onConflictDoNothing();

  const [row] = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);

  if (!row) return DEFAULT_SETTINGS;
  return {
    portfolioPublic: Boolean(row.portfolioPublic),
    theme: row.theme as UserSettings["theme"],
    onboarded: Boolean(row.onboarded),
  };
}

// ─── updateSettings ───────────────────────────────────────────────────────────

export async function updateSettings(userId: string, data: z.infer<typeof UpdateSettingsSchema>) {
  await db
    .insert(userSettings)
    .values({ userId, ...DEFAULT_SETTINGS, ...data, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: { ...data, updatedAt: new Date() },
    });
}

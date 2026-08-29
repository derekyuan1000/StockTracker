import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { userSettings } from "@/server/db/schema";
import { getFxRate } from "@/server/market/fx";
import type { z } from "zod";
import type { UpdateSettingsSchema } from "@stocktracker/api-contracts";

export type UserSettings = {
  portfolioPublic: boolean;
  theme: "dark" | "light" | "system";
  onboarded: boolean;
  displayCurrency: string;
  /** Derived GBP→displayCurrency factor; present on reads, not persisted. */
  gbpToDisplay?: number;
};

export const DEFAULT_SETTINGS: UserSettings = {
  portfolioPublic: false,
  theme: "dark",
  onboarded: false,
  displayCurrency: "GBP",
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

  const displayCurrency = row?.displayCurrency ?? DEFAULT_SETTINGS.displayCurrency;
  // GBP→display factor is the inverse of the native→GBP rate. GBP itself is 1.
  const nativeToGBP = await getFxRate(displayCurrency);
  const gbpToDisplay = nativeToGBP > 0 ? 1 / nativeToGBP : 1;

  if (!row) return { ...DEFAULT_SETTINGS, displayCurrency, gbpToDisplay };
  return {
    portfolioPublic: Boolean(row.portfolioPublic),
    theme: row.theme as UserSettings["theme"],
    onboarded: Boolean(row.onboarded),
    displayCurrency,
    gbpToDisplay,
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

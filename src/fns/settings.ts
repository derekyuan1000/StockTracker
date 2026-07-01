import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db/client";
import { userSettings } from "@/server/db/schema";
import { authMiddleware } from "@/fns/_middleware";

export type UserSettings = {
  portfolioPublic: boolean;
  theme: "dark" | "light" | "system";
  onboarded: boolean;
};

const DEFAULT_SETTINGS: UserSettings = {
  portfolioPublic: false,
  theme: "dark",
  onboarded: false,
};

// Ensure a settings row exists for the user (upsert on first call).
export const getSettings = createServerFn()
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<UserSettings> => {
    const { userId } = context;
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
  });

export const updateSettings = createServerFn()
  .middleware([authMiddleware])
  .validator((raw: unknown) =>
    z
      .object({
        portfolioPublic: z.boolean().optional(),
        theme: z.enum(["dark", "light", "system"]).optional(),
        onboarded: z.boolean().optional(),
      })
      .parse(raw),
  )
  .handler(async ({ context, data }) => {
    const { userId } = context;
    await db
      .insert(userSettings)
      .values({ userId, ...DEFAULT_SETTINGS, ...data, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: userSettings.userId,
        set: { ...data, updatedAt: new Date() },
      });
    return { ok: true };
  });

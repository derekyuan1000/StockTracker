import { eq, and } from "drizzle-orm";
import { db } from "@/server/db/client";
import { pushTokens } from "@/server/db/schema";

export async function registerDevice(
  userId: string,
  expoPushToken: string,
  platform: "ios" | "android",
) {
  await db
    .insert(pushTokens)
    .values({ token: expoPushToken, userId, platform, lastSeenAt: new Date() })
    .onConflictDoUpdate({
      target: pushTokens.token,
      set: { userId, lastSeenAt: new Date() },
    });
}

export async function unregisterDevice(userId: string, token: string) {
  await db
    .delete(pushTokens)
    .where(and(eq(pushTokens.token, token), eq(pushTokens.userId, userId)));
}

export async function getDeviceTokensForUser(userId: string) {
  return db
    .select({ token: pushTokens.token })
    .from(pushTokens)
    .where(eq(pushTokens.userId, userId));
}

export async function getAllTokens() {
  return db.select().from(pushTokens);
}

export async function deleteToken(token: string) {
  await db.delete(pushTokens).where(eq(pushTokens.token, token));
}

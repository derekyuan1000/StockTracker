import { deleteToken } from "@/server/services/devices";

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

interface PushReceipt {
  status: "ok" | "error";
  message?: string;
  details?: { error?: string };
}

export async function sendPushNotifications(messages: PushMessage[]): Promise<void> {
  if (messages.length === 0) return;

  const chunks: PushMessage[][] = [];
  for (let i = 0; i < messages.length; i += 100) {
    chunks.push(messages.slice(i, i + 100));
  }

  for (const chunk of chunks) {
    try {
      const res = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
        },
        body: JSON.stringify(chunk),
      });

      if (!res.ok) continue;

      const json = (await res.json()) as { data: PushReceipt[] };
      const receipts = json.data ?? [];

      for (let i = 0; i < receipts.length; i++) {
        const receipt = receipts[i];
        if (receipt.status === "error" && receipt.details?.error === "DeviceNotRegistered") {
          const token = chunk[i]?.to;
          if (token) await deleteToken(token).catch(() => {});
        }
      }
    } catch {
      // Network failure — skip this chunk
    }
  }
}

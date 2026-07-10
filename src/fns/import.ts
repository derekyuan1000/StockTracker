import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/fns/_middleware";
import { previewImport, confirmImport, type ImportRow } from "@/server/services/import";

export const previewCSVImport = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((raw: unknown) => z.object({ csvText: z.string().min(1) }).parse(raw))
  .handler(async ({ data, context }) => previewImport(context.userId, data.csvText));

const ImportRowSchema = z.object({
  ticker: z.string(),
  name: z.string(),
  units: z.number(),
  price: z.number(),
  date: z.string(),
  type: z.enum(["buy", "sell"]),
  currency: z.enum(["GBp", "GBP"]),
  warning: z.string().optional(),
});

export const confirmCSVImport = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((raw: unknown) => z.object({ rows: z.array(ImportRowSchema) }).parse(raw))
  .handler(async ({ data, context }) => confirmImport(context.userId, data.rows as ImportRow[]));

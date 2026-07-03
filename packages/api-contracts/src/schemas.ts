import { z } from "zod";

export const AddHoldingSchema = z.object({
  ticker: z.string().min(1).max(20).transform((s) => s.toUpperCase()),
  units: z.number().positive(),
  dateBought: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  price: z.number().positive().optional(),
  bucket: z.enum(["Fund", "Stock"] as const).default("Stock"),
  allocTarget: z.number().min(0).max(100).default(0),
  deductCash: z.boolean().default(false),
});

export const AddLotSchema = z.object({
  ticker: z.string().min(1).max(20),
  units: z.number().positive(),
  price: z.number().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const UpdateLotSchema = z.object({
  id: z.number(),
  units: z.number().positive(),
  price: z.number().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const SellUnitsSchema = z.object({
  ticker: z.string().min(1).max(20),
  units: z.number().positive(),
  price: z.number().positive(),
});

export const SaveNotesSchema = z.object({
  ticker: z.string().min(1).max(20),
  thesis: z.string().max(5000),
  bearCase: z.string().max(5000),
});

export const AddCashFlowSchema = z.object({
  type: z.enum(["deposit", "withdrawal"]),
  amountGBP: z.number().positive(),
  note: z.string().max(200).default(""),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const AddTradeSchema = z.object({
  type: z.enum(["buy", "sell", "deposit", "fee"]),
  ticker: z.string().max(20).default(""),
  name: z.string().max(200).default(""),
  units: z.number().default(0),
  price: z.number().default(0),
  amountGBP: z.number(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const PickSchema = z.object({
  id: z.number().optional(),
  week: z.number().int().positive(),
  company: z.string().min(1),
  ticker: z.string().min(1).transform((s) => s.toUpperCase()),
  sector: z.string().default(""),
  moat: z.string().default(""),
  roic: z.number().default(0),
  pe: z.number().default(0),
  fcfPositive: z.boolean().default(false),
  lowDebt: z.boolean().default(false),
  thesis: z.string().default(""),
  status: z.string().default("watchlist"),
  addedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const UpdateSettingsSchema = z.object({
  portfolioPublic: z.boolean().optional(),
  theme: z.enum(["dark", "light", "system"]).optional(),
  onboarded: z.boolean().optional(),
});

export const HistoryRangeSchema = z.enum(["1D", "5D", "15D", "1M", "6M", "YTD", "1Y", "5Y", "All"]);
export const BenchmarkRangeSchema = z.enum(["1D", "5D", "1M", "6M", "YTD", "1Y", "5Y", "All"]);

export const RegisterDeviceSchema = z.object({
  expoPushToken: z.string().min(1),
  platform: z.enum(["ios", "android"]),
});

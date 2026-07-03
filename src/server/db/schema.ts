import { sql } from "drizzle-orm";
import {
  foreignKey,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

// better-auth tables (user, session, account, verification)
export * from "./auth-schema";

export const holdings = sqliteTable(
  "holdings",
  {
    userId: text("user_id").notNull(),
    ticker: text("ticker").notNull(),
    name: text("name").notNull(),
    bucket: text("bucket", { enum: ["Fund", "Stock"] }).notNull(),
    sector: text("sector").notNull().default(""),
    currency: text("currency", { enum: ["GBp", "GBP"] })
      .notNull()
      .default("GBp"),
    allocTarget: real("alloc_target").notNull().default(0),
    thesis: text("thesis").notNull().default(""),
    bearCase: text("bear_case").notNull().default(""),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [primaryKey({ columns: [t.userId, t.ticker] })],
);

// One row per purchase lot; avgBuyP = weighted avg across lots for a ticker
export const lots = sqliteTable(
  "lots",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id").notNull(),
    ticker: text("ticker").notNull(),
    units: real("units").notNull(),
    buyPrice: real("buy_price").notNull(), // pence
    dateBought: text("date_bought").notNull(), // YYYY-MM-DD
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    foreignKey({
      columns: [t.userId, t.ticker],
      foreignColumns: [holdings.userId, holdings.ticker],
      name: "lots_holdings_user_ticker_fk",
    }).onDelete("cascade"),
  ],
);

export const researchPicks = sqliteTable("research_picks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull(),
  week: integer("week").notNull(),
  company: text("company").notNull(),
  ticker: text("ticker").notNull(),
  sector: text("sector").notNull().default(""),
  moat: text("moat").notNull().default(""),
  roic: real("roic").notNull().default(0),
  pe: real("pe").notNull().default(0),
  fcfPositive: integer("fcf_positive", { mode: "boolean" }).notNull().default(false),
  lowDebt: integer("low_debt", { mode: "boolean" }).notNull().default(false),
  thesis: text("thesis").notNull().default(""),
  status: text("status").notNull().default("watchlist"),
  addedDate: text("added_date").notNull(),
  checklist: text("checklist", { mode: "json" })
    .$type<boolean[]>()
    .notNull()
    .default(sql`'[]'`),
});

// One row per user for portfolio-level scalars. Keyed by userId (unique index);
// `id` is the SQLite rowid and is auto-assigned for new rows.
export const portfolioMeta = sqliteTable(
  "portfolio_meta",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id").notNull(),
    cashGBP: real("cash_gbp").notNull().default(0),
    realisedGL: real("realised_gl").notNull().default(0),
  },
  (t) => [uniqueIndex("portfolio_meta_user_id_unique").on(t.userId)],
);

// Individual cash deposits and withdrawals
export const cashFlows = sqliteTable("cash_flows", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull(),
  type: text("type", { enum: ["deposit", "withdrawal"] }).notNull(),
  amountGBP: real("amount_gbp").notNull(),
  note: text("note").notNull().default(""),
  date: text("date").notNull(), // YYYY-MM-DD
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// All historical transactions (BUY/SELL/DEPOSIT/FEE) recorded at import time or on manual add
export const trades = sqliteTable("trades", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull(),
  type: text("type", { enum: ["buy", "sell", "deposit", "fee"] }).notNull(),
  ticker: text("ticker").notNull().default(""),
  name: text("name").notNull().default(""),
  units: real("units").notNull().default(0),
  price: real("price").notNull().default(0),
  amountGBP: real("amount_gbp").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Per-user settings: public/private toggle, theme preference, onboarding flag
export const userSettings = sqliteTable("user_settings", {
  userId: text("user_id").primaryKey(),
  portfolioPublic: integer("portfolio_public", { mode: "boolean" }).notNull().default(false),
  theme: text("theme", { enum: ["dark", "light", "system"] })
    .notNull()
    .default("dark"),
  onboarded: integer("onboarded", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Per-ticker, per-kind cache so Yahoo isn't hit on every request (global, shared)
export const quoteCache = sqliteTable(
  "quote_cache",
  {
    ticker: text("ticker").notNull(),
    kind: text("kind", {
      enum: ["quote", "history", "fundamentals", "news", "earnings"],
    }).notNull(),
    payload: text("payload", { mode: "json" }).notNull(),
    fetchedAt: integer("fetched_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [primaryKey({ columns: [t.ticker, t.kind] })],
);

// Expo push notification tokens for mobile clients
export const pushTokens = sqliteTable("push_tokens", {
  token: text("token").primaryKey(),
  userId: text("user_id").notNull(),
  platform: text("platform", { enum: ["ios", "android"] }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  lastSeenAt: integer("last_seen_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

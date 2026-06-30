PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_lots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`ticker` text NOT NULL,
	`units` real NOT NULL,
	`buy_price` real NOT NULL,
	`date_bought` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`,`ticker`) REFERENCES `holdings`(`user_id`,`ticker`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_lots`("id", "user_id", "ticker", "units", "buy_price", "date_bought", "created_at") SELECT "id", "user_id", "ticker", "units", "buy_price", "date_bought", "created_at" FROM `lots`;--> statement-breakpoint
DROP TABLE `lots`;--> statement-breakpoint
ALTER TABLE `__new_lots` RENAME TO `lots`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
DROP INDEX "portfolio_meta_user_id_unique";--> statement-breakpoint
DROP INDEX "session_token_unique";--> statement-breakpoint
DROP INDEX "user_email_unique";--> statement-breakpoint
ALTER TABLE `cash_flows` ALTER COLUMN "user_id" TO "user_id" text NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `portfolio_meta_user_id_unique` ON `portfolio_meta` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `__new_holdings` (
	`user_id` text NOT NULL,
	`ticker` text NOT NULL,
	`name` text NOT NULL,
	`bucket` text NOT NULL,
	`sector` text DEFAULT '' NOT NULL,
	`currency` text DEFAULT 'GBp' NOT NULL,
	`alloc_target` real DEFAULT 0 NOT NULL,
	`thesis` text DEFAULT '' NOT NULL,
	`bear_case` text DEFAULT '' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	PRIMARY KEY(`user_id`, `ticker`)
);
--> statement-breakpoint
INSERT INTO `__new_holdings`("user_id", "ticker", "name", "bucket", "sector", "currency", "alloc_target", "thesis", "bear_case", "created_at") SELECT "user_id", "ticker", "name", "bucket", "sector", "currency", "alloc_target", "thesis", "bear_case", "created_at" FROM `holdings`;--> statement-breakpoint
DROP TABLE `holdings`;--> statement-breakpoint
ALTER TABLE `__new_holdings` RENAME TO `holdings`;--> statement-breakpoint
CREATE TABLE `__new_portfolio_meta` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`cash_gbp` real DEFAULT 0 NOT NULL,
	`realised_gl` real DEFAULT 0 NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_portfolio_meta`("id", "user_id", "cash_gbp", "realised_gl") SELECT "id", "user_id", "cash_gbp", "realised_gl" FROM `portfolio_meta`;--> statement-breakpoint
DROP TABLE `portfolio_meta`;--> statement-breakpoint
ALTER TABLE `__new_portfolio_meta` RENAME TO `portfolio_meta`;--> statement-breakpoint
ALTER TABLE `research_picks` ALTER COLUMN "user_id" TO "user_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE `trades` ALTER COLUMN "user_id" TO "user_id" text NOT NULL;
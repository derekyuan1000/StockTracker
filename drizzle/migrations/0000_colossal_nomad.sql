CREATE TABLE `holdings` (
	`ticker` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`bucket` text NOT NULL,
	`sector` text DEFAULT '' NOT NULL,
	`currency` text DEFAULT 'GBp' NOT NULL,
	`alloc_target` real DEFAULT 0 NOT NULL,
	`thesis` text DEFAULT '' NOT NULL,
	`bear_case` text DEFAULT '' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `lots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ticker` text NOT NULL,
	`units` real NOT NULL,
	`buy_price` real NOT NULL,
	`date_bought` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`ticker`) REFERENCES `holdings`(`ticker`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `portfolio_meta` (
	`id` integer PRIMARY KEY NOT NULL,
	`cash_gbp` real DEFAULT 0 NOT NULL,
	`realised_gl` real DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `quote_cache` (
	`ticker` text NOT NULL,
	`kind` text NOT NULL,
	`payload` text NOT NULL,
	`fetched_at` integer DEFAULT (unixepoch()) NOT NULL,
	PRIMARY KEY(`ticker`, `kind`)
);
--> statement-breakpoint
CREATE TABLE `research_picks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`week` integer NOT NULL,
	`company` text NOT NULL,
	`ticker` text NOT NULL,
	`sector` text DEFAULT '' NOT NULL,
	`moat` text DEFAULT '' NOT NULL,
	`roic` real DEFAULT 0 NOT NULL,
	`pe` real DEFAULT 0 NOT NULL,
	`fcf_positive` integer DEFAULT false NOT NULL,
	`low_debt` integer DEFAULT false NOT NULL,
	`thesis` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'watchlist' NOT NULL,
	`added_date` text NOT NULL,
	`checklist` text DEFAULT '[]' NOT NULL
);

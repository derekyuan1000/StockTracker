CREATE TABLE `trades` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`ticker` text DEFAULT '' NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`units` real DEFAULT 0 NOT NULL,
	`price` real DEFAULT 0 NOT NULL,
	`amount_gbp` real NOT NULL,
	`date` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);

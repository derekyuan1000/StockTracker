CREATE TABLE `cash_flows` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`amount_gbp` real NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`date` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);

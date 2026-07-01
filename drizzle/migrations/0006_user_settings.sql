CREATE TABLE `user_settings` (
	`user_id` text PRIMARY KEY NOT NULL,
	`portfolio_public` integer NOT NULL DEFAULT 0,
	`theme` text NOT NULL DEFAULT 'dark',
	`onboarded` integer NOT NULL DEFAULT 0,
	`created_at` integer NOT NULL DEFAULT (unixepoch()),
	`updated_at` integer NOT NULL DEFAULT (unixepoch())
);

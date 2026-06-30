ALTER TABLE `cash_flows` ADD `user_id` text;--> statement-breakpoint
ALTER TABLE `holdings` ADD `user_id` text;--> statement-breakpoint
ALTER TABLE `lots` ADD `user_id` text;--> statement-breakpoint
ALTER TABLE `portfolio_meta` ADD `user_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `portfolio_meta_user_id_unique` ON `portfolio_meta` (`user_id`);--> statement-breakpoint
ALTER TABLE `research_picks` ADD `user_id` text;--> statement-breakpoint
ALTER TABLE `trades` ADD `user_id` text;
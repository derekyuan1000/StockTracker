CREATE TABLE `push_tokens` (
  `token` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `platform` text NOT NULL,
  `created_at` integer NOT NULL DEFAULT (unixepoch()),
  `last_seen_at` integer NOT NULL DEFAULT (unixepoch())
);

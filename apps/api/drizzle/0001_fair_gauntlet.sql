PRAGMA foreign_keys=OFF;--> statement-breakpoint
DROP TABLE `sessions`;--> statement-breakpoint
CREATE TABLE `sessions` (
	`session_id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`device_name` text NOT NULL,
	`expires_at` integer NOT NULL,
	`last_used_at` integer NOT NULL,
	`refresh_expires_at` integer NOT NULL,
	`refresh_token_hash` text NOT NULL,
	`token_hash` text NOT NULL,
	`user_id` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`bangumi_user_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_refresh_token_hash_unique` ON `sessions` (`refresh_token_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_token_hash_unique` ON `sessions` (`token_hash`);--> statement-breakpoint
PRAGMA foreign_keys=ON;

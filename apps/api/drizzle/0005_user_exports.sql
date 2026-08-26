CREATE TABLE `user_exports` (
	`byte_size` integer NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`format` text NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`object_key` text NOT NULL,
	`user_id` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`bangumi_user_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_exports_object_key_unique` ON `user_exports` (`object_key`);

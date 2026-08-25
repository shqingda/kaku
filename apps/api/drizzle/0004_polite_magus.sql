CREATE TABLE `user_recent_subjects` (
	`items` text DEFAULT '[]' NOT NULL,
	`updated_at` integer NOT NULL,
	`user_id` integer PRIMARY KEY NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`bangumi_user_id`) ON UPDATE no action ON DELETE cascade
);

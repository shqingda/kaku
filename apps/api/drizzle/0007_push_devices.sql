CREATE TABLE `push_devices` (
	`last_notification_id` integer,
	`platform` text NOT NULL,
	`token` text PRIMARY KEY NOT NULL,
	`updated_at` integer NOT NULL,
	`user_id` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`bangumi_user_id`) ON UPDATE no action ON DELETE cascade
);

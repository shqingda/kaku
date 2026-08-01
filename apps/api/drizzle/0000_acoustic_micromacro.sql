CREATE TABLE `auth_handoffs` (
	`code_hash` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`user_id` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`bangumi_user_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `bangumi_credentials` (
	`access_token` text NOT NULL,
	`access_token_expires_at` integer NOT NULL,
	`refresh_token` text NOT NULL,
	`updated_at` integer NOT NULL,
	`user_id` integer PRIMARY KEY NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`bangumi_user_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `oauth_transactions` (
	`app_redirect_uri` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`state_hash` text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`last_used_at` integer NOT NULL,
	`token_hash` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`bangumi_user_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`avatar_url` text,
	`bangumi_user_id` integer PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`nickname` text NOT NULL,
	`updated_at` integer NOT NULL,
	`username` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);
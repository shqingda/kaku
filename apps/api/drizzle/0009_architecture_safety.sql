CREATE TABLE `collection_write_locks` (
	`user_id` integer NOT NULL,
	`subject_id` integer NOT NULL,
	`operation_id` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `subject_id`)
);
--> statement-breakpoint
CREATE TABLE `push_receipts` (
	`ticket_id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`user_id` integer NOT NULL,
	`session_id` text NOT NULL,
	`registration_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`last_checked_at` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`session_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `rate_limit_buckets` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`reset_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `auth_handoffs` ADD `code_challenge` text;--> statement-breakpoint
ALTER TABLE `auth_handoffs` ADD `connection_id` text;--> statement-breakpoint
ALTER TABLE `auth_handoffs` ADD `request_id` text;--> statement-breakpoint
ALTER TABLE `bangumi_credentials` ADD `connection_id` text DEFAULT 'legacy' NOT NULL;--> statement-breakpoint
ALTER TABLE `bangumi_credentials` ADD `refresh_operation_id` text;--> statement-breakpoint
ALTER TABLE `bangumi_credentials` ADD `refresh_lease_expires_at` integer;--> statement-breakpoint
ALTER TABLE `oauth_transactions` ADD `code_challenge` text;--> statement-breakpoint
ALTER TABLE `oauth_transactions` ADD `request_id` text;--> statement-breakpoint
ALTER TABLE `push_devices` ADD `session_id` text REFERENCES sessions(session_id) ON DELETE cascade;--> statement-breakpoint
ALTER TABLE `push_devices` ADD `registration_id` text;
ALTER TABLE `push_devices` ADD `provider` text DEFAULT 'expo' NOT NULL;--> statement-breakpoint
ALTER TABLE `push_devices` ADD `apns_environment` text;--> statement-breakpoint
ALTER TABLE `push_devices` ADD `apns_topic` text;
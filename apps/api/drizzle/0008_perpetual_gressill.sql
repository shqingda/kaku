CREATE TABLE `index_write_locks` (
	`user_id` integer NOT NULL,
	`index_id` integer NOT NULL,
	`operation_id` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `index_id`)
);

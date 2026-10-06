CREATE TABLE `rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`design` text NOT NULL,
	`asset_key` text NOT NULL,
	`session_id` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`total` integer NOT NULL,
	`prodigi_id` text,
	`fulfillment_payload` text,
	`last_error` text,
	`created_at` integer NOT NULL,
	`paid_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_session_id_unique` ON `orders` (`session_id`);
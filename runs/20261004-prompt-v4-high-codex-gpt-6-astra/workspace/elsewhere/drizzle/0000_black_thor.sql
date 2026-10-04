CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`design` text NOT NULL,
	`size` text NOT NULL,
	`status` text DEFAULT 'awaiting_payment' NOT NULL,
	`amount` integer NOT NULL,
	`currency` text DEFAULT 'usd' NOT NULL,
	`session_id` text,
	`asset_key` text NOT NULL,
	`asset_token` text NOT NULL,
	`prodigi_id` text,
	`error` text,
	`lease_until` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_session_idx` ON `orders` (`session_id`);--> statement-breakpoint
CREATE INDEX `orders_status_idx` ON `orders` (`status`);
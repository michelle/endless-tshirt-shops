CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL,
	`design` text NOT NULL,
	`asset_key` text NOT NULL,
	`state` text DEFAULT 'pending' NOT NULL,
	`mode` text NOT NULL,
	`session_id` text,
	`recipient` text,
	`prodigi_id` text,
	`error` text,
	`amount` integer NOT NULL,
	`created` integer NOT NULL,
	`updated` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_session_id_unique` ON `orders` (`session_id`);--> statement-breakpoint
CREATE INDEX `orders_state_idx` ON `orders` (`state`,`updated`);--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires` integer NOT NULL
);

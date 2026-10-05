CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`design` text NOT NULL,
	`asset` text NOT NULL,
	`amount` integer NOT NULL,
	`session` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`prodigi_id` text,
	`error` text,
	`lease` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_session_unique` ON `orders` (`session`);--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires` integer NOT NULL
);

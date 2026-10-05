CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`design` text NOT NULL,
	`asset` text NOT NULL,
	`session` text,
	`amount` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`prodigi` text,
	`error` text,
	`recipient` text,
	`created` integer NOT NULL,
	`updated` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_session_unique` ON `orders` (`session`);
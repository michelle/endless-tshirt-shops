CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`stripe_session_id` text,
	`place` text NOT NULL,
	`date` text NOT NULL,
	`note` text NOT NULL,
	`size` text NOT NULL,
	`status` text NOT NULL,
	`prodigi_order_id` text,
	`error` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_stripe_session_id_unique` ON `orders` (`stripe_session_id`);
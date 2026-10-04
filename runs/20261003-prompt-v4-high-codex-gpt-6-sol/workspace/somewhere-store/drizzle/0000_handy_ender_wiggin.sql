CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`status` text NOT NULL,
	`place` text NOT NULL,
	`moment_date` text NOT NULL,
	`dedication` text NOT NULL,
	`color` text NOT NULL,
	`size` text NOT NULL,
	`stripe_session` text,
	`processing_at` integer,
	`prodigi_id` text,
	`failure` text
);

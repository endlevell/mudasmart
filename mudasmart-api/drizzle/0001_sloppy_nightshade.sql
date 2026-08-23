CREATE TABLE `leave_requests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`student_id` text NOT NULL,
	`date` text NOT NULL,
	`type` text NOT NULL,
	`reason` text NOT NULL,
	`image_path` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_by` text NOT NULL,
	`reviewed_by` text,
	`reviewed_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "leave_requests_type_check" CHECK("leave_requests"."type" in ('sakit', 'izin')),
	CONSTRAINT "leave_requests_status_check" CHECK("leave_requests"."status" in ('pending', 'approved', 'rejected'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `leave_requests_student_date_unique` ON `leave_requests` (`student_id`,`date`);
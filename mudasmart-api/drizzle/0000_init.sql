CREATE TABLE `attendance_config` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`check_in_start` text NOT NULL,
	`on_time_cutoff` text NOT NULL,
	`check_in_end` text NOT NULL,
	`updated_by` text,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `attendance_records` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` integer NOT NULL,
	`student_id` text NOT NULL,
	`class_id_snapshot` integer NOT NULL,
	`gate_id` integer NOT NULL,
	`device_id` integer NOT NULL,
	`scanned_at` integer NOT NULL,
	`status` text NOT NULL,
	`latitude` real,
	`longitude` real,
	`geofence_passed` integer,
	`client_nonce` text NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `attendance_sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`student_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`class_id_snapshot`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`gate_id`) REFERENCES `gates`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`device_id`) REFERENCES `devices`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `attendance_records_client_nonce_unique` ON `attendance_records` (`client_nonce`);--> statement-breakpoint
CREATE UNIQUE INDEX `attendance_session_student_unique` ON `attendance_records` (`session_id`,`student_id`);--> statement-breakpoint
CREATE INDEX `attendance_student_scanned_idx` ON `attendance_records` (`student_id`,`scanned_at`);--> statement-breakpoint
CREATE INDEX `attendance_class_snapshot_idx` ON `attendance_records` (`class_id_snapshot`,`scanned_at`);--> statement-breakpoint
CREATE TABLE `attendance_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`opened_by` text NOT NULL,
	`opened_at` integer NOT NULL,
	`closed_by` text,
	`closed_at` integer,
	`status` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`opened_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`closed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "attendance_sessions_status_check" CHECK("attendance_sessions"."status" in ('open', 'closed'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `attendance_sessions_date_unique` ON `attendance_sessions` (`date`);--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`action` text NOT NULL,
	`metadata` text,
	`ip` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `classes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`gradeLevel` integer NOT NULL,
	`academic_year` text NOT NULL,
	`homeroom_teacher_id` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`homeroom_teacher_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `classes_academic_year_idx` ON `classes` (`academic_year`,`is_active`);--> statement-breakpoint
CREATE TABLE `devices` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`device_id` text,
	`platform` text,
	`model` text,
	`user_agent` text NOT NULL,
	`reset_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`last_seen_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `gates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`qr_code_value` text NOT NULL,
	`latitude` real,
	`longitude` real,
	`radius_meters` integer,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `gates_qr_code_value_unique` ON `gates` (`qr_code_value`);--> statement-breakpoint
CREATE TABLE `refresh_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`family_id` text NOT NULL,
	`device_id` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`revoked_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`device_id`) REFERENCES `devices`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `refresh_tokens_token_hash_unique` ON `refresh_tokens` (`token_hash`);--> statement-breakpoint
CREATE TABLE `registration_codes` (
	`code` text PRIMARY KEY NOT NULL,
	`role_allowed` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`max_uses` integer,
	`used_count` integer DEFAULT 0 NOT NULL,
	`expires_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "registration_codes_role_allowed_check" CHECK("registration_codes"."role_allowed" in ('murid', 'guru'))
);
--> statement-breakpoint
CREATE TABLE `student_profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`nis` text NOT NULL,
	`class_id` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `student_profiles_nis_unique` ON `student_profiles` (`nis`);--> statement-breakpoint
CREATE TABLE `teacher_profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`nip` text,
	`is_admin` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `teacher_profiles_nip_unique` ON `teacher_profiles` (`nip`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`full_name` text NOT NULL,
	`role` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "users_role_check" CHECK("users"."role" in ('murid', 'guru'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);
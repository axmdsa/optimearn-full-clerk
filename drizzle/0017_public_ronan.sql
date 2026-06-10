ALTER TABLE `users` ADD `isSuspicious` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `suspiciousReason` text;--> statement-breakpoint
ALTER TABLE `users` ADD `flaggedAt` timestamp;
CREATE TABLE `duplicate_account_alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ipAddress` varchar(45) NOT NULL,
	`userIds` text NOT NULL,
	`accountCount` int NOT NULL,
	`isResolved` boolean NOT NULL DEFAULT false,
	`resolvedBy` int,
	`resolvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `duplicate_account_alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_login_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`ipAddress` varchar(45) NOT NULL,
	`country` varchar(2),
	`loginAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_login_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `country` varchar(2);--> statement-breakpoint
ALTER TABLE `users` ADD `ipAddress` varchar(45);--> statement-breakpoint
ALTER TABLE `users` ADD `lastLoginCountry` varchar(2);--> statement-breakpoint
ALTER TABLE `users` ADD `isBanned` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `banReason` text;--> statement-breakpoint
ALTER TABLE `users` ADD `bannedAt` timestamp;
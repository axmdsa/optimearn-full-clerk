CREATE TABLE `affiliate_earnings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`completionId` varchar(255) NOT NULL,
	`affiliateNetworkId` int NOT NULL,
	`taskId` int NOT NULL,
	`publisherPayout` decimal(10,2) NOT NULL,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`earnedAt` timestamp NOT NULL DEFAULT (now()),
	`approvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `affiliate_earnings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `affiliate_networks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`webhookUrl` text NOT NULL,
	`webhookSecret` text NOT NULL,
	`postbackTypes` text,
	`description` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `affiliate_networks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_points_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`completionId` varchar(255) NOT NULL,
	`taskId` int NOT NULL,
	`pointsAmount` int NOT NULL,
	`pointsStatus` enum('pending','confirmed') NOT NULL DEFAULT 'pending',
	`isLockedForCashout` boolean NOT NULL DEFAULT false,
	`awardedAt` timestamp NOT NULL DEFAULT (now()),
	`confirmedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_points_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `tasks` ADD `affiliateNetworkId` int;--> statement-breakpoint
ALTER TABLE `tasks` ADD `publisherPayout` decimal(10,2);--> statement-breakpoint
ALTER TABLE `tasks` ADD `postbackUrl` text;
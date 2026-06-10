CREATE TABLE `offer_clicks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskId` int NOT NULL,
	`userId` int,
	`clickId` varchar(255) NOT NULL,
	`ipAddress` varchar(45),
	`userAgent` text,
	`country` varchar(2),
	`referrer` text,
	`clickedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `offer_clicks_id` PRIMARY KEY(`id`),
	CONSTRAINT `offer_clicks_clickId_unique` UNIQUE(`clickId`)
);
--> statement-breakpoint
CREATE TABLE `offer_completions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskId` int NOT NULL,
	`userId` int NOT NULL,
	`clickId` varchar(255) NOT NULL,
	`completionId` varchar(255) NOT NULL,
	`status` enum('pending','approved','rejected','duplicate') NOT NULL DEFAULT 'pending',
	`pointsAwarded` int NOT NULL DEFAULT 0,
	`conversionValue` decimal(10,2),
	`metadata` json,
	`completedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `offer_completions_id` PRIMARY KEY(`id`),
	CONSTRAINT `offer_completions_completionId_unique` UNIQUE(`completionId`)
);
--> statement-breakpoint
CREATE TABLE `offer_postbacks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`completionId` int NOT NULL,
	`postbackUrl` text NOT NULL,
	`status` enum('pending','sent','failed','success') NOT NULL DEFAULT 'pending',
	`httpStatus` int,
	`responseBody` text,
	`attemptCount` int NOT NULL DEFAULT 0,
	`maxAttempts` int NOT NULL DEFAULT 5,
	`nextRetryAt` timestamp,
	`lastAttemptAt` timestamp,
	`sentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `offer_postbacks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `offer_tracking_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskId` int NOT NULL,
	`postbackUrl` text,
	`clickIdFormat` varchar(50) NOT NULL DEFAULT 'uuid',
	`trackingEnabled` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `offer_tracking_config_id` PRIMARY KEY(`id`),
	CONSTRAINT `offer_tracking_config_taskId_unique` UNIQUE(`taskId`)
);

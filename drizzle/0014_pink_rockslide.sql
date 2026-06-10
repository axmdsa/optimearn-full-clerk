CREATE TABLE `fraud_alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`ruleId` int NOT NULL,
	`alertType` enum('location_change','multiple_countries','rapid_redemption','duplicate_ip','vpn_detected','custom') NOT NULL,
	`severity` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
	`description` text NOT NULL,
	`metadata` text,
	`isResolved` boolean NOT NULL DEFAULT false,
	`action` enum('alert','flag_user','block_action','ban_user') NOT NULL DEFAULT 'alert',
	`resolvedBy` int,
	`resolvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `fraud_alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fraud_detection_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`ruleType` enum('location_change','multiple_countries','rapid_redemption','duplicate_ip','vpn_detected','custom') NOT NULL,
	`enabled` boolean NOT NULL DEFAULT true,
	`maxCountriesPerDay` int,
	`maxCountriesPerWeek` int,
	`blockLocationChange` boolean DEFAULT false,
	`maxRedemptionsPerDay` int,
	`maxRedemptionsPerHour` int,
	`blockDuplicateIp` boolean DEFAULT false,
	`action` enum('alert','flag_user','block_action','ban_user') NOT NULL DEFAULT 'alert',
	`whitelistCountries` text,
	`blacklistCountries` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `fraud_detection_rules_id` PRIMARY KEY(`id`)
);

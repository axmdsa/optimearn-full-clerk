ALTER TABLE `tasks` MODIFY COLUMN `category` enum('survey','video','app_trial','offer','app_install','daily','social') NOT NULL;--> statement-breakpoint
ALTER TABLE `tasks` ADD `offerType` enum('standard','app_install','survey','video') DEFAULT 'standard' NOT NULL;--> statement-breakpoint
ALTER TABLE `tasks` ADD `targetCountries` text;--> statement-breakpoint
ALTER TABLE `tasks` ADD `targetDevices` text;
ALTER TABLE `user_tasks` ADD `proofType` enum('screenshot','code','none') DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE `user_tasks` ADD `proofUrl` text;--> statement-breakpoint
ALTER TABLE `user_tasks` ADD `proofCode` varchar(255);
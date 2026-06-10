ALTER TABLE `affiliate_networks` ADD `subIdParamName` varchar(100) DEFAULT 'subid' NOT NULL;--> statement-breakpoint
ALTER TABLE `affiliate_networks` ADD `supportedMacros` text;--> statement-breakpoint
ALTER TABLE `affiliate_networks` ADD `customMacros` text;--> statement-breakpoint
ALTER TABLE `affiliate_networks` ADD `postbackFormat` enum('url_encoded','json','query_params') DEFAULT 'url_encoded' NOT NULL;--> statement-breakpoint
ALTER TABLE `affiliate_networks` ADD `postbackMethod` enum('POST','GET') DEFAULT 'POST' NOT NULL;--> statement-breakpoint
ALTER TABLE `affiliate_networks` ADD `macroFieldMapping` text;
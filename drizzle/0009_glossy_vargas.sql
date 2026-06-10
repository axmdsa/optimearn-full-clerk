ALTER TABLE `redemptions` ADD `paymentMethod` enum('paypal','crypto','gift_card','other') DEFAULT 'other';--> statement-breakpoint
ALTER TABLE `redemptions` ADD `paymentAddress` text;--> statement-breakpoint
ALTER TABLE `redemptions` ADD `paymentNote` text;--> statement-breakpoint
ALTER TABLE `users` ADD `userId` varchar(12);--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_userId_unique` UNIQUE(`userId`);
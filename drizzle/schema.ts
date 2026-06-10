import {
  int, mysqlEnum, mysqlTable, text, timestamp,
  varchar, boolean, decimal, json
} from "drizzle-orm/mysql-core";

// ─── Users ────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id:            int("id").autoincrement().primaryKey(),
  openId:        varchar("openId", { length: 64 }).notNull().unique(),
  name:          text("name"),
  email:         varchar("email", { length: 320 }),
  loginMethod:   varchar("loginMethod", { length: 64 }),
  role:          mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  // Rewards
  points:        int("points").default(0).notNull(),
  totalEarned:   int("totalEarned").default(0).notNull(),
  level:         int("level").default(1).notNull(),
  xp:            int("xp").default(0).notNull(),
  xpToNextLevel: int("xpToNextLevel").default(500).notNull(),
  streak:        int("streak").default(0).notNull(),
  lastStreakDate: timestamp("lastStreakDate"),
  referralCode:  varchar("referralCode", { length: 16 }).unique(),
  referredBy:    varchar("referredBy", { length: 16 }),
  avatarUrl:     text("avatarUrl"),
  userId:        varchar("userId", { length: 12 }).unique(),  // Public-facing user ID (e.g. OE-ABC123)
  country:       varchar("country", { length: 2 }),  // ISO country code (e.g. US, GB)
  originalCountry: varchar("originalCountry", { length: 2 }),  // First login country
  ipAddress:     varchar("ipAddress", { length: 45 }),  // IPv4 or IPv6
  lastLoginCountry: varchar("lastLoginCountry", { length: 2 }),  // Track country changes
  isBanned:      boolean("isBanned").default(false).notNull(),
  banReason:     text("banReason"),
  bannedAt:      timestamp("bannedAt"),
  isSuspicious:  boolean("isSuspicious").default(false).notNull(),
  suspiciousReason: text("suspiciousReason"),
  flaggedAt:     timestamp("flaggedAt"),
  createdAt:     timestamp("createdAt").defaultNow().notNull(),
  updatedAt:     timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn:  timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Tasks / Offers ───────────────────────────────────────────
export const tasks = mysqlTable("tasks", {
  id:          int("id").autoincrement().primaryKey(),
  title:       varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  category:    mysqlEnum("category", ["survey", "video", "app_trial", "offer", "app_install", "daily", "social", "play_to_earn"]).notNull(),
  offerType:   mysqlEnum("offerType", ["standard", "app_install", "survey", "video"]).default("standard").notNull(),
  points:      int("points").notNull(),
  xpReward:    int("xpReward").default(50).notNull(),
  timeMinutes: int("timeMinutes").default(5).notNull(),
  frequency:   mysqlEnum("frequency", ["once", "daily", "weekly"]).default("once").notNull(),
  difficulty:  mysqlEnum("difficulty", ["easy", "medium", "hard"]).default("easy").notNull(),
  imageUrl:    text("imageUrl"),
  thumbnailUrl: text("thumbnailUrl"),  // Custom thumbnail for offer cards
  screenshots:  text("screenshots"),  // JSON array of image URLs
  offerUrl:     text("offerUrl"),     // URL to redirect user to when they start the task
  providerName: varchar("providerName", { length: 100 }),
  requirements: text("requirements"),
  disclaimer:  text("disclaimer"),
  targetCountries: text("targetCountries"),  // JSON array of country codes
  targetDevices:   text("targetDevices"),    // JSON array of devices
  isActive:    boolean("isActive").default(true).notNull(),
  isFeatured:  boolean("isFeatured").default(false).notNull(),
  isTrending:  boolean("isTrending").default(false).notNull(),
  sortOrder:   int("sortOrder").default(0).notNull(),
  affiliateNetworkId: int("affiliateNetworkId"),  // Which affiliate network this offer is from
  publisherPayout: decimal("publisherPayout", { precision: 10, scale: 2 }),  // How much you earn per completion
  postbackUrl: text("postbackUrl"),  // Custom postback URL for this offer (overrides network default)
  createdAt:   timestamp("createdAt").defaultNow().notNull(),
});

export type Task = typeof tasks.$inferSelect;

// ─── User Task Completions ────────────────────────────────────
export const userTasks = mysqlTable("user_tasks", {
  id:          int("id").autoincrement().primaryKey(),
  userId:      int("userId").notNull(),
  taskId:      int("taskId").notNull(),
  status:      mysqlEnum("status", ["started", "pending", "completed", "rejected"]).default("started").notNull(),
  pointsEarned: int("pointsEarned").default(0).notNull(),
  proofType:   mysqlEnum("proofType", ["screenshot", "code", "none"]).default("none").notNull(),
  proofUrl:    text("proofUrl"),
  proofCode:   varchar("proofCode", { length: 255 }),
  completedAt: timestamp("completedAt"),
  createdAt:   timestamp("createdAt").defaultNow().notNull(),
});

export type UserTask = typeof userTasks.$inferSelect;

// ─── Notifications ────────────────────────────────────────────
export const notifications = mysqlTable("notifications", {
  id:        int("id").autoincrement().primaryKey(),
  userId:    int("userId").notNull(),
  title:     varchar("title", { length: 255 }).notNull(),
  message:   text("message").notNull(),
  type:      mysqlEnum("type", ["task_complete", "reward_redeemed", "achievement", "referral", "system", "bonus"]).default("system").notNull(),
  isRead:    boolean("isRead").default(false).notNull(),
  iconUrl:   text("iconUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;

// ─── Daily Bonus ──────────────────────────────────────────────
export const dailyBonuses = mysqlTable("daily_bonuses", {
  id:         int("id").autoincrement().primaryKey(),
  userId:     int("userId").notNull(),
  pointsWon:  int("pointsWon").notNull(),
  spinResult: varchar("spinResult", { length: 50 }).notNull(),
  claimedAt:  timestamp("claimedAt").defaultNow().notNull(),
});

export type DailyBonus = typeof dailyBonuses.$inferSelect;

// ─── Rewards (Shop Items) ─────────────────────────────────────
export const rewards = mysqlTable("rewards", {
  id:          int("id").autoincrement().primaryKey(),
  name:        varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category:    mysqlEnum("category", ["gift_card", "paypal", "crypto", "gaming", "other"]).notNull(),
  pointsCost:  int("pointsCost").notNull(),
  imageUrl:    text("imageUrl"),
  brand:       varchar("brand", { length: 100 }),
  isAvailable: boolean("isAvailable").default(true).notNull(),
  sortOrder:   int("sortOrder").default(0).notNull(),
  createdAt:   timestamp("createdAt").defaultNow().notNull(),
});

export type Reward = typeof rewards.$inferSelect;

// ─── Redemptions ──────────────────────────────────────────────
export const redemptions = mysqlTable("redemptions", {
  id:             int("id").autoincrement().primaryKey(),
  userId:         int("userId").notNull(),
  rewardId:       int("rewardId").notNull(),
  pointsSpent:    int("pointsSpent").notNull(),
  status:         mysqlEnum("status", ["pending", "processing", "completed", "failed"]).default("pending").notNull(),
  paymentMethod:  mysqlEnum("paymentMethod", ["paypal", "crypto", "gift_card", "other"]).default("other"),
  paymentAddress: text("paymentAddress"),  // PayPal email or crypto wallet address
  paymentNote:    text("paymentNote"),     // Optional note from user
  createdAt:      timestamp("createdAt").defaultNow().notNull(),
});

export type Redemption = typeof redemptions.$inferSelect;

// ─── Referrals ────────────────────────────────────────────────
export const referrals = mysqlTable("referrals", {
  id:            int("id").autoincrement().primaryKey(),
  referrerId:    int("referrerId").notNull(),
  refereeId:     int("refereeId").notNull(),
  bonusEarned:   int("bonusEarned").default(0).notNull(),
  status:        mysqlEnum("status", ["pending", "active", "rewarded"]).default("pending").notNull(),
  createdAt:     timestamp("createdAt").defaultNow().notNull(),
});

export type Referral = typeof referrals.$inferSelect;

// ─── Achievements ─────────────────────────────────────────────
export const achievements = mysqlTable("achievements", {
  id:          int("id").autoincrement().primaryKey(),
  name:        varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  icon:        varchar("icon", { length: 50 }).notNull(),
  category:    mysqlEnum("category", ["earning", "social", "streak", "level", "special"]).notNull(),
  requirement: int("requirement").default(1).notNull(),
  pointsBonus: int("pointsBonus").default(0).notNull(),
  rarity:      mysqlEnum("rarity", ["common", "rare", "epic", "legendary"]).default("common").notNull(),
  createdAt:   timestamp("createdAt").defaultNow().notNull(),
});

export type Achievement = typeof achievements.$inferSelect;

// ─── User Achievements ────────────────────────────────────────
export const userAchievements = mysqlTable("user_achievements", {
  id:            int("id").autoincrement().primaryKey(),
  userId:        int("userId").notNull(),
  achievementId: int("achievementId").notNull(),
  unlockedAt:    timestamp("unlockedAt").defaultNow().notNull(),
});

export type UserAchievement = typeof userAchievements.$inferSelect;

// ─── Offer Wall Providers ─────────────────────────────────────
export const offerProviders = mysqlTable("offer_providers", {
  id:          int("id").autoincrement().primaryKey(),
  name:        varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  logoUrl:     text("logoUrl"),
  baseUrl:     text("baseUrl"),
  isActive:    boolean("isActive").default(true).notNull(),
  totalOffers: int("totalOffers").default(0).notNull(),
  avgPayout:   decimal("avgPayout", { precision: 10, scale: 2 }).default("0.00"),
  sortOrder:   int("sortOrder").default(0).notNull(),
  createdAt:   timestamp("createdAt").defaultNow().notNull(),
});

export type OfferProvider = typeof offerProviders.$inferSelect;

// ─── Points Transactions (Ledger) ────────────────────────────
export const pointsTransactions = mysqlTable("points_transactions", {
  id:            int("id").autoincrement().primaryKey(),
  userId:        int("userId").notNull(),
  amount:        int("amount").notNull(),
  balanceAfter:  int("balanceAfter").notNull(),
  type:          mysqlEnum("type", ["task_reward", "daily_bonus", "redemption", "referral_bonus", "achievement", "bonus"]).notNull(),
  description:   text("description").notNull(),
  createdAt:     timestamp("createdAt").defaultNow().notNull(),
});

export type PointsTransaction = typeof pointsTransactions.$inferSelect;

// ─── Audit Log ────────────────────────────────────────────────
export const auditLog = mysqlTable("audit_log", {
  id:         int("id").autoincrement().primaryKey(),
  adminId:    int("adminId").notNull(),
  adminName:  varchar("adminName", { length: 100 }),
  action:     varchar("action", { length: 100 }).notNull(),
  entity:     varchar("entity", { length: 50 }).notNull(),
  entityId:   int("entityId"),
  details:    json("details"),
  createdAt:  timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLog.$inferSelect;

// ─── Platform Settings ────────────────────────────────────────
export const platformSettings = mysqlTable("platform_settings", {
  id:          int("id").autoincrement().primaryKey(),
  key:         varchar("key", { length: 100 }).notNull().unique(),
  value:       text("value").notNull(),
  description: text("description"),
  updatedAt:   timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PlatformSetting = typeof platformSettings.$inferSelect;


// ─── User Login History ───────────────────────────────────────
export const userLoginHistory = mysqlTable("user_login_history", {
  id:        int("id").autoincrement().primaryKey(),
  userId:    int("userId").notNull(),
  ipAddress: varchar("ipAddress", { length: 45 }).notNull(),
  country:   varchar("country", { length: 2 }),
  loginAt:   timestamp("loginAt").defaultNow().notNull(),
});

export type UserLoginHistory = typeof userLoginHistory.$inferSelect;

// ─── Duplicate Account Alerts ─────────────────────────────────
export const duplicateAccountAlerts = mysqlTable("duplicate_account_alerts", {
  id:            int("id").autoincrement().primaryKey(),
  ipAddress:     varchar("ipAddress", { length: 45 }).notNull(),
  userIds:       text("userIds").notNull(),
  accountCount:  int("accountCount").notNull(),
  isResolved:    boolean("isResolved").default(false).notNull(),
  resolvedBy:    int("resolvedBy"),
  resolvedAt:    timestamp("resolvedAt"),
  createdAt:     timestamp("createdAt").defaultNow().notNull(),
});

export type DuplicateAccountAlert = typeof duplicateAccountAlerts.$inferSelect;


// ─── Fraud Detection Rules ────────────────────────────────────
export const fraudDetectionRules = mysqlTable("fraud_detection_rules", {
  id:                    int("id").autoincrement().primaryKey(),
  name:                  varchar("name", { length: 255 }).notNull(),
  description:           text("description"),
  ruleType:              mysqlEnum("ruleType", ["location_change", "multiple_countries", "rapid_redemption", "duplicate_ip", "vpn_detected", "custom"]).notNull(),
  enabled:               boolean("enabled").default(true).notNull(),
  
  // Location-based rules
  maxCountriesPerDay:    int("maxCountriesPerDay"),  // Max different countries in 24h
  maxCountriesPerWeek:   int("maxCountriesPerWeek"),  // Max different countries in 7 days
  blockLocationChange:   boolean("blockLocationChange").default(false),  // Block if logs in from different country
  
  // Redemption rules
  maxRedemptionsPerDay:  int("maxRedemptionsPerDay"),  // Max redemptions per day
  maxRedemptionsPerHour: int("maxRedemptionsPerHour"),  // Max redemptions per hour
  
  // IP-based rules
  blockDuplicateIp:      boolean("blockDuplicateIp").default(false),  // Block if multiple accounts from same IP
  
  // Action to take
  action:                mysqlEnum("action", ["alert", "flag_user", "block_action", "ban_user"]).default("alert").notNull(),
  
  // Whitelist/Blacklist
  whitelistCountries:    text("whitelistCountries"),  // JSON array of country codes
  blacklistCountries:    text("blacklistCountries"),  // JSON array of country codes
  
  createdAt:             timestamp("createdAt").defaultNow().notNull(),
  updatedAt:             timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FraudDetectionRule = typeof fraudDetectionRules.$inferSelect;
export type InsertFraudDetectionRule = typeof fraudDetectionRules.$inferInsert;

// ─── Fraud Alerts ─────────────────────────────────────────────
export const fraudAlerts = mysqlTable("fraud_alerts", {
  id:              int("id").autoincrement().primaryKey(),
  userId:          int("userId").notNull(),
  ruleId:          int("ruleId").notNull(),
  alertType:       mysqlEnum("alertType", ["location_change", "multiple_countries", "rapid_redemption", "duplicate_ip", "vpn_detected", "custom"]).notNull(),
  severity:        mysqlEnum("severity", ["low", "medium", "high", "critical"]).default("medium").notNull(),
  description:     text("description").notNull(),
  metadata:        text("metadata"),  // JSON with additional context
  isResolved:      boolean("isResolved").default(false).notNull(),
  action:          mysqlEnum("action", ["alert", "flag_user", "block_action", "ban_user"]).default("alert").notNull(),
  resolvedBy:      int("resolvedBy"),  // Admin who resolved it
  resolvedAt:      timestamp("resolvedAt"),
  createdAt:       timestamp("createdAt").defaultNow().notNull(),
});

export type FraudAlert = typeof fraudAlerts.$inferSelect;
export type InsertFraudAlert = typeof fraudAlerts.$inferInsert;


// ─── Offer Tracking Config ────────────────────────────────────
export const offerTrackingConfig = mysqlTable("offer_tracking_config", {
  id:              int("id").autoincrement().primaryKey(),
  taskId:          int("taskId").notNull().unique(),
  postbackUrl:     text("postbackUrl"),  // URL to send postback notifications
  clickIdFormat:   varchar("clickIdFormat", { length: 50 }).default("uuid").notNull(),  // uuid, uuid_prefix, sequential
  trackingEnabled: boolean("trackingEnabled").default(true).notNull(),
  createdAt:       timestamp("createdAt").defaultNow().notNull(),
  updatedAt:       timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type OfferTrackingConfig = typeof offerTrackingConfig.$inferSelect;
export type InsertOfferTrackingConfig = typeof offerTrackingConfig.$inferInsert;

// ─── Offer Clicks ─────────────────────────────────────────────
export const offerClicks = mysqlTable("offer_clicks", {
  id:           int("id").autoincrement().primaryKey(),
  taskId:       int("taskId").notNull(),
  userId:       int("userId"),  // Nullable for anonymous clicks
  clickId:      varchar("clickId", { length: 255 }).notNull().unique(),  // Unique identifier for this click
  ipAddress:    varchar("ipAddress", { length: 45 }),
  userAgent:    text("userAgent"),
  country:      varchar("country", { length: 2 }),
  referrer:     text("referrer"),
  clickedAt:    timestamp("clickedAt").defaultNow().notNull(),
  createdAt:    timestamp("createdAt").defaultNow().notNull(),
});

export type OfferClick = typeof offerClicks.$inferSelect;
export type InsertOfferClick = typeof offerClicks.$inferInsert;

// ─── Offer Completions ────────────────────────────────────────
export const offerCompletions = mysqlTable("offer_completions", {
  id:             int("id").autoincrement().primaryKey(),
  taskId:         int("taskId").notNull(),
  userId:         int("userId").notNull(),
  clickId:        varchar("clickId", { length: 255 }).notNull(),  // Link to original click
  completionId:   varchar("completionId", { length: 255 }).notNull().unique(),  // Unique completion identifier
  sessionUuid:    varchar("sessionUuid", { length: 255 }),  // Session UUID from affiliate network postback
  status:         mysqlEnum("status", ["pending", "approved", "rejected", "duplicate"]).default("pending").notNull(),
  pointsAwarded:  int("pointsAwarded").default(0).notNull(),
  conversionValue: decimal("conversionValue", { precision: 10, scale: 2 }),  // Value of conversion for publisher
  metadata:       json("metadata"),  // Additional data from completion
  completedAt:    timestamp("completedAt").defaultNow().notNull(),
  createdAt:      timestamp("createdAt").defaultNow().notNull(),
});

export type OfferCompletion = typeof offerCompletions.$inferSelect;
export type InsertOfferCompletion = typeof offerCompletions.$inferInsert;

// ─── Offer Postbacks ──────────────────────────────────────────
export const offerPostbacks = mysqlTable("offer_postbacks", {
  id:              int("id").autoincrement().primaryKey(),
  completionId:    int("completionId").notNull(),  // Link to offer completion
  postbackUrl:     text("postbackUrl").notNull(),
  status:          mysqlEnum("status", ["pending", "sent", "failed", "success"]).default("pending").notNull(),
  httpStatus:      int("httpStatus"),  // HTTP response status code
  responseBody:    text("responseBody"),  // Response from postback endpoint
  attemptCount:    int("attemptCount").default(0).notNull(),
  maxAttempts:     int("maxAttempts").default(5).notNull(),
  nextRetryAt:     timestamp("nextRetryAt"),
  lastAttemptAt:   timestamp("lastAttemptAt"),
  sentAt:          timestamp("sentAt"),
  createdAt:       timestamp("createdAt").defaultNow().notNull(),
  updatedAt:       timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type OfferPostback = typeof offerPostbacks.$inferSelect;
export type InsertOfferPostback = typeof offerPostbacks.$inferInsert;


// ─── Affiliate Networks ────────────────────────────────────────
export const affiliateNetworks = mysqlTable("affiliate_networks", {
  id:              int("id").autoincrement().primaryKey(),
  name:            varchar("name", { length: 255 }).notNull(),
  webhookUrl:      text("webhookUrl").notNull(),
  webhookSecret:   text("webhookSecret").notNull(),
  postbackTypes:   text("postbackTypes"),
  description:     text("description"),
  isActive:        boolean("isActive").default(true).notNull(),
  
  // SubID Configuration
  subIdParamName:  varchar("subIdParamName", { length: 100 }).default("subid").notNull(),
  
  // Macro Configuration (JSON)
  supportedMacros: text("supportedMacros"),  // JSON array of supported macros
  customMacros:    text("customMacros"),     // JSON array of custom macros
  
  // Postback Format Configuration
  postbackFormat:  mysqlEnum("postbackFormat", ["url_encoded", "json", "query_params"]).default("url_encoded").notNull(),
  postbackMethod:  mysqlEnum("postbackMethod", ["POST", "GET"]).default("POST").notNull(),
  
  // Macro to Field Mapping (JSON)
  macroFieldMapping: text("macroFieldMapping"),  // JSON object mapping macro names to internal fields
  
  createdAt:       timestamp("createdAt").defaultNow().notNull(),
  updatedAt:       timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AffiliateNetwork = typeof affiliateNetworks.$inferSelect;
export type InsertAffiliateNetwork = typeof affiliateNetworks.$inferInsert;

// ─── Affiliate Earnings ────────────────────────────────────────
export const affiliateEarnings = mysqlTable("affiliate_earnings", {
  id:                    int("id").autoincrement().primaryKey(),
  completionId:          varchar("completionId", { length: 255 }).notNull(),  // Link to offer completion
  affiliateNetworkId:    int("affiliateNetworkId").notNull(),  // Which network this earning is from
  taskId:                int("taskId").notNull(),  // Which offer
  publisherPayout:       decimal("publisherPayout", { precision: 10, scale: 2 }).notNull(),  // What you earn
  status:                mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),  // Postback status
  earnedAt:              timestamp("earnedAt").defaultNow().notNull(),
  approvedAt:            timestamp("approvedAt"),  // When final postback confirmed
  createdAt:             timestamp("createdAt").defaultNow().notNull(),
  updatedAt:             timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AffiliateEarning = typeof affiliateEarnings.$inferSelect;
export type InsertAffiliateEarning = typeof affiliateEarnings.$inferInsert;

// ─── User Points History (for tracking pending vs confirmed) ────
export const userPointsHistory = mysqlTable("user_points_history", {
  id:                 int("id").autoincrement().primaryKey(),
  userId:             int("userId").notNull(),
  completionId:       varchar("completionId", { length: 255 }).notNull(),  // Link to offer completion
  taskId:             int("taskId").notNull(),
  pointsAmount:       int("pointsAmount").notNull(),
  pointsStatus:       mysqlEnum("pointsStatus", ["pending", "confirmed"]).default("pending").notNull(),  // pending = locked from cashout, confirmed = can cashout
  isLockedForCashout: boolean("isLockedForCashout").default(false).notNull(),  // True if high-value offer pending verification
  awardedAt:          timestamp("awardedAt").defaultNow().notNull(),
  confirmedAt:        timestamp("confirmedAt"),  // When postback confirmed
  createdAt:          timestamp("createdAt").defaultNow().notNull(),
});

export type UserPointsHistory = typeof userPointsHistory.$inferSelect;
export type InsertUserPointsHistory = typeof userPointsHistory.$inferInsert;


// ─── Postback Audit Logs ────────────────────────────────────────
export const postbackAuditLogs = mysqlTable("postback_audit_logs", {
  id:                    int("id").autoincrement().primaryKey(),
  affiliateNetworkId:    int("affiliateNetworkId").notNull(),  // Which network sent this postback
  completionId:          varchar("completionId", { length: 255 }).notNull(),  // Link to offer completion
  rawPayload:            text("rawPayload").notNull(),  // Raw postback data received
  payloadFormat:         mysqlEnum("payloadFormat", ["url_encoded", "json", "query_params"]).notNull(),  // Format of payload
  signatureProvided:     text("signatureProvided"),  // Signature provided by network
  signatureValid:        boolean("signatureValid").notNull(),  // Whether signature validation passed
  signatureError:        text("signatureError"),  // Error message if signature validation failed
  parsedData:            text("parsedData"),  // Parsed JSON of the payload
  macroMappingUsed:      text("macroMappingUsed"),  // JSON of macro mappings applied
  extractedStatus:       mysqlEnum("extractedStatus", ["pending", "approved", "rejected"]).notNull(),  // Status extracted from postback
  extractedPayout:       decimal("extractedPayout", { precision: 10, scale: 2 }),  // Payout extracted from postback
  httpMethod:            varchar("httpMethod", { length: 10 }).notNull(),  // POST, GET, etc.
  sourceIp:              varchar("sourceIp", { length: 45 }),  // IP address that sent the postback
  userAgent:             text("userAgent"),  // User agent of the request
  processingStatus:      mysqlEnum("processingStatus", ["success", "failed", "pending"]).default("pending").notNull(),  // Whether we successfully processed it
  processingError:       text("processingError"),  // Error message if processing failed
  createdAt:             timestamp("createdAt").defaultNow().notNull(),
});

export type PostbackAuditLog = typeof postbackAuditLogs.$inferSelect;
export type InsertPostbackAuditLog = typeof postbackAuditLogs.$inferInsert;

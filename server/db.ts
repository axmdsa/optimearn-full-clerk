import { and, desc, eq, gte, sql, ne, isNotNull, lte, inArray, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  achievements, auditLog, dailyBonuses, notifications, offerProviders, platformSettings, pointsTransactions,
  redemptions, referrals, rewards, tasks, userAchievements,
  userTasks, users, userLoginHistory, duplicateAccountAlerts, fraudDetectionRules, fraudAlerts,
  offerTrackingConfig, offerClicks, offerCompletions, offerPostbacks,
  affiliateNetworks, affiliateEarnings, userPointsHistory, postbackAuditLogs,
  type InsertUser, type InsertFraudAlert, type InsertOfferClick, type InsertOfferCompletion, type InsertOfferPostback,
  type InsertAffiliateNetwork, type InsertAffiliateEarning, type InsertUserPointsHistory, type InsertPostbackAuditLog
} from "../drizzle/schema";
import { ENV } from './_core/env';
import { nanoid } from "nanoid";
import { v4 as uuidv4 } from "uuid";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try { _db = drizzle(process.env.DATABASE_URL); }
    catch (error) { console.warn("[Database] Failed to connect:", error); _db = null; }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod", "country", "ipAddress"] as const;
  textFields.forEach(field => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  });

  // Set originalCountry on first login (only if not already set)
  if (user.country && !updateSet.originalCountry) {
    values.originalCountry = user.country;
    // Don't update originalCountry on subsequent logins - only set on insert
  }

  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  // Generate referral code and public user ID on first insert
  const referralCode = nanoid(8).toUpperCase();
  values.referralCode = referralCode;
  // Generate unique public user ID like OE-A1B2C3
  const publicUserId = 'OE-' + nanoid(6).toUpperCase();
  values.userId = publicUserId;

  // On duplicate key update, don't override originalCountry if it's already set
  const finalUpdateSet = { ...updateSet };
  delete finalUpdateSet.originalCountry;

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: finalUpdateSet });
}

export async function checkIfUserExists(openId: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db.select({ id: users.id }).from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0;
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserPoints(userId: number, pointsDelta: number, xpDelta: number = 0) {
  const db = await getDb();
  if (!db) return;
  await db.update(users)
    .set({
      points: sql`points + ${pointsDelta}`,
      totalEarned: pointsDelta > 0 ? sql`totalEarned + ${pointsDelta}` : sql`totalEarned`,
      xp: sql`xp + ${xpDelta}`,
    })
    .where(eq(users.id, userId));
  // Level up check
  const user = await getUserById(userId);
  if (user && user.xp >= user.xpToNextLevel) {
    await db.update(users)
      .set({ level: sql`level + 1`, xp: sql`xp - ${user.xpToNextLevel}`, xpToNextLevel: sql`xpToNextLevel + 200` })
      .where(eq(users.id, userId));
  }
}

export async function getLeaderboard(type: 'weekly' | 'alltime', limit = 50) {
  const db = await getDb();
  if (!db) return [];
  if (type === 'alltime') {
    return db.select({ id: users.id, name: users.name, points: users.totalEarned, level: users.level, avatarUrl: users.avatarUrl })
      .from(users).orderBy(desc(users.totalEarned)).limit(limit);
  }
  // Weekly: use totalEarned as proxy (in production you'd filter by date)
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return db.select({ id: users.id, name: users.name, points: users.totalEarned, level: users.level, avatarUrl: users.avatarUrl })
    .from(users).where(gte(users.lastSignedIn, weekAgo)).orderBy(desc(users.totalEarned)).limit(limit);
}

// ─── Tasks ────────────────────────────────────────────────────
export async function getTasks(category?: string) {
  const db = await getDb();
  if (!db) return [];
  if (category && category !== 'all') {
    return db.select().from(tasks).where(and(eq(tasks.isActive, true), eq(tasks.category, category as any))).orderBy(tasks.sortOrder);
  }
  return db.select().from(tasks).where(eq(tasks.isActive, true)).orderBy(tasks.sortOrder);
}

export async function getTaskById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserTaskStatus(userId: number, taskId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(userTasks)
    .where(and(eq(userTasks.userId, userId), eq(userTasks.taskId, taskId)))
    .orderBy(desc(userTasks.createdAt)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserTasks(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(userTasks).where(eq(userTasks.userId, userId)).orderBy(desc(userTasks.createdAt)).limit(20);
}

export async function startTask(userId: number, taskId: number) {
  const db = await getDb();
  if (!db) return;
  await db.insert(userTasks).values({ userId, taskId, status: 'started' });
  
  // Record click for tracking (if tracking is enabled)
  const config = await getTrackingConfig(taskId);
  if (config?.trackingEnabled) {
    const clickId = `${taskId}-${uuidv4()}`;
    await recordOfferClick({
      taskId,
      userId,
      clickId,
      ipAddress: undefined,
      userAgent: undefined,
      country: undefined,
      referrer: undefined,
    });
  }
}

export async function completeTask(userId: number, taskId: number, proof?: { proofType?: string; proofUrl?: string; proofCode?: string }) {
  const db = await getDb();
  if (!db) return;
  const task = await getTaskById(taskId);
  if (!task) return;
  const updateData: any = { status: 'completed', pointsEarned: task.points, completedAt: new Date() };
  if (proof?.proofType) updateData.proofType = proof.proofType;
  if (proof?.proofUrl) updateData.proofUrl = proof.proofUrl;
  if (proof?.proofCode) updateData.proofCode = proof.proofCode;
  await db.update(userTasks)
    .set(updateData)
    .where(and(eq(userTasks.userId, userId), eq(userTasks.taskId, taskId)));
  await updateUserPoints(userId, task.points, task.xpReward);
  const userAfterTask = await getUserById(userId);
  await addTransaction(userId, task.points, userAfterTask?.points ?? 0, 'task_reward', `Completed: ${task.title}`);
  await createNotification(userId, 'Task Completed!', `You earned ${task.points} points for completing "${task.title}"`, 'task_complete');
  
  // Record completion for tracking (if tracking is enabled)
  const config = await getTrackingConfig(taskId);
  if (config?.trackingEnabled) {
    const completionId = `${taskId}-${userId}-${Date.now()}`;
    const completionResult = await recordOfferCompletion({
      taskId,
      userId,
      clickId: `${taskId}-${uuidv4()}`,
      completionId,
      status: 'pending',
      pointsAwarded: task.points,
      conversionValue: undefined,
      metadata: null,
    });
    
    // Create postback record for delivery
    if (completionResult && config.postbackUrl) {
      await createPostback({
        completionId: completionResult.insertId || 0,
        postbackUrl: config.postbackUrl,
        status: 'pending',
      });
    }
  }
}

// ─── Notifications ────────────────────────────────────────────
export async function getNotifications(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(50);
}

export async function createNotification(userId: number, title: string, message: string, type: any = 'system') {
  const db = await getDb();
  if (!db) return;
  await db.insert(notifications).values({ userId, title, message, type });
}

export async function markNotificationRead(notificationId: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ isRead: true }).where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
}

export async function markAllNotificationsRead(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId));
}

// ─── Daily Bonus ──────────────────────────────────────────────
export async function canClaimDailyBonus(userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const result = await db.select().from(dailyBonuses)
    .where(and(eq(dailyBonuses.userId, userId), gte(dailyBonuses.claimedAt, today))).limit(1);
  return result.length === 0;
}

export async function claimDailyBonus(userId: number, pointsWon: number, spinResult: string) {
  const db = await getDb();
  if (!db) return;
  await db.insert(dailyBonuses).values({ userId, pointsWon, spinResult });
  await updateUserPoints(userId, pointsWon, 25);
  // Update streak
  const user = await getUserById(userId);
  if (user) {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    yesterday.setHours(0, 0, 0, 0);
    const newStreak = user.lastStreakDate && user.lastStreakDate >= yesterday ? user.streak + 1 : 1;
    await db.update(users).set({ streak: newStreak, lastStreakDate: new Date() }).where(eq(users.id, userId));
  }
  const userAfterBonus = await getUserById(userId);
  await addTransaction(userId, pointsWon, userAfterBonus?.points ?? 0, 'daily_bonus', `Daily spin: ${spinResult}`);
  await createNotification(userId, 'Daily Bonus Claimed!', `You spun the wheel and won ${pointsWon} points!`, 'bonus');
}

// ─── Rewards ─────────────────────────────────────────────────
export async function getRewards(category?: string) {
  const db = await getDb();
  if (!db) return [];
  if (category && category !== 'all') {
    return db.select().from(rewards).where(and(eq(rewards.isAvailable, true), eq(rewards.category, category as any))).orderBy(rewards.sortOrder);
  }
  return db.select().from(rewards).where(eq(rewards.isAvailable, true)).orderBy(rewards.sortOrder);
}

export async function redeemReward(
  userId: number,
  rewardId: number,
  paymentDetails?: {
    paymentMethod?: 'paypal' | 'crypto' | 'gift_card' | 'other';
    paymentAddress?: string;
    paymentNote?: string;
  }
) {
  const db = await getDb();
  if (!db) throw new Error('DB unavailable');
  const reward = await db.select().from(rewards).where(eq(rewards.id, rewardId)).limit(1);
  if (!reward[0]) throw new Error('Reward not found');
  const user = await getUserById(userId);
  if (!user || user.points < reward[0].pointsCost) throw new Error('Insufficient points');
  await db.insert(redemptions).values({
    userId,
    rewardId,
    pointsSpent: reward[0].pointsCost,
    status: 'pending',
    paymentMethod: paymentDetails?.paymentMethod ?? 'other',
    paymentAddress: paymentDetails?.paymentAddress ?? null,
    paymentNote: paymentDetails?.paymentNote ?? null,
  });
  await db.update(users).set({ points: sql`points - ${reward[0].pointsCost}` }).where(eq(users.id, userId));
  const userAfterRedeem = await getUserById(userId);
  await addTransaction(userId, -reward[0].pointsCost, userAfterRedeem?.points ?? 0, 'redemption', `Redeemed: ${reward[0].name}`);
  await createNotification(userId, 'Reward Redeemed!', `Your redemption for "${reward[0].name}" is being processed.`, 'reward_redeemed');
  return reward[0];
}

export async function getRedemptions(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ redemption: redemptions, reward: rewards })
    .from(redemptions).leftJoin(rewards, eq(redemptions.rewardId, rewards.id))
    .where(eq(redemptions.userId, userId)).orderBy(desc(redemptions.createdAt)).limit(20);
}

// ─── Referrals ────────────────────────────────────────────────
export async function getReferralStats(userId: number) {
  const db = await getDb();
  if (!db) return { count: 0, earned: 0 };
  const refs = await db.select().from(referrals).where(eq(referrals.referrerId, userId));
  const earned = refs.reduce((sum, r) => sum + r.bonusEarned, 0);
  return { count: refs.length, earned };
}

export async function getReferralList(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ referral: referrals, referee: users })
    .from(referrals).leftJoin(users, eq(referrals.refereeId, users.id))
    .where(eq(referrals.referrerId, userId)).orderBy(desc(referrals.createdAt)).limit(20);
}

// ─── Achievements ─────────────────────────────────────────────
export async function getAllAchievements() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(achievements).orderBy(achievements.category, achievements.requirement);
}

export async function getUserAchievements(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ userAchievement: userAchievements, achievement: achievements })
    .from(userAchievements).leftJoin(achievements, eq(userAchievements.achievementId, achievements.id))
    .where(eq(userAchievements.userId, userId));
}

// ─── Offer Providers ─────────────────────────────────────────
export async function getOfferProviders() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(offerProviders).where(eq(offerProviders.isActive, true)).orderBy(offerProviders.sortOrder);
}

// ─── Points Ledger ────────────────────────────────────────────
export async function getLedger(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pointsTransactions)
    .where(eq(pointsTransactions.userId, userId))
    .orderBy(desc(pointsTransactions.createdAt))
    .limit(100);
}

export async function addTransaction(
  userId: number,
  amount: number,
  balanceAfter: number,
  type: 'task_reward' | 'daily_bonus' | 'redemption' | 'referral_bonus' | 'achievement' | 'bonus',
  description: string
) {
  const db = await getDb();
  if (!db) return;
  await db.insert(pointsTransactions).values({ userId, amount, balanceAfter, type, description });
}

// ─── Admin: Users ─────────────────────────────────────────────
export async function adminGetAllUsers(search?: string, limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  if (search) {
    return db.select().from(users)
      .where(sql`(name LIKE ${`%${search}%`} OR email LIKE ${`%${search}%`})`)
      .orderBy(desc(users.createdAt)).limit(limit).offset(offset);
  }
  return db.select().from(users).orderBy(desc(users.createdAt)).limit(limit).offset(offset);
}

export async function adminGetUserCount(search?: string) {
  const db = await getDb();
  if (!db) return 0;
  if (search) {
    const result = await db.select({ count: sql<number>`count(*)` }).from(users)
      .where(sql`(name LIKE ${`%${search}%`} OR email LIKE ${`%${search}%`})`);
    return Number(result[0]?.count ?? 0);
  }
  const result = await db.select({ count: sql<number>`count(*)` }).from(users);
  return Number(result[0]?.count ?? 0);
}

export async function adminUpdateUser(userId: number, data: {
  name?: string; email?: string; role?: 'user' | 'admin';
  points?: number; xp?: number; level?: number; streak?: number; isBanned?: boolean;
}) {
  const db = await getDb();
  if (!db) return;
  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.role !== undefined) updateData.role = data.role;
  if (data.points !== undefined) updateData.points = data.points;
  if (data.xp !== undefined) updateData.xp = data.xp;
  if (data.level !== undefined) updateData.level = data.level;
  if (data.streak !== undefined) updateData.streak = data.streak;
  await db.update(users).set(updateData).where(eq(users.id, userId));
}

export async function adminGetUserDetail(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const user = await getUserById(userId);
  if (!user) return null;
  const taskHistory = await db.select({ userTask: userTasks, task: tasks })
    .from(userTasks).leftJoin(tasks, eq(userTasks.taskId, tasks.id))
    .where(eq(userTasks.userId, userId)).orderBy(desc(userTasks.createdAt)).limit(20);
  const txHistory = await db.select().from(pointsTransactions)
    .where(eq(pointsTransactions.userId, userId)).orderBy(desc(pointsTransactions.createdAt)).limit(20);
  const redemptionHistory = await db.select({ redemption: redemptions, reward: rewards })
    .from(redemptions).leftJoin(rewards, eq(redemptions.rewardId, rewards.id))
    .where(eq(redemptions.userId, userId)).orderBy(desc(redemptions.createdAt)).limit(10);
  return { user, taskHistory, txHistory, redemptionHistory };
}

export async function adminAdjustUserPoints(userId: number, amount: number, reason: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ points: sql`points + ${amount}`, totalEarned: amount > 0 ? sql`totalEarned + ${amount}` : sql`totalEarned` }).where(eq(users.id, userId));
  const user = await getUserById(userId);
  await addTransaction(userId, amount, user?.points ?? 0, 'bonus', `Admin adjustment: ${reason}`);
  await createNotification(userId, 'Points Adjusted', `An admin has ${amount > 0 ? 'added' : 'removed'} ${Math.abs(amount)} points. Reason: ${reason}`, 'system');
}

// ─── Admin: Tasks ─────────────────────────────────────────────
export async function adminGetAllTasks(includeInactive = true) {
  const db = await getDb();
  if (!db) return [];
  if (includeInactive) return db.select().from(tasks).orderBy(tasks.sortOrder, desc(tasks.createdAt));
  return db.select().from(tasks).where(eq(tasks.isActive, true)).orderBy(tasks.sortOrder);
}

export async function adminCreateTask(data: {
  title: string; description?: string; category: any; offerType?: any; points: number;
  xpReward?: number; timeMinutes?: number; frequency?: any; difficulty?: any;
  imageUrl?: string; thumbnailUrl?: string; screenshots?: string; offerUrl?: string; providerName?: string; requirements?: string; disclaimer?: string;
  targetCountries?: string; targetDevices?: string;
  isActive?: boolean; isFeatured?: boolean; sortOrder?: number;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(tasks).values({ ...data, isActive: data.isActive ?? true, sortOrder: data.sortOrder ?? 0 });
}

export async function adminUpdateTask(taskId: number, data: Partial<{
  title: string; description: string; category: any; offerType: any; points: number;
  xpReward: number; timeMinutes: number; frequency: any; difficulty: any;
  imageUrl: string; thumbnailUrl: string; screenshots: string; providerName: string; requirements: string; disclaimer: string;
  targetCountries: string; targetDevices: string;
  isActive: boolean; isFeatured: boolean; isTrending: boolean; sortOrder: number;
  affiliateNetworkId: number | null; publisherPayout: number; postbackUrl: string;
}>) {
  const db = await getDb();
  if (!db) return;
  // Filter out undefined values to avoid setting columns to NULL unintentionally
  const cleanedData = Object.fromEntries(
    Object.entries(data).filter(([_, value]) => value !== undefined)
  ) as any;
  await db.update(tasks).set(cleanedData).where(eq(tasks.id, taskId));
}

export async function adminDeleteTask(taskId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(userTasks).where(eq(userTasks.taskId, taskId));
  await db.delete(tasks).where(eq(tasks.id, taskId));
}

export async function adminGetTaskStats(taskId: number) {
  const db = await getDb();
  if (!db) return { completions: 0, started: 0, pending: 0 };
  const stats = await db.select({
    status: userTasks.status,
    count: sql<number>`count(*)`
  }).from(userTasks).where(eq(userTasks.taskId, taskId)).groupBy(userTasks.status);
  const result = { completions: 0, started: 0, pending: 0, rejected: 0 };
  stats.forEach(s => {
    if (s.status === 'completed') result.completions = Number(s.count);
    else if (s.status === 'started') result.started = Number(s.count);
    else if (s.status === 'pending') result.pending = Number(s.count);
    else if (s.status === 'rejected') result.rejected = Number(s.count);
  });
  return result;
}

// ─── Admin: Rewards ───────────────────────────────────────────
export async function adminGetAllRewards() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(rewards).orderBy(rewards.sortOrder, desc(rewards.createdAt));
}

export async function adminCreateReward(data: {
  name: string; description?: string; category: any; pointsCost: number;
  imageUrl?: string; brand?: string; isAvailable?: boolean; sortOrder?: number;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(rewards).values({ ...data, isAvailable: data.isAvailable ?? true, sortOrder: data.sortOrder ?? 0 });
}

export async function adminUpdateReward(rewardId: number, data: Partial<{
  name: string; description: string; category: any; pointsCost: number;
  imageUrl: string; brand: string; isAvailable: boolean; sortOrder: number;
}>) {
  const db = await getDb();
  if (!db) return;
  await db.update(rewards).set(data as any).where(eq(rewards.id, rewardId));
}

export async function adminDeleteReward(rewardId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(rewards).where(eq(rewards.id, rewardId));
}

// ─── Admin: Achievements ──────────────────────────────────────
export async function adminGetAllAchievements() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(achievements).orderBy(achievements.category, achievements.requirement);
}

export async function adminCreateAchievement(data: {
  name: string; description?: string; icon: string; category: any;
  requirement: number; pointsBonus?: number; rarity?: any;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(achievements).values({ ...data, pointsBonus: data.pointsBonus ?? 0, rarity: data.rarity ?? 'common' });
}

export async function adminUpdateAchievement(achievementId: number, data: Partial<{
  name: string; description: string; icon: string; category: any;
  requirement: number; pointsBonus: number; rarity: any;
}>) {
  const db = await getDb();
  if (!db) return;
  await db.update(achievements).set(data as any).where(eq(achievements.id, achievementId));
}

export async function adminDeleteAchievement(achievementId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(userAchievements).where(eq(userAchievements.achievementId, achievementId));
  await db.delete(achievements).where(eq(achievements.id, achievementId));
}

// ─── Admin: Redemptions ───────────────────────────────────────
export async function adminGetAllRedemptions(status?: string, limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  const query = db.select({ redemption: redemptions, reward: rewards, user: users })
    .from(redemptions)
    .leftJoin(rewards, eq(redemptions.rewardId, rewards.id))
    .leftJoin(users, eq(redemptions.userId, users.id));
  if (status && status !== 'all') {
    return query.where(eq(redemptions.status, status as any)).orderBy(desc(redemptions.createdAt)).limit(limit).offset(offset);
  }
  return query.orderBy(desc(redemptions.createdAt)).limit(limit).offset(offset);
}

export async function adminUpdateRedemptionStatus(redemptionId: number, status: 'pending' | 'processing' | 'completed' | 'failed') {
  const db = await getDb();
  if (!db) return;
  const redemption = await db.select().from(redemptions).where(eq(redemptions.id, redemptionId)).limit(1);
  if (!redemption[0]) return;
  await db.update(redemptions).set({ status }).where(eq(redemptions.id, redemptionId));
  if (status === 'completed') {
    await createNotification(redemption[0].userId, 'Reward Sent!', 'Your reward redemption has been completed and sent to you.', 'reward_redeemed');
  } else if (status === 'failed') {
    // Refund points
    await db.update(users).set({ points: sql`points + ${redemption[0].pointsSpent}` }).where(eq(users.id, redemption[0].userId));
    const user = await getUserById(redemption[0].userId);
    await addTransaction(redemption[0].userId, redemption[0].pointsSpent, user?.points ?? 0, 'bonus', 'Refund: redemption failed');
    await createNotification(redemption[0].userId, 'Redemption Failed', 'Your redemption could not be processed. Points have been refunded.', 'system');
  }
}

// ─── Admin: Offer Providers ───────────────────────────────────
export async function adminGetAllOfferProviders() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(offerProviders).orderBy(offerProviders.sortOrder);
}

export async function adminCreateOfferProvider(data: {
  name: string; description?: string; logoUrl?: string; baseUrl?: string;
  isActive?: boolean; totalOffers?: number; avgPayout?: string; sortOrder?: number;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(offerProviders).values({ ...data, isActive: data.isActive ?? true, sortOrder: data.sortOrder ?? 0 });
}

export async function adminUpdateOfferProvider(providerId: number, data: Partial<{
  name: string; description: string; logoUrl: string; baseUrl: string;
  isActive: boolean; totalOffers: number; avgPayout: string; sortOrder: number;
}>) {
  const db = await getDb();
  if (!db) return;
  await db.update(offerProviders).set(data as any).where(eq(offerProviders.id, providerId));
}

export async function adminDeleteOfferProvider(providerId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(offerProviders).where(eq(offerProviders.id, providerId));
}

// ─── Admin: Broadcast Notifications ──────────────────────────
export async function adminBroadcastNotification(title: string, message: string, targetUserId?: number) {
  const db = await getDb();
  if (!db) return 0;
  if (targetUserId) {
    await createNotification(targetUserId, title, message, 'system');
    return 1;
  }
  const allUsers = await db.select({ id: users.id }).from(users);
  for (const user of allUsers) {
    await createNotification(user.id, title, message, 'system');
  }
  return allUsers.length;
}

// ─── Admin: Platform Settings ─────────────────────────────────
export async function adminGetSettings() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(platformSettings).orderBy(platformSettings.key);
}

export async function adminUpdateSetting(key: string, value: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(platformSettings).set({ value }).where(eq(platformSettings.key, key));
}

// ─── Category Section Order ──────────────────────────────────
export async function getCategorySectionOrder() {
  const db = await getDb();
  if (!db) return null;
  const setting = await db.select().from(platformSettings).where(eq(platformSettings.key, 'category_section_order')).limit(1);
  if (!setting || !setting[0]) return null;
  try {
    return JSON.parse(setting[0].value);
  } catch {
    return null;
  }
}

export async function updateCategorySectionOrder(order: string[]) {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(platformSettings).where(eq(platformSettings.key, 'category_section_order')).limit(1);
  if (existing && existing[0]) {
    await db.update(platformSettings).set({ value: JSON.stringify(order) }).where(eq(platformSettings.key, 'category_section_order'));
  } else {
    await db.insert(platformSettings).values({ key: 'category_section_order', value: JSON.stringify(order), description: 'Order of category sections displayed on Missions page' });
  }
}

// ─── Admin: Audit Log ─────────────────────────────────────────
export async function adminAddAuditLog(adminId: number, adminName: string, action: string, entity: string, entityId?: number, details?: Record<string, unknown>) {
  const db = await getDb();
  if (!db) return;
  await db.insert(auditLog).values({ adminId, adminName: adminName || 'Admin', action, entity, entityId, details: details ?? null });
}

export async function adminGetAuditLog(limit = 100, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(limit).offset(offset);
}

// ─── Admin: Analytics ─────────────────────────────────────────
export async function adminGetAnalytics() {
  const db = await getDb();
  if (!db) return null;
  const [totalUsers] = await db.select({ count: sql<number>`count(*)` }).from(users);
  const [totalTasks] = await db.select({ count: sql<number>`count(*)` }).from(tasks);
  const [totalCompletions] = await db.select({ count: sql<number>`count(*)` }).from(userTasks).where(eq(userTasks.status, 'completed'));
  const [totalRedemptions] = await db.select({ count: sql<number>`count(*)` }).from(redemptions);
  const [pendingRedemptions] = await db.select({ count: sql<number>`count(*)` }).from(redemptions).where(eq(redemptions.status, 'pending'));
  const [totalPointsIssued] = await db.select({ total: sql<number>`COALESCE(SUM(amount), 0)` }).from(pointsTransactions).where(gte(pointsTransactions.amount, 0));
  const [totalPointsSpent] = await db.select({ total: sql<number>`COALESCE(SUM(ABS(amount)), 0)` }).from(pointsTransactions).where(sql`amount < 0`);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [newUsersThisWeek] = await db.select({ count: sql<number>`count(*)` }).from(users).where(gte(users.createdAt, weekAgo));
  const [completionsThisWeek] = await db.select({ count: sql<number>`count(*)` }).from(userTasks).where(and(eq(userTasks.status, 'completed'), gte(userTasks.createdAt, weekAgo)));
  const topTasks = await db.select({ task: tasks, completions: sql<number>`count(${userTasks.id})` })
    .from(tasks).leftJoin(userTasks, and(eq(userTasks.taskId, tasks.id), eq(userTasks.status, 'completed')))
    .groupBy(tasks.id).orderBy(desc(sql`count(${userTasks.id})`)).limit(5);
  const topEarners = await db.select({ id: users.id, name: users.name, totalEarned: users.totalEarned, level: users.level })
    .from(users).orderBy(desc(users.totalEarned)).limit(5);
  return {
    totalUsers: Number(totalUsers?.count ?? 0),
    totalTasks: Number(totalTasks?.count ?? 0),
    totalCompletions: Number(totalCompletions?.count ?? 0),
    totalRedemptions: Number(totalRedemptions?.count ?? 0),
    pendingRedemptions: Number(pendingRedemptions?.count ?? 0),
    totalPointsIssued: Number(totalPointsIssued?.total ?? 0),
    totalPointsSpent: Number(totalPointsSpent?.total ?? 0),
    newUsersThisWeek: Number(newUsersThisWeek?.count ?? 0),
    completionsThisWeek: Number(completionsThisWeek?.count ?? 0),
    topTasks,
    topEarners,
  };
}


// ─── Geolocation & Ban System ─────────────────────────────────
export async function recordUserLogin(userId: number, ipAddress: string, country?: string) {
  const db = await getDb();
  if (!db) return;
  
  const user = await getUserById(userId);
  
  // Record login history with actual country (or NULL if lookup failed)
  await db.insert(userLoginHistory).values({ userId, ipAddress, country: country || null });
  
  // Update user's current location only if we have a valid country from geolocation
  if (user && country) {
    if (user.country !== country) {
      // Track country change
      await db.update(users).set({
        lastLoginCountry: user.country,
        country: country,
        ipAddress: ipAddress,
        lastSignedIn: new Date(),
      }).where(eq(users.id, userId));
    } else {
      // Same country, just update IP and last signed in
      await db.update(users).set({
        ipAddress: ipAddress,
        lastSignedIn: new Date(),
      }).where(eq(users.id, userId));
    }
  } else if (user) {
    // No country from geolocation, just update IP and last signed in
    await db.update(users).set({
      ipAddress: ipAddress,
      lastSignedIn: new Date(),
    }).where(eq(users.id, userId));
  }
}

export async function checkDuplicateAccounts(ipAddress: string) {
  const db = await getDb();
  if (!db) return null;
  
  // Find all users with this IP
  const usersWithIp = await db.select({ id: users.id, userId: users.userId }).from(users).where(eq(users.ipAddress, ipAddress));
  
  if (usersWithIp.length > 1) {
    // Multiple accounts found - check if alert exists
    const existingAlert = await db.select().from(duplicateAccountAlerts).where(eq(duplicateAccountAlerts.ipAddress, ipAddress)).limit(1);
    
    const userIds = usersWithIp.map(u => u.userId).filter(Boolean);
    
    if (existingAlert.length === 0) {
      // Create new alert
      await db.insert(duplicateAccountAlerts).values({
        ipAddress,
        userIds: JSON.stringify(userIds),
        accountCount: usersWithIp.length,
      });
    } else if (!existingAlert[0].isResolved) {
      // Update existing alert
      await db.update(duplicateAccountAlerts).set({
        userIds: JSON.stringify(userIds),
        accountCount: usersWithIp.length,
      }).where(eq(duplicateAccountAlerts.ipAddress, ipAddress));
    }
    
    return { ipAddress, userIds, accountCount: usersWithIp.length };
  }
  
  return null;
}

export async function banUser(userId: number, reason: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({
    isBanned: true,
    banReason: reason,
    bannedAt: new Date(),
  }).where(eq(users.id, userId));
}

export async function unbanUser(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({
    isBanned: false,
    banReason: null,
    bannedAt: null,
  }).where(eq(users.id, userId));
}

export async function adminGetUserLoginHistory(userId: number, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(userLoginHistory).where(eq(userLoginHistory.userId, userId)).orderBy(desc(userLoginHistory.loginAt)).limit(limit);
}

export async function adminGetDuplicateAlerts(resolved = false) {
  const db = await getDb();
  if (!db) return [];
  const condition = resolved ? eq(duplicateAccountAlerts.isResolved, true) : eq(duplicateAccountAlerts.isResolved, false);
  return db.select().from(duplicateAccountAlerts).where(condition).orderBy(desc(duplicateAccountAlerts.createdAt));
}

export async function adminResolveDuplicateAlert(alertId: number, adminId: number, action: 'ban' | 'ignore') {
  const db = await getDb();
  if (!db) return;
  
  const alert = await db.select().from(duplicateAccountAlerts).where(eq(duplicateAccountAlerts.id, alertId)).limit(1);
  if (alert.length === 0) return;
  
  const userIds = JSON.parse(alert[0].userIds) as string[];
  
  if (action === 'ban') {
    // Ban all but the first account
    for (let i = 1; i < userIds.length; i++) {
      const userToFind = await db.select().from(users).where(eq(users.userId, userIds[i])).limit(1);
      if (userToFind.length > 0) {
        await banUser(userToFind[0].id, 'Duplicate account detected');
      }
    }
  }
  
  await db.update(duplicateAccountAlerts).set({
    isResolved: true,
    resolvedBy: adminId,
    resolvedAt: new Date(),
  }).where(eq(duplicateAccountAlerts.id, alertId));
}

// Get users who logged in from a different country than their original
export async function adminGetLocationChangeAlerts() {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.select({
    id: users.id,
    userId: users.userId,
    name: users.name,
    email: users.email,
    originalCountry: users.originalCountry,
    currentCountry: users.country,
    lastSignedIn: users.lastSignedIn,
  }).from(users).where(
    and(
      ne(users.country, users.originalCountry),
      isNotNull(users.originalCountry),
      isNotNull(users.country),
    )
  );
  
  return result;
}


// ─── Fraud Detection ──────────────────────────────────────────
export async function checkFraudRules(userId: number, checkType: 'login' | 'redemption'): Promise<InsertFraudAlert[]> {
  const db = await getDb();
  if (!db) return [];

  const alerts: InsertFraudAlert[] = [];
  const user = await getUserById(userId);
  if (!user) return [];

  // Get all enabled fraud detection rules
  const rules = await db.select().from(fraudDetectionRules).where(eq(fraudDetectionRules.enabled, true));

  for (const rule of rules) {
    if (!rule.enabled) continue;

    // Location change detection
    if (rule.ruleType === 'location_change' && user.country && user.originalCountry && user.country !== user.originalCountry) {
      // Check if country is whitelisted
      if (rule.whitelistCountries) {
        const whitelist = JSON.parse(rule.whitelistCountries || '[]') as string[];
        if (whitelist.includes(user.country)) continue;
      }

      // Check if country is blacklisted
      if (rule.blacklistCountries) {
        const blacklist = JSON.parse(rule.blacklistCountries || '[]') as string[];
        if (blacklist.includes(user.country)) {
          alerts.push({
            userId,
            ruleId: rule.id,
            alertType: 'location_change',
            severity: 'high',
            description: `User logged in from ${user.country}, different from original ${user.originalCountry}`,
            metadata: JSON.stringify({ originalCountry: user.originalCountry, currentCountry: user.country }),
            action: rule.action,
            isResolved: false,
          });
        }
      } else if (rule.blockLocationChange) {
        alerts.push({
          userId,
          ruleId: rule.id,
          alertType: 'location_change',
          severity: 'medium',
          description: `User logged in from ${user.country}, different from original ${user.originalCountry}`,
          metadata: JSON.stringify({ originalCountry: user.originalCountry, currentCountry: user.country }),
          action: rule.action,
          isResolved: false,
        });
      }
    }

    // Multiple countries detection
    if (rule.ruleType === 'multiple_countries') {
      const now = new Date();
      const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      if (rule.maxCountriesPerDay) {
        const countriesPerDay = await db.select({
          country: userLoginHistory.country
        }).from(userLoginHistory)
          .where(and(eq(userLoginHistory.userId, userId), gte(userLoginHistory.loginAt, dayAgo)))
          .groupBy(userLoginHistory.country);

        if (countriesPerDay.length > rule.maxCountriesPerDay) {
          alerts.push({
            userId,
            ruleId: rule.id,
            alertType: 'multiple_countries',
            severity: 'high',
            description: `User logged in from ${countriesPerDay.length} different countries in 24 hours (max: ${rule.maxCountriesPerDay})`,
            metadata: JSON.stringify({ countriesCount: countriesPerDay.length, maxAllowed: rule.maxCountriesPerDay }),
            action: rule.action,
            isResolved: false,
          });
        }
      }

      if (rule.maxCountriesPerWeek) {
        const countriesPerWeek = await db.select({
          country: userLoginHistory.country
        }).from(userLoginHistory)
          .where(and(eq(userLoginHistory.userId, userId), gte(userLoginHistory.loginAt, weekAgo)))
          .groupBy(userLoginHistory.country);

        if (countriesPerWeek.length > rule.maxCountriesPerWeek) {
          alerts.push({
            userId,
            ruleId: rule.id,
            alertType: 'multiple_countries',
            severity: 'medium',
            description: `User logged in from ${countriesPerWeek.length} different countries in 7 days (max: ${rule.maxCountriesPerWeek})`,
            metadata: JSON.stringify({ countriesCount: countriesPerWeek.length, maxAllowed: rule.maxCountriesPerWeek }),
            action: rule.action,
            isResolved: false,
          });
        }
      }
    }

    // Rapid redemption detection
    if (rule.ruleType === 'rapid_redemption' && checkType === 'redemption') {
      const now = new Date();
      const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      if (rule.maxRedemptionsPerHour) {
        const redemptionsPerHour = await db.select({ id: redemptions.id })
          .from(redemptions)
          .where(and(eq(redemptions.userId, userId), gte(redemptions.createdAt, hourAgo)));

        if (redemptionsPerHour.length >= rule.maxRedemptionsPerHour) {
          alerts.push({
            userId,
            ruleId: rule.id,
            alertType: 'rapid_redemption',
            severity: 'high',
            description: `User attempted ${redemptionsPerHour.length} redemptions in 1 hour (max: ${rule.maxRedemptionsPerHour})`,
            metadata: JSON.stringify({ redemptionsCount: redemptionsPerHour.length, maxAllowed: rule.maxRedemptionsPerHour }),
            action: rule.action,
            isResolved: false,
          });
        }
      }

      if (rule.maxRedemptionsPerDay) {
        const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const redemptionsPerDay = await db.select({ id: redemptions.id })
          .from(redemptions)
          .where(and(eq(redemptions.userId, userId), gte(redemptions.createdAt, dayAgo)));

        if (redemptionsPerDay.length >= rule.maxRedemptionsPerDay) {
          alerts.push({
            userId,
            ruleId: rule.id,
            alertType: 'rapid_redemption',
            severity: 'medium',
            description: `User attempted ${redemptionsPerDay.length} redemptions in 24 hours (max: ${rule.maxRedemptionsPerDay})`,
            metadata: JSON.stringify({ redemptionsCount: redemptionsPerDay.length, maxAllowed: rule.maxRedemptionsPerDay }),
            action: rule.action,
            isResolved: false,
          });
        }
      }
    }

    // Duplicate IP detection
    if (rule.ruleType === 'duplicate_ip' && rule.blockDuplicateIp && user.ipAddress) {
      const usersWithSameIp = await db.select({ id: users.id })
        .from(users)
        .where(and(eq(users.ipAddress, user.ipAddress), ne(users.id, userId)));

      if (usersWithSameIp.length > 0) {
        alerts.push({
          userId,
          ruleId: rule.id,
          alertType: 'duplicate_ip',
          severity: 'critical',
          description: `User IP ${user.ipAddress} is shared with ${usersWithSameIp.length} other account(s)`,
          metadata: JSON.stringify({ sharedIpCount: usersWithSameIp.length, ipAddress: user.ipAddress }),
          action: rule.action,
          isResolved: false,
        });
      }
    }
  }

  // Save all alerts to database
  if (alerts.length > 0) {
    await db.insert(fraudAlerts).values(alerts);
  }

  return alerts;
}

export async function getFraudAlerts(limit: number = 50) {
  const db = await getDb();
  if (!db) return [];

  return db.select({
    id: fraudAlerts.id,
    userId: fraudAlerts.userId,
    alertType: fraudAlerts.alertType,
    severity: fraudAlerts.severity,
    description: fraudAlerts.description,
    action: fraudAlerts.action,
    isResolved: fraudAlerts.isResolved,
    createdAt: fraudAlerts.createdAt,
    user: {
      id: users.id,
      name: users.name,
      email: users.email,
      country: users.country,
      originalCountry: users.originalCountry,
    }
  }).from(fraudAlerts)
    .innerJoin(users, eq(fraudAlerts.userId, users.id))
    .where(eq(fraudAlerts.isResolved, false))
    .orderBy(desc(fraudAlerts.createdAt))
    .limit(limit);
}

export async function resolveFraudAlert(alertId: number, resolvedBy: number) {
  const db = await getDb();
  if (!db) return;

  await db.update(fraudAlerts)
    .set({ isResolved: true, resolvedBy, resolvedAt: new Date() })
    .where(eq(fraudAlerts.id, alertId));
}

export async function createFraudRule(rule: any) {
  const db = await getDb();
  if (!db) return;

  await db.insert(fraudDetectionRules).values({
    name: rule.name,
    description: rule.description,
    ruleType: rule.ruleType,
    enabled: rule.enabled ?? true,
    maxCountriesPerDay: rule.maxCountriesPerDay,
    maxCountriesPerWeek: rule.maxCountriesPerWeek,
    blockLocationChange: rule.blockLocationChange ?? false,
    maxRedemptionsPerDay: rule.maxRedemptionsPerDay,
    maxRedemptionsPerHour: rule.maxRedemptionsPerHour,
    blockDuplicateIp: rule.blockDuplicateIp ?? false,
    action: rule.action ?? 'alert',
    whitelistCountries: rule.whitelistCountries ? JSON.stringify(rule.whitelistCountries) : null,
    blacklistCountries: rule.blacklistCountries ? JSON.stringify(rule.blacklistCountries) : null,
  });
}

export async function updateFraudRule(ruleId: number, rule: any) {
  const db = await getDb();
  if (!db) return;

  await db.update(fraudDetectionRules)
    .set({
      name: rule.name,
      description: rule.description,
      enabled: rule.enabled,
      maxCountriesPerDay: rule.maxCountriesPerDay,
      maxCountriesPerWeek: rule.maxCountriesPerWeek,
      blockLocationChange: rule.blockLocationChange,
      maxRedemptionsPerDay: rule.maxRedemptionsPerDay,
      maxRedemptionsPerHour: rule.maxRedemptionsPerHour,
      blockDuplicateIp: rule.blockDuplicateIp,
      action: rule.action,
      whitelistCountries: rule.whitelistCountries ? JSON.stringify(rule.whitelistCountries) : null,
      blacklistCountries: rule.blacklistCountries ? JSON.stringify(rule.blacklistCountries) : null,
    })
    .where(eq(fraudDetectionRules.id, ruleId));
}

export async function getFraudRules() {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(fraudDetectionRules).orderBy(desc(fraudDetectionRules.createdAt));
}

export async function deleteFraudRule(ruleId: number) {
  const db = await getDb();
  if (!db) return;

  await db.delete(fraudDetectionRules).where(eq(fraudDetectionRules.id, ruleId));
}


// ─── Offer Tracking ───────────────────────────────────────────
export async function createOrUpdateTrackingConfig(taskId: number, data: {
  postbackUrl?: string;
  clickIdFormat?: string;
  trackingEnabled?: boolean;
}) {
  const db = await getDb();
  if (!db) return null;
  const existing = await db.select().from(offerTrackingConfig).where(eq(offerTrackingConfig.taskId, taskId)).limit(1);
  if (existing.length > 0) {
    await db.update(offerTrackingConfig).set(data).where(eq(offerTrackingConfig.taskId, taskId));
  } else {
    await db.insert(offerTrackingConfig).values({ taskId, ...data });
  }
  // Return the updated config
  const updated = await db.select().from(offerTrackingConfig).where(eq(offerTrackingConfig.taskId, taskId)).limit(1);
  return updated.length > 0 ? updated[0] : null;
}

export async function getTrackingConfig(taskId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(offerTrackingConfig).where(eq(offerTrackingConfig.taskId, taskId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function recordOfferClick(data: InsertOfferClick) {
  const db = await getDb();
  if (!db) return null;
  const clickId = data.clickId || `${data.taskId}-${uuidv4()}`;
  const insertData = { ...data, clickId };
  await db.insert(offerClicks).values(insertData);
  return clickId;
}

export async function getOfferClicks(taskId: number, limit = 100, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(offerClicks).where(eq(offerClicks.taskId, taskId)).orderBy(desc(offerClicks.clickedAt)).limit(limit).offset(offset);
}

export async function recordOfferCompletion(data: InsertOfferCompletion) {
  const db = await getDb();
  if (!db) return null;
  const completionId = data.completionId || `${data.taskId}-${uuidv4()}`;
  const insertData = { ...data, completionId };
  const result = await db.insert(offerCompletions).values(insertData);
  return { completionId, insertId: (result as any).insertId };
}

export async function getOfferCompletions(taskId: number, limit = 100, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(offerCompletions).where(eq(offerCompletions.taskId, taskId)).orderBy(desc(offerCompletions.completedAt)).limit(limit).offset(offset);
}

export async function updateOfferCompletionStatus(completionId: number, status: 'pending' | 'approved' | 'rejected' | 'duplicate') {
  const db = await getDb();
  if (!db) return;
  await db.update(offerCompletions).set({ status }).where(eq(offerCompletions.id, completionId));
}

export async function createPostback(data: InsertOfferPostback) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(offerPostbacks).values(data);
  return result;
}

export async function getPendingPostbacks(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  return db.select().from(offerPostbacks)
    .where(and(
      eq(offerPostbacks.status, 'pending'),
      sql`(${offerPostbacks.nextRetryAt} IS NULL OR ${offerPostbacks.nextRetryAt} <= ${now})`
    ))
    .orderBy(offerPostbacks.createdAt)
    .limit(limit);
}

export async function updatePostbackStatus(postbackId: number, data: {
  status: 'pending' | 'sent' | 'failed' | 'success';
  httpStatus?: number;
  responseBody?: string;
  attemptCount?: number;
  lastAttemptAt?: Date;
  sentAt?: Date;
  nextRetryAt?: Date;
}) {
  const db = await getDb();
  if (!db) return;
  await db.update(offerPostbacks).set(data).where(eq(offerPostbacks.id, postbackId));
}

export async function getTrackingStats(taskId: number) {
  const db = await getDb();
  if (!db) return { clicks: 0, completions: 0, conversions: 0, conversionRate: 0 };
  
  const [clickStats] = await db.select({ count: sql<number>`count(*)` }).from(offerClicks).where(eq(offerClicks.taskId, taskId));
  const [completionStats] = await db.select({ count: sql<number>`count(*)` }).from(offerCompletions).where(eq(offerCompletions.taskId, taskId));
  const [approvedStats] = await db.select({ count: sql<number>`count(*)` }).from(offerCompletions)
    .where(and(eq(offerCompletions.taskId, taskId), eq(offerCompletions.status, 'approved')));
  
  const clicks = Number(clickStats?.count ?? 0);
  const completions = Number(completionStats?.count ?? 0);
  const conversions = Number(approvedStats?.count ?? 0);
  const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 0;
  
  return { clicks, completions, conversions, conversionRate };
}

export async function getPostbackStats(taskId: number) {
  const db = await getDb();
  if (!db) return { total: 0, sent: 0, failed: 0, success: 0, pending: 0 };
  
  const postbacks = await db.select({ status: offerPostbacks.status, count: sql<number>`count(*)` })
    .from(offerPostbacks)
    .leftJoin(offerCompletions, eq(offerPostbacks.completionId, offerCompletions.id))
    .where(eq(offerCompletions.taskId, taskId))
    .groupBy(offerPostbacks.status);
  
  const result = { total: 0, sent: 0, failed: 0, success: 0, pending: 0 };
  postbacks.forEach(p => {
    const count = Number(p.count ?? 0);
    result.total += count;
    if (p.status === 'sent') result.sent = count;
    else if (p.status === 'failed') result.failed = count;
    else if (p.status === 'success') result.success = count;
    else if (p.status === 'pending') result.pending = count;
  });
  
  return result;
}


// ─── Affiliate Networks ────────────────────────────────────────
export async function createAffiliateNetwork(data: InsertAffiliateNetwork) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  
  const result = await db.insert(affiliateNetworks).values(data);
  return result;
}

export async function updateAffiliateNetwork(id: number, data: Partial<InsertAffiliateNetwork>) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  
  return await db.update(affiliateNetworks).set(data).where(eq(affiliateNetworks.id, id));
}

export async function deleteAffiliateNetwork(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  
  return await db.delete(affiliateNetworks).where(eq(affiliateNetworks.id, id));
}

export async function getAffiliateNetworks() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(affiliateNetworks).where(eq(affiliateNetworks.isActive, true));
}

export async function getAffiliateNetworkById(id: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(affiliateNetworks).where(eq(affiliateNetworks.id, id)).limit(1);
  return result[0] || null;
}

// ─── Affiliate Earnings ────────────────────────────────────────
export async function recordAffiliateEarning(data: InsertAffiliateEarning) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  
  const result = await db.insert(affiliateEarnings).values(data);
  return result;
}

export async function updateAffiliateEarning(id: number, data: Partial<InsertAffiliateEarning>) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  
  return await db.update(affiliateEarnings).set(data).where(eq(affiliateEarnings.id, id));
}

export async function getEarningsByNetwork(networkId: number, startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [eq(affiliateEarnings.affiliateNetworkId, networkId)];
  if (startDate) conditions.push(gte(affiliateEarnings.earnedAt, startDate));
  if (endDate) conditions.push(lte(affiliateEarnings.earnedAt, endDate));
  
  return await db.select().from(affiliateEarnings).where(and(...conditions));
}

export async function getEarningStats(networkId?: number) {
  const db = await getDb();
  if (!db) return { pending: 0, approved: 0, rejected: 0, total: 0 };
  
  const conditions = networkId ? [eq(affiliateEarnings.affiliateNetworkId, networkId)] : [];
  
  const results = await db.select({
    status: affiliateEarnings.status,
    count: sql<number>`COUNT(*)`,
    total: sql<number>`SUM(CAST(publisherPayout AS DECIMAL(10,2)))`
  }).from(affiliateEarnings)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .groupBy(affiliateEarnings.status);
  
  const stats = {
    pending: 0,
    approved: 0,
    rejected: 0,
    total: 0,
    pendingAmount: 0,
    approvedAmount: 0,
    rejectedAmount: 0
  };
  
  results.forEach(r => {
    const count = Number(r.count ?? 0);
    const amount = Number(r.total ?? 0);
    stats.total += count;
    if (r.status === 'pending') { stats.pending = count; stats.pendingAmount = amount; }
    else if (r.status === 'approved') { stats.approved = count; stats.approvedAmount = amount; }
    else if (r.status === 'rejected') { stats.rejected = count; stats.rejectedAmount = amount; }
  });
  
  return stats;
}

// ─── User Points History ────────────────────────────────────────
export async function recordUserPoints(data: InsertUserPointsHistory) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  
  const result = await db.insert(userPointsHistory).values(data);
  return result;
}

export async function updateUserPointsStatus(id: number, status: 'pending' | 'confirmed', confirmedAt?: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  
  const updateData: any = { pointsStatus: status };
  if (confirmedAt) updateData.confirmedAt = confirmedAt;
  
  return await db.update(userPointsHistory).set(updateData).where(eq(userPointsHistory.id, id));
}

export async function getUserPendingPoints(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(userPointsHistory)
    .where(and(eq(userPointsHistory.userId, userId), eq(userPointsHistory.pointsStatus, 'pending')));
}

export async function getUserLockedPoints(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(userPointsHistory)
    .where(and(eq(userPointsHistory.userId, userId), eq(userPointsHistory.isLockedForCashout, true)));
}

// ─── Fraud Detection ────────────────────────────────────────────
export async function flagUserAsSuspicious(userId: number, reason: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  
  return await db.update(users).set({
    isSuspicious: true,
    suspiciousReason: reason,
    flaggedAt: new Date()
  }).where(eq(users.id, userId));
}

export async function unflagUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  
  return await db.update(users).set({
    isSuspicious: false,
    suspiciousReason: null,
    flaggedAt: null
  }).where(eq(users.id, userId));
}

export async function getSuspiciousUsers() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(users).where(eq(users.isSuspicious, true));
}

export async function checkIfUserSuspicious(userId: number) {
  const db = await getDb();
  if (!db) return false;
  
  const result = await db.select({ isSuspicious: users.isSuspicious })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  
  return result[0]?.isSuspicious ?? false;
}


// ═══════════════════════════════════════════════════════════════════════════════
// Fraud Flagging System - Auto-flag users with rejected offers
// ═══════════════════════════════════════════════════════════════════════════════

export async function getFlaggedUsers() {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  
  const flagged = await db.select().from(users).where(eq(users.isSuspicious, true));
  return flagged;
}

export async function getFlaggedUserDetail(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  
  const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user.length) return null;
  
  const rejected = await db.select().from(offerCompletions)
    .where(eq(offerCompletions.userId, userId))
    .orderBy(desc(offerCompletions.createdAt));
  
  return {
    user: user[0],
    rejectedCompletions: rejected.filter(c => c.status === 'rejected'),
  };
}

export async function handleOfferRejection(completionId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  
  const completion = await db.select().from(offerCompletions)
    .where(eq(offerCompletions.completionId, completionId))
    .limit(1);
  
  if (!completion.length) throw new Error("Completion not found");
  
  const comp = completion[0];
  
  await db.update(offerCompletions).set({
    status: 'rejected',
  }).where(eq(offerCompletions.completionId, completionId));
  
  await flagUserAsSuspicious(
    comp.userId,
    `Offer completion rejected by affiliate network (Offer ID: ${comp.taskId})`
  );
  
  const pointsRecord = await db.select().from(userPointsHistory)
    .where(eq(userPointsHistory.completionId, completionId))
    .limit(1);
  
  if (pointsRecord.length) {
    await db.update(userPointsHistory).set({
      pointsStatus: 'confirmed',
      isLockedForCashout: true,
    }).where(eq(userPointsHistory.id, pointsRecord[0].id));
  }
  
  return { success: true, userId: comp.userId };
}


// ─── Postback Audit Logging ────────────────────────────────────────────────────
export async function logPostbackAudit(input: InsertPostbackAuditLog): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.insert(postbackAuditLogs).values(input);
}

export async function getPostbackAuditLogs(
  networkId?: number,
  status?: string,
  clickId?: string,
  limit: number = 100,
  offset: number = 0
) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [];
  if (networkId) conditions.push(eq(postbackAuditLogs.affiliateNetworkId, networkId));
  if (status) conditions.push(eq(postbackAuditLogs.extractedStatus, status as any));
  if (clickId) conditions.push(sql`JSON_EXTRACT(${postbackAuditLogs.parsedData}, '$.click_id') = ${clickId}`);
  
  let query: any = db.select().from(postbackAuditLogs);
  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }
  
  return await query.orderBy(desc(postbackAuditLogs.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function getPostbackAuditStats() {
  const db = await getDb();
  if (!db) return {
    totalPostbacks: 0,
    successfulPostbacks: 0,
    failedPostbacks: 0,
    signatureValidCount: 0,
  };
  
  const [total, successful, failed, signatureValid] = await Promise.all([
    db.select({ count: sql`COUNT(*)` }).from(postbackAuditLogs),
    db.select({ count: sql`COUNT(*)` }).from(postbackAuditLogs)
      .where(eq(postbackAuditLogs.processingStatus, 'success')),
    db.select({ count: sql`COUNT(*)` }).from(postbackAuditLogs)
      .where(eq(postbackAuditLogs.processingStatus, 'failed')),
    db.select({ count: sql`COUNT(*)` }).from(postbackAuditLogs)
      .where(eq(postbackAuditLogs.signatureValid, true)),
  ]);
  
  return {
    totalPostbacks: Number(total[0]?.count || 0),
    successfulPostbacks: Number(successful[0]?.count || 0),
    failedPostbacks: Number(failed[0]?.count || 0),
    signatureValidCount: Number(signatureValid[0]?.count || 0),
  };
}

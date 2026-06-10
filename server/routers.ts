import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router, adminProcedure } from "./_core/trpc";
import {
  canClaimDailyBonus, claimDailyBonus, completeTask, getAllAchievements,
  getDb, getLedger, getLeaderboard, getNotifications, getOfferProviders, getRedemptions,
  getReferralList, getReferralStats, getRewards, getTaskById, getTasks,
  getUserAchievements, getUserById, getUserTaskStatus, getUserTasks, getUserPendingPoints,
  markAllNotificationsRead, markNotificationRead, redeemReward, startTask,
  updateUserPoints, upsertUser,
  // Admin helpers
  adminGetAllUsers, adminGetUserCount, adminUpdateUser, adminGetUserDetail, adminAdjustUserPoints,
  adminGetAllTasks, adminCreateTask, adminUpdateTask, adminDeleteTask, adminGetTaskStats,
  adminGetAllRewards, adminCreateReward, adminUpdateReward, adminDeleteReward,
  adminGetAllAchievements, adminCreateAchievement, adminUpdateAchievement, adminDeleteAchievement,
  adminGetAllRedemptions, adminUpdateRedemptionStatus,
  adminGetAllOfferProviders, adminCreateOfferProvider, adminUpdateOfferProvider, adminDeleteOfferProvider,
  adminBroadcastNotification, adminGetSettings, adminUpdateSetting,
  adminAddAuditLog, adminGetAuditLog, adminGetAnalytics,
  getCategorySectionOrder, updateCategorySectionOrder,
  // Geolocation & Ban
  recordUserLogin, checkDuplicateAccounts, banUser, unbanUser, adminGetUserLoginHistory, adminGetDuplicateAlerts, adminResolveDuplicateAlert, adminGetLocationChangeAlerts,
  // Fraud Detection
  checkFraudRules, getFraudAlerts, resolveFraudAlert, createFraudRule, updateFraudRule, getFraudRules, deleteFraudRule,
  // Tracking
  createOrUpdateTrackingConfig, getTrackingConfig, recordOfferClick, getOfferClicks, recordOfferCompletion, getOfferCompletions, updateOfferCompletionStatus, createPostback, getPendingPostbacks, updatePostbackStatus, getTrackingStats, getPostbackStats,
  // Affiliate Networks
  logPostbackAudit,
  getAffiliateNetworks,
  getPostbackAuditLogs,
  getPostbackAuditStats,
} from "./db";
import { users, notifications, affiliateNetworks } from "../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { trackingRouter } from './routers/tracking';
import { postbackRetryRouter } from './routers/postbackRetry';
import { networksRouter } from "./routers/networks";
import { rewardsRouter } from "./routers/rewards";
import { fraudRouter } from "./routers/fraud";
import { earningsStatementRouter } from "./routers/earningsStatement";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieValue = `${COOKIE_NAME}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 UTC; HttpOnly; Secure; SameSite=None`;
      ctx.res.setHeader('Set-Cookie', cookieValue);
      return { success: true } as const;
    }),
  }),

  // ─── User Profile ──────────────────────────────────────────
  user: router({
    getProfile: protectedProcedure.query(async ({ ctx }) => {
      const user = await getUserById(ctx.user.id);
      if (!user) throw new TRPCError({ code: 'NOT_FOUND' });
      return user;
    }),
    updateProfile: protectedProcedure
      .input(z.object({ name: z.string().min(1).max(50).optional(), avatarUrl: z.string().url().optional() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        await db.update(users).set(input).where(eq(users.id, ctx.user.id));
        return { success: true };
      }),
    getStats: protectedProcedure.query(async ({ ctx }) => {
      const user = await getUserById(ctx.user.id);
      if (!user) throw new TRPCError({ code: 'NOT_FOUND' });
      const completedTasks = await getUserTasks(ctx.user.id);
      const completed = completedTasks.filter(t => t.status === 'completed').length;
      // Rank by totalEarned
      const db = await getDb();
      let rank = 1;
      if (db) {
        const allUsers = await db.select({ id: users.id, totalEarned: users.totalEarned })
          .from(users).orderBy(desc(users.totalEarned));
        rank = allUsers.findIndex(u => u.id === ctx.user.id) + 1 || 1;
      }
      return { ...user, completedTasks: completed, rank };
    }),
    getLoginHistory: protectedProcedure
      .input(z.object({ limit: z.number().default(10) }))
      .query(async ({ ctx, input }) => {
        return adminGetUserLoginHistory(ctx.user.id, input.limit);
      }),
  }),

  // ─── Tasks / Missions ──────────────────────────────────────
  tasks: router({
    list: publicProcedure
      .input(z.object({ category: z.string().optional(), country: z.string().optional() }))
      .query(async ({ input }) => {
        let tasks = await getTasks(input.category);
        if (input.country) {
          tasks = tasks.filter(task => {
            if (!task.targetCountries) return true;
            try {
              const countries = JSON.parse(task.targetCountries);
              return countries.includes(input.country);
            } catch {
              return true;
            }
          });
        }
        return tasks;
      }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const task = await getTaskById(input.id);
        if (!task) throw new TRPCError({ code: 'NOT_FOUND' });
        return task;
      }),

    getMyStatus: protectedProcedure
      .input(z.object({ taskId: z.number() }))
      .query(async ({ ctx, input }) => getUserTaskStatus(ctx.user.id, input.taskId)),

    start: protectedProcedure
      .input(z.object({ taskId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await startTask(ctx.user.id, input.taskId);
        return { success: true };
      }),

    complete: protectedProcedure
      .input(z.object({
        taskId: z.number(),
        proofType: z.enum(['screenshot', 'code', 'none']).default('none'),
        proofUrl: z.string().url().optional(),
        proofCode: z.string().max(255).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await completeTask(ctx.user.id, input.taskId, {
          proofType: input.proofType,
          proofUrl: input.proofUrl,
          proofCode: input.proofCode,
        });
        return { success: true };
      }),

    myHistory: protectedProcedure.query(async ({ ctx }) => getUserTasks(ctx.user.id)),
  }),

  // ─── Notifications ─────────────────────────────────────────
  notifications: router({
    list: protectedProcedure.query(async ({ ctx }) => getNotifications(ctx.user.id)),

    markRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await markNotificationRead(input.id, ctx.user.id);
        return { success: true };
      }),

    markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
      await markAllNotificationsRead(ctx.user.id);
      return { success: true };
    }),
  }),

  // ─── Daily Bonus ───────────────────────────────────────────
  dailyBonus: router({
    canClaim: protectedProcedure.query(async ({ ctx }) => ({
      canClaim: await canClaimDailyBonus(ctx.user.id)
    })),

    claim: protectedProcedure
      .input(z.object({ pointsWon: z.number(), spinResult: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const eligible = await canClaimDailyBonus(ctx.user.id);
        if (!eligible) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Already claimed today' });
        await claimDailyBonus(ctx.user.id, input.pointsWon, input.spinResult);
        return { success: true, pointsWon: input.pointsWon };
      }),
  }),

  // ─── Leaderboard ───────────────────────────────────────────
  leaderboard: router({
    get: publicProcedure
      .input(z.object({ type: z.enum(['weekly', 'alltime']).default('alltime') }))
      .query(async ({ input }) => getLeaderboard(input.type)),
  }),

  // ─── Rewards Shop ──────────────────────────────────────────
  rewards: router({
    getPendingPoints: protectedProcedure
      .query(async ({ ctx }) => {
        const pending = await getUserPendingPoints(ctx.user.id);
        const totalPending = pending.reduce((sum: number, p: any) => sum + (p.pointsAmount || 0), 0);
        const lockedPending = pending.filter((p: any) => p.isLockedForCashout).reduce((sum: number, p: any) => sum + (p.pointsAmount || 0), 0);
        return {
          totalPending,
          lockedPending,
          unlockedPending: totalPending - lockedPending,
          items: pending,
        };
      }),

    list: publicProcedure
      .input(z.object({ category: z.string().optional() }))
      .query(async ({ input }) => getRewards(input.category)),

    redeem: protectedProcedure
      .input(z.object({
        rewardId: z.number(),
        paymentMethod: z.enum(['paypal', 'crypto', 'gift_card', 'other']).optional(),
        paymentAddress: z.string().max(500).optional(),
        paymentNote: z.string().max(500).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        try {
          const reward = await redeemReward(ctx.user.id, input.rewardId, {
            paymentMethod: input.paymentMethod,
            paymentAddress: input.paymentAddress,
            paymentNote: input.paymentNote,
          });
          return { success: true, reward };
        } catch (e: any) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: e.message });
        }
      }),

    myRedemptions: protectedProcedure.query(async ({ ctx }) => getRedemptions(ctx.user.id)),
  }),

  // ─── Referrals ─────────────────────────────────────────────
  referrals: router({
    getMyCode: protectedProcedure.query(async ({ ctx }) => {
      const user = await getUserById(ctx.user.id);
      return { referralCode: user?.referralCode ?? null };
    }),

    getStats: protectedProcedure.query(async ({ ctx }) => getReferralStats(ctx.user.id)),

    getList: protectedProcedure.query(async ({ ctx }) => getReferralList(ctx.user.id)),
  }),

  // ─── Achievements ──────────────────────────────────────────
  achievements: router({
    list: publicProcedure.query(() => getAllAchievements()),

    mine: protectedProcedure.query(async ({ ctx }) => getUserAchievements(ctx.user.id)),
  }),

  // ─── Offer Providers ───────────────────────────────────────
  offerWalls: router({
    list: publicProcedure.query(() => getOfferProviders()),
  }),

  // ─── Points Ledger ─────────────────────────────────────────
  ledger: router({
    list: protectedProcedure.query(async ({ ctx }) => getLedger(ctx.user.id)),
  }),

  earningsStatement: earningsStatementRouter,

  // ─── Admin Panel ───────────────────────────────────────────
      tracking: trackingRouter,
      postbackRetry: postbackRetryRouter,

  admin: router({
    networks: router(networksRouter),
    fraud: fraudRouter,
    // Guard: all admin procedures check role
    analytics: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
      return adminGetAnalytics();
    }),

    // Users
    users: router({
      list: protectedProcedure
        .input(z.object({ search: z.string().optional(), limit: z.number().default(50), offset: z.number().default(0) }))
        .query(async ({ ctx, input }) => {
          if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
          const [list, total] = await Promise.all([
            adminGetAllUsers(input.search, input.limit, input.offset),
            adminGetUserCount(input.search),
          ]);
          return { list, total };
        }),

      getDetail: protectedProcedure
        .input(z.object({ userId: z.number() }))
        .query(async ({ ctx, input }) => {
          if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
          const detail = await adminGetUserDetail(input.userId);
          if (!detail) throw new TRPCError({ code: 'NOT_FOUND' });
          return detail;
        }),

      update: protectedProcedure
        .input(z.object({
          userId: z.number(),
          name: z.string().optional(),
          email: z.string().optional(),
          role: z.enum(['user', 'admin']).optional(),
          points: z.number().optional(),
          xp: z.number().optional(),
          level: z.number().optional(),
          streak: z.number().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
          if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
          const { userId, ...data } = input;
          await adminUpdateUser(userId, data);
          await adminAddAuditLog(ctx.user.id, ctx.user.name ?? 'Admin', 'update_user', 'user', userId, data);
          return { success: true };
        }),

      adjustPoints: protectedProcedure
        .input(z.object({ userId: z.number(), amount: z.number(), reason: z.string() }))
        .mutation(async ({ ctx, input }) => {
          if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
          await adminAdjustUserPoints(input.userId, input.amount, input.reason);
          await adminAddAuditLog(ctx.user.id, ctx.user.name ?? 'Admin', 'adjust_points', 'user', input.userId, { amount: input.amount, reason: input.reason });
          return { success: true };
        }),

      ban: protectedProcedure
        .input(z.object({ userId: z.number(), reason: z.string() }))
        .mutation(async ({ ctx, input }) => {
          if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
          await banUser(input.userId, input.reason);
          await adminAddAuditLog(ctx.user.id, ctx.user.name ?? 'Admin', 'ban_user', 'user', input.userId, { reason: input.reason });
          return { success: true };
        }),

      unban: protectedProcedure
        .input(z.object({ userId: z.number() }))
        .mutation(async ({ ctx, input }) => {
          if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
          await unbanUser(input.userId);
          await adminAddAuditLog(ctx.user.id, ctx.user.name ?? 'Admin', 'unban_user', 'user', input.userId, {});
          return { success: true };
        }),

      getLoginHistory: protectedProcedure
        .input(z.object({ userId: z.number(), limit: z.number().default(20) }))
        .query(async ({ ctx, input }) => {
          if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
          return adminGetUserLoginHistory(input.userId, input.limit);
        }),
      getLocationChangeAlerts: protectedProcedure
        .query(async ({ ctx }) => {
          if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
          return adminGetLocationChangeAlerts();
        }),
    }),


    // Duplicate Accounts
    duplicateAccounts: router({
      list: protectedProcedure
        .input(z.object({ resolved: z.boolean().default(false) }))
        .query(async ({ ctx, input }) => {
          if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
          return adminGetDuplicateAlerts(input.resolved);
        }),

      resolve: protectedProcedure
        .input(z.object({ alertId: z.number(), action: z.enum(['ban', 'ignore']) }))
        .mutation(async ({ ctx, input }) => {
          if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
          await adminResolveDuplicateAlert(input.alertId, ctx.user.id, input.action);
          await adminAddAuditLog(ctx.user.id, ctx.user.name ?? 'Admin', 'resolve_duplicate_alert', 'duplicate_account_alert', input.alertId, { action: input.action });
          return { success: true };
        }),
    }),

    // Tasks
    tasks: router({
      list: protectedProcedure.query(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        return adminGetAllTasks();
      }),

      getStats: protectedProcedure
        .input(z.object({ taskId: z.number() }))
        .query(async ({ ctx, input }) => {
          if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
          return adminGetTaskStats(input.taskId);
        }),

      create: protectedProcedure
        .input(z.object({
          title: z.string().min(1),
          description: z.string().optional(),
          category: z.enum(['survey', 'video', 'app_trial', 'offer', 'app_install', 'daily', 'social', 'play_to_earn']).default('offer'),
          offerType: z.enum(['standard', 'app_install', 'survey', 'video']).optional(),
          points: z.number().default(10),
          xpReward: z.number().default(50),
          timeMinutes: z.number().default(5),
          frequency: z.enum(['once', 'daily', 'weekly']).default('once'),
          difficulty: z.enum(['easy', 'medium', 'hard']).default('easy'),
          imageUrl: z.string().optional(),
          thumbnailUrl: z.string().optional(),
          screenshots: z.array(z.string()).optional(),
          offerUrl: z.string().optional(),
          providerName: z.string().optional(),
          requirements: z.string().optional(),
          disclaimer: z.string().optional(),
          targetCountries: z.string().optional(),
          targetDevices: z.string().optional(),
          isActive: z.boolean().default(true),
          isFeatured: z.boolean().default(false),
          isTrending: z.boolean().default(false),
          sortOrder: z.number().default(0),
        }))
        .mutation(async ({ ctx, input }) => {
          if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
          await adminCreateTask({ ...input, screenshots: input.screenshots ? JSON.stringify(input.screenshots) : undefined });
          await adminAddAuditLog(ctx.user.id, ctx.user.name ?? 'Admin', 'create_task', 'task', undefined, { title: input.title });
          return { success: true };
        }),

      update: protectedProcedure
        .input(z.object({
          taskId: z.number(),
          title: z.string().optional(),
          description: z.string().optional(),
          category: z.enum(['survey', 'video', 'app_trial', 'offer', 'app_install', 'daily', 'social', 'play_to_earn']).optional(),
          offerType: z.enum(['standard', 'app_install', 'survey', 'video']).optional(),
          points: z.number().optional(),
          xpReward: z.number().optional(),
          timeMinutes: z.number().optional(),
          frequency: z.enum(['once', 'daily', 'weekly']).optional(),
          difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
          imageUrl: z.string().optional(),
          thumbnailUrl: z.string().optional(),
          screenshots: z.array(z.string()).optional(),
          offerUrl: z.string().url().optional(),
          providerName: z.string().optional(),
          requirements: z.string().optional(),
          disclaimer: z.string().optional(),
          targetCountries: z.string().optional(),
          targetDevices: z.string().optional(),
          isActive: z.boolean().optional(),
          isFeatured: z.boolean().optional(),
          isTrending: z.boolean().optional(),
          sortOrder: z.number().optional(),
          affiliateNetworkId: z.number().nullable().optional(),
          publisherPayout: z.number().optional(),
          postbackUrl: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
          if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
          const { taskId, screenshots, ...data } = input;
          await adminUpdateTask(taskId, { ...data, screenshots: screenshots ? JSON.stringify(screenshots) : undefined });
          await adminAddAuditLog(ctx.user.id, ctx.user.name ?? 'Admin', 'update_task', 'task', taskId, data);
          return { success: true };
        }),

      delete: protectedProcedure
        .input(z.object({ taskId: z.number() }))
        .mutation(async ({ ctx, input }) => {
          if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
          await adminDeleteTask(input.taskId);
          await adminAddAuditLog(ctx.user.id, ctx.user.name ?? 'Admin', 'delete_task', 'task', input.taskId);
          return { success: true };
        }),

      bulkImportOffers: protectedProcedure
        .input(z.object({
          offers: z.array(z.object({
            name: z.string().min(1),
            link: z.string().optional(),
            thumbnailUrl: z.string().optional(),
            countries: z.array(z.string()).optional(),
            devices: z.array(z.enum(['iOS', 'Android', 'PC'])).optional(),
            points: z.number().optional(),
          }))
        }))
        .mutation(async ({ ctx, input }) => {
          if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
          const db = await getDb();
          if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
          let created = 0;
          for (const offer of input.offers) {
            try {
              await adminCreateTask({
                title: offer.name,
                description: '',
                category: 'offer',
                offerType: 'standard',
                points: offer.points ?? 10,
                xpReward: 50,
                timeMinutes: 5,
                frequency: 'once',
                difficulty: 'easy',
                imageUrl: undefined,
                thumbnailUrl: offer.thumbnailUrl,
                offerUrl: offer.link,
                targetCountries: offer.countries ? JSON.stringify(offer.countries) : undefined,
                targetDevices: offer.devices ? JSON.stringify(offer.devices) : undefined,
                isActive: true,
              });
              created++;
            } catch (err) {
              console.error('Error creating offer:', err);
            }
          }
          await adminAddAuditLog(ctx.user.id, ctx.user.name ?? 'Admin', 'bulk_import_offers', 'task', undefined, { count: created });
          return { success: true, created };
        }),
    }),

    // Rewards
    rewards: router({
      list: protectedProcedure.query(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        return adminGetAllRewards();
      }),

      create: protectedProcedure
        .input(z.object({
          name: z.string().min(1),
          description: z.string().optional(),
          category: z.enum(['gift_card', 'paypal', 'crypto', 'gaming', 'other']),
          pointsCost: z.number().min(1),
          imageUrl: z.string().optional(),
          brand: z.string().optional(),
          isAvailable: z.boolean().default(true),
          sortOrder: z.number().default(0),
        }))
        .mutation(async ({ ctx, input }) => {
          if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
          await adminCreateReward(input);
          await adminAddAuditLog(ctx.user.id, ctx.user.name ?? 'Admin', 'create_reward', 'reward', undefined, { name: input.name });
          return { success: true };
        }),

      update: protectedProcedure
        .input(z.object({
          rewardId: z.number(),
          name: z.string().optional(),
          description: z.string().optional(),
          category: z.enum(['gift_card', 'paypal', 'crypto', 'gaming', 'other']).optional(),
          pointsCost: z.number().optional(),
          imageUrl: z.string().optional(),
          brand: z.string().optional(),
          isAvailable: z.boolean().optional(),
          sortOrder: z.number().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
          if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
          const { rewardId, ...data } = input;
          await adminUpdateReward(rewardId, data);
          await adminAddAuditLog(ctx.user.id, ctx.user.name ?? 'Admin', 'update_reward', 'reward', rewardId, data);
          return { success: true };
        }),

      delete: protectedProcedure
        .input(z.object({ rewardId: z.number() }))
        .mutation(async ({ ctx, input }) => {
          if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
          await adminDeleteReward(input.rewardId);
          await adminAddAuditLog(ctx.user.id, ctx.user.name ?? 'Admin', 'delete_reward', 'reward', input.rewardId);
          return { success: true };
        }),
    }),

    // Achievements
    achievements: router({
      list: protectedProcedure.query(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        return adminGetAllAchievements();
      }),

      create: protectedProcedure
        .input(z.object({
          name: z.string().min(1),
          description: z.string().optional(),
          icon: z.string().min(1),
          category: z.enum(['earning', 'social', 'streak', 'level', 'special']),
          requirement: z.number().min(1),
          pointsBonus: z.number().default(0),
          rarity: z.enum(['common', 'rare', 'epic', 'legendary']).default('common'),
        }))
        .mutation(async ({ ctx, input }) => {
          if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
          await adminCreateAchievement(input);
          await adminAddAuditLog(ctx.user.id, ctx.user.name ?? 'Admin', 'create_achievement', 'achievement', undefined, { name: input.name });
          return { success: true };
        }),

      update: protectedProcedure
        .input(z.object({
          achievementId: z.number(),
          name: z.string().optional(),
          description: z.string().optional(),
          icon: z.string().optional(),
          category: z.enum(['earning', 'social', 'streak', 'level', 'special']).optional(),
          requirement: z.number().optional(),
          pointsBonus: z.number().optional(),
          rarity: z.enum(['common', 'rare', 'epic', 'legendary']).optional(),
        }))
        .mutation(async ({ ctx, input }) => {
          if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
          const { achievementId, ...data } = input;
          await adminUpdateAchievement(achievementId, data);
          await adminAddAuditLog(ctx.user.id, ctx.user.name ?? 'Admin', 'update_achievement', 'achievement', achievementId, data);
          return { success: true };
        }),

      delete: protectedProcedure
        .input(z.object({ achievementId: z.number() }))
        .mutation(async ({ ctx, input }) => {
          if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
          await adminDeleteAchievement(input.achievementId);
          await adminAddAuditLog(ctx.user.id, ctx.user.name ?? 'Admin', 'delete_achievement', 'achievement', input.achievementId);
          return { success: true };
        }),
    }),

    // Redemptions
    redemptions: router({
      list: protectedProcedure
        .input(z.object({ status: z.string().optional(), limit: z.number().default(50), offset: z.number().default(0) }))
        .query(async ({ ctx, input }) => {
          if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
          return adminGetAllRedemptions(input.status, input.limit, input.offset);
        }),

      updateStatus: protectedProcedure
        .input(z.object({ redemptionId: z.number(), status: z.enum(['pending', 'processing', 'completed', 'failed']) }))
        .mutation(async ({ ctx, input }) => {
          if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
          await adminUpdateRedemptionStatus(input.redemptionId, input.status);
          await adminAddAuditLog(ctx.user.id, ctx.user.name ?? 'Admin', 'update_redemption', 'redemption', input.redemptionId, { status: input.status });
          return { success: true };
        }),
    }),

    // Offer Providers
    offerProviders: router({
      list: protectedProcedure.query(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        return adminGetAllOfferProviders();
      }),

      create: protectedProcedure
        .input(z.object({
          name: z.string().min(1),
          description: z.string().optional(),
          logoUrl: z.string().optional(),
          baseUrl: z.string().optional(),
          isActive: z.boolean().default(true),
          totalOffers: z.number().default(0),
          avgPayout: z.string().default('0.00'),
          sortOrder: z.number().default(0),
        }))
        .mutation(async ({ ctx, input }) => {
          if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
          await adminCreateOfferProvider(input);
          await adminAddAuditLog(ctx.user.id, ctx.user.name ?? 'Admin', 'create_provider', 'offer_provider', undefined, { name: input.name });
          return { success: true };
        }),

      update: protectedProcedure
        .input(z.object({
          providerId: z.number(),
          name: z.string().optional(),
          description: z.string().optional(),
          logoUrl: z.string().optional(),
          baseUrl: z.string().optional(),
          isActive: z.boolean().optional(),
          totalOffers: z.number().optional(),
          avgPayout: z.string().optional(),
          sortOrder: z.number().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
          if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
          const { providerId, ...data } = input;
          await adminUpdateOfferProvider(providerId, data);
          await adminAddAuditLog(ctx.user.id, ctx.user.name ?? 'Admin', 'update_provider', 'offer_provider', providerId, data);
          return { success: true };
        }),

      delete: protectedProcedure
        .input(z.object({ providerId: z.number() }))
        .mutation(async ({ ctx, input }) => {
          if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
          await adminDeleteOfferProvider(input.providerId);
          await adminAddAuditLog(ctx.user.id, ctx.user.name ?? 'Admin', 'delete_provider', 'offer_provider', input.providerId);
          return { success: true };
        }),
    }),

    // Broadcast
    broadcast: protectedProcedure
      .input(z.object({ title: z.string().min(1), message: z.string().min(1), targetUserId: z.number().optional() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const count = await adminBroadcastNotification(input.title, input.message, input.targetUserId);
        await adminAddAuditLog(ctx.user.id, ctx.user.name ?? 'Admin', 'broadcast_notification', 'notification', undefined, { title: input.title, recipients: count });
        return { success: true, count };
      }),

    // Settings
    settings: router({
      list: protectedProcedure.query(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        return adminGetSettings();
      }),

      update: protectedProcedure
        .input(z.object({ key: z.string(), value: z.string() }))
        .mutation(async ({ ctx, input }) => {
          if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
          await adminUpdateSetting(input.key, input.value);
          await adminAddAuditLog(ctx.user.id, ctx.user.name ?? 'Admin', 'update_setting', 'platform_setting', undefined, { key: input.key, value: input.value });
          return { success: true };
        }),
    }),

    // Category Section Order
    categorySectionOrder: router({
      get: publicProcedure.query(async () => {
        return getCategorySectionOrder();
      }),

      update: protectedProcedure
        .input(z.object({ order: z.array(z.string()) }))
        .mutation(async ({ ctx, input }) => {
          if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
          await updateCategorySectionOrder(input.order);
          await adminAddAuditLog(ctx.user.id, ctx.user.name ?? 'Admin', 'update_category_order', 'category_section_order', undefined, { order: input.order });
          return { success: true };
        }),
    }),

    // Audit Log
    auditLog: router({
      list: protectedProcedure
        .input(z.object({ limit: z.number().default(100), offset: z.number().default(0) }))
        .query(async ({ ctx, input }) => {
          if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
          return adminGetAuditLog(input.limit, input.offset);
        }),
    }),
    notifications: router({
      broadcast: protectedProcedure
        .input(z.object({
          title: z.string().min(1),
          content: z.string().min(1),
          type: z.enum(['info', 'success', 'warning', 'achievement']).default('info'),
        }))
        .mutation(async ({ ctx, input }) => {
          if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
          const db = await getDb();
          if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
          const allUsers = await db.select({ id: users.id }).from(users);
          const notifType = input.type === 'success' ? 'bonus' : input.type === 'warning' ? 'system' : input.type === 'info' ? 'system' : 'achievement';
          await Promise.all(allUsers.map(u =>
            db.insert(notifications).values({ userId: u.id, title: input.title, message: input.content, type: notifType })
          ));
          await adminAddAuditLog(ctx.user.id, ctx.user.name ?? 'Admin', 'broadcast_notification', 'notification', undefined, { title: input.title, recipients: allUsers.length });
          return { success: true, sent: allUsers.length };
        }),
      sendToUser: protectedProcedure
        .input(z.object({
          userId: z.number(),
          title: z.string().min(1),
          content: z.string().min(1),
          type: z.enum(['info', 'success', 'warning', 'achievement']).default('info'),
        }))
        .mutation(async ({ ctx, input }) => {
          if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
          const db = await getDb();
          if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
          const notifType2 = input.type === 'success' ? 'bonus' : input.type === 'warning' ? 'system' : input.type === 'info' ? 'system' : 'achievement';
          await db.insert(notifications).values({ userId: input.userId, title: input.title, message: input.content, type: notifType2 });
          await adminAddAuditLog(ctx.user.id, ctx.user.name ?? 'Admin', 'send_notification', 'notification', input.userId, { title: input.title });
          return { success: true };
        }),
    }),

    // Postback testing
    getAffiliateNetworks: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const networks = await db.select({ id: affiliateNetworks.id, name: affiliateNetworks.name }).from(affiliateNetworks);
        return networks;
      }),

    sendTestPostback: protectedProcedure
      .input(z.object({
        networkId: z.number(),
        clickId: z.string(),
        status: z.enum(['pending', 'approved', 'rejected']),
        sessionUuid: z.string().optional(),
        customParams: z.record(z.string(), z.any()).optional(),
        format: z.enum(['query', 'json', 'custom']).default('query'),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        
        try {
          const baseUrl = 'http://localhost:3000';
          const params: Record<string, unknown> = {
            network_id: input.networkId,
            click_id: input.clickId,
            status: input.status,
          };
          
          if (input.sessionUuid) {
            params.session_uuid = input.sessionUuid;
          }
          
          let response;
          let statusCode = 0;
          const startTime = Date.now();
          
          if (input.format === 'json' || input.format === 'custom') {
            const body = input.customParams || params;
            response = await fetch(`${baseUrl}/api/webhooks/postback-json`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            });
          } else {
            const queryString = new URLSearchParams(params as Record<string, string>).toString();
            response = await fetch(`${baseUrl}/api/webhooks/postback?${queryString}`, {
              method: 'POST',
            });
          }
          
          statusCode = response.status;
          const responseTime = Date.now() - startTime;
          const responseData = await response.json().catch(() => ({}));
          
          // Log test postback to audit table
          const rawPayload = input.format === 'json' || input.format === 'custom' 
            ? JSON.stringify(input.customParams || params)
            : new URLSearchParams(params as Record<string, string>).toString();
          
          await logPostbackAudit({
            affiliateNetworkId: input.networkId,
            completionId: `test-${input.clickId}`,
            rawPayload,
            payloadFormat: input.format === 'json' || input.format === 'custom' ? 'json' : 'query_params',
            signatureProvided: null,
            signatureValid: false,
            signatureError: 'Test postback - no signature validation',
            parsedData: JSON.stringify(params),
            macroMappingUsed: JSON.stringify({}),
            extractedStatus: input.status,
            extractedPayout: null,
            httpMethod: 'POST',
            sourceIp: 'test-admin',
            userAgent: 'PostbackTester',
            processingStatus: statusCode === 200 ? 'success' : 'failed',
            processingError: statusCode !== 200 ? `HTTP ${statusCode}` : null,
          });
          
          return {
            success: statusCode === 200,
            statusCode,
            responseTime,
            response: responseData,
            error: statusCode !== 200 ? `HTTP ${statusCode}` : undefined,
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      }),
    
    getPostbackAuditLogs: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        return await getPostbackAuditLogs();
      }),
    
    getPostbackAuditStats: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        return await getPostbackAuditStats();
      }),
  }),
});

export type AppRouter = typeof appRouter;

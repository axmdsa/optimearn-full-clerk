import { router, publicProcedure, protectedProcedure, adminProcedure } from "../_core/trpc";
import { z } from "zod";
import {
  createOrUpdateTrackingConfig,
  getTrackingConfig,
  getOfferClicks,
  getOfferCompletions,
  getTrackingStats,
  getPostbackStats,
  updateOfferCompletionStatus,
  getDb,
} from "../db";
import { sendPostback, validatePostbackUrl } from "../_core/postbackDelivery";
import { offerPostbacks } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const trackingRouter = router({
  /**
   * Configure tracking for an offer (admin only)
   */
  configureTracking: adminProcedure
    .input(
      z.object({
        taskId: z.number(),
        postbackUrl: z.string().url().optional(),
        clickIdFormat: z.enum(["uuid", "uuid_prefix", "sequential"]).optional(),
        trackingEnabled: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Validate postback URL if provided
      if (input.postbackUrl && !validatePostbackUrl(input.postbackUrl)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid postback URL format",
        });
      }

      const config = await createOrUpdateTrackingConfig(input.taskId, {
        postbackUrl: input.postbackUrl,
        clickIdFormat: input.clickIdFormat || "uuid",
        trackingEnabled: input.trackingEnabled !== false,
      });

      return config;
    }),

  /**
   * Get tracking configuration for an offer
   */
  getConfig: adminProcedure
    .input(z.object({ taskId: z.number() }))
    .query(async ({ input }) => {
      const config = await getTrackingConfig(input.taskId);
      if (!config) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Tracking configuration not found",
        });
      }
      return config;
    }),

  /**
   * Get click statistics for an offer
   */
  getClickStats: adminProcedure
    .input(
      z.object({
        taskId: z.number(),
        limit: z.number().default(100),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input }) => {
      const clicks = await getOfferClicks(input.taskId, input.limit, input.offset);
      const stats = await getTrackingStats(input.taskId);

      return {
        clicks,
        stats: {
          clicks: stats?.clicks || 0,
          completions: stats?.completions || 0,
          conversions: stats?.conversions || 0,
          conversionRate: stats?.conversionRate || 0,
        },
      };
    }),

  /**
   * Get completion statistics for an offer
   */
  getCompletionStats: adminProcedure
    .input(
      z.object({
        taskId: z.number(),
        limit: z.number().default(100),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input }) => {
      const completions = await getOfferCompletions(input.taskId, input.limit, input.offset);
      const stats = await getTrackingStats(input.taskId);

      return {
        completions,
        stats: {
          clicks: stats?.clicks || 0,
          completions: stats?.completions || 0,
          conversions: stats?.conversions || 0,
          conversionRate: stats?.conversionRate || 0,
        },
      };
    }),

  /**
   * Get postback delivery statistics
   */
  getPostbackStats: adminProcedure
    .input(z.object({ taskId: z.number() }))
    .query(async ({ input }) => {
      const stats = await getPostbackStats(input.taskId);
      return stats;
    }),

  /**
   * Update completion status (approve/reject)
   */
  updateCompletionStatus: adminProcedure
    .input(
      z.object({
        completionId: z.number(),
        status: z.enum(["pending", "approved", "rejected", "duplicate"]),
      })
    )
    .mutation(async ({ input }) => {
      const updated = await updateOfferCompletionStatus(input.completionId, input.status);

      // If approving, trigger postback delivery
      if (input.status === "approved") {
        const db = await getDb();
        if (db) {
          // Find associated postback and send it
          const postbacks = await db
            .select()
            .from(offerPostbacks)
            .where(eq(offerPostbacks.completionId, input.completionId));

          for (const pb of postbacks) {
            // Send postback asynchronously (fire and forget)
            sendPostback(pb.id).catch((err) => {
              console.error(`[Tracking] Error sending postback ${pb.id}:`, err);
            });
          }
        }
      }

      return updated;
    }),

  /**
   * Manually trigger postback delivery (admin only)
   */
  sendPostbackManual: adminProcedure
    .input(z.object({ postbackId: z.number() }))
    .mutation(async ({ input }) => {
      const success = await sendPostback(input.postbackId);
      return { success };
    }),
});

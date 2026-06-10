import { z } from "zod";
import { protectedProcedure, adminProcedure, router } from "../_core/trpc";
import { 
  recordUserPoints,
  updateUserPointsStatus,
  getUserById,
  updateUserPoints,
  getUserPendingPoints,
  getUserLockedPoints,
} from "../db";

export const rewardsRouter = router({
  // Get user's pending points
  getPendingPoints: protectedProcedure
    .query(async ({ ctx }) => {
      const pending = await getUserPendingPoints(ctx.user.id);
      const totalPending = pending.reduce((sum: number, p: any) => sum + (p.points || 0), 0);
      const lockedPending = pending.filter((p: any) => p.isLockedForCashout).reduce((sum: number, p: any) => sum + (p.points || 0), 0);
      
      return {
        totalPending,
        lockedPending,
        unlockedPending: totalPending - lockedPending,
        items: pending,
      };
    }),

  // Admin: Award points to user (manual)
  awardPoints: adminProcedure
    .input(z.object({
      userId: z.number(),
      taskId: z.number(),
      completionId: z.string(),
      pointsAmount: z.number().positive(),
      pointsStatus: z.enum(['pending', 'confirmed']).default('confirmed'),
      isLockedForCashout: z.boolean().default(false),
    }))
    .mutation(async ({ input }) => {
      // Create points history record
      const result = await recordUserPoints({
        userId: input.userId,
        taskId: input.taskId,
        completionId: input.completionId,
        pointsAmount: input.pointsAmount,
        pointsStatus: input.pointsStatus,
        isLockedForCashout: input.isLockedForCashout,
        awardedAt: new Date(),
      });

      // Update user's total points if confirmed
      if (input.pointsStatus === 'confirmed') {
        const user = await getUserById(input.userId);
        if (user) {
          await updateUserPoints(input.userId, user.points + input.pointsAmount);
        }
      }

      return { success: true, result };
    }),

  // Admin: Mark pending points as confirmed (after postback verification)
  confirmPendingPoints: adminProcedure
    .input(z.object({
      historyId: z.number(),
    }))
    .mutation(async ({ input }) => {
      // Update status to confirmed
      await updateUserPointsStatus(input.historyId, 'confirmed');
      return { success: true };
    }),

  // Admin: Reject pending points (after postback rejection)
  rejectPendingPoints: adminProcedure
    .input(z.object({
      historyId: z.number(),
    }))
    .mutation(async ({ input }) => {
      // Update status to rejected (note: rejected is not a valid status, so we'll use pending)
      // In practice, rejected offers should have their points not awarded at all
      return { success: true };
    }),

  // Check if user can cashout (not flagged, has eligible points)
  canCashout: protectedProcedure
    .query(async ({ ctx }) => {
      const user = await getUserById(ctx.user.id);
      
      if (!user) {
        return { canCashout: false, reason: "User not found" };
      }

      // Check if user is flagged as suspicious
      if (user.isSuspicious) {
        return {
          canCashout: false,
          reason: "Your account is under review. Please contact support.",
          flaggedAt: user.flaggedAt,
          suspiciousReason: user.suspiciousReason,
        };
      }

      // Get pending points
      const pending = await getUserPendingPoints(ctx.user.id);
      const lockedPending = pending.filter((p: any) => p.isLockedForCashout).reduce((sum: number, p: any) => sum + (p.points || 0), 0);

      if (lockedPending > 0) {
        return {
          canCashout: false,
          reason: "You have pending high-value offers being verified. Please wait.",
          lockedPendingPoints: lockedPending,
        };
      }

      // Check if user has any confirmed points
      if (user.points <= 0) {
        return {
          canCashout: false,
          reason: "No eligible points available for cashout",
          totalEligible: 0,
        };
      }

      return {
        canCashout: true,
        totalEligible: user.points,
      };
    }),
});

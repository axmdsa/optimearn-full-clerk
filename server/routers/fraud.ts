import { z } from "zod";
import { protectedProcedure, adminProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  flagUserAsSuspicious,
  unflagUser,
  getFlaggedUsers,
  getFlaggedUserDetail,
  handleOfferRejection,
} from "../db";

export const fraudRouter = router({
  // Admin: Get all flagged users
  getFlaggedUsers: adminProcedure
    .query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
      return await getFlaggedUsers();
    }),

  // Admin: Get detailed info about a flagged user
  getFlaggedUserDetail: adminProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
      return await getFlaggedUserDetail(input.userId);
    }),

  // Admin: Manually flag a user
  flagUser: adminProcedure
    .input(z.object({
      userId: z.number(),
      reason: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
      return await flagUserAsSuspicious(input.userId, input.reason);
    }),

  // Admin: Unflag a user
  unflagUser: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
      return await unflagUser(input.userId);
    }),

  // Admin: Handle offer rejection from affiliate network
  handleRejection: adminProcedure
    .input(z.object({ completionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
      return await handleOfferRejection(input.completionId);
    }),
});

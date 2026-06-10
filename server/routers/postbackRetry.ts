import { router, adminProcedure } from '../_core/trpc';
import { z } from 'zod';
import { getDb } from '../db';
import { offerPostbacks, affiliateNetworks, offerCompletions, tasks } from '../../drizzle/schema';
import { eq, and, gte, lte, desc, SQL } from 'drizzle-orm';

export const postbackRetryRouter = router({
  getRetries: adminProcedure
    .input(
      z.object({
        networkId: z.string().optional(),
        status: z.enum(['pending', 'sent', 'failed', 'success']).optional(),
        startDate: z.date(),
        endDate: z.date(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database connection failed');
      const conditions: SQL[] = [
        gte(offerPostbacks.createdAt, input.startDate),
        lte(offerPostbacks.createdAt, input.endDate),
      ];

      if (input.status) {
        conditions.push(eq(offerPostbacks.status, input.status));
      }

      const postbacks = await db
        .select({
          id: offerPostbacks.id,
          completionId: offerPostbacks.completionId,
          offerId: tasks.id,
          networkId: affiliateNetworks.id,
          networkName: affiliateNetworks.name,
          postbackUrl: offerPostbacks.postbackUrl,
          status: offerPostbacks.status,
          attemptCount: offerPostbacks.attemptCount,
          maxAttempts: offerPostbacks.maxAttempts,
          responseBody: offerPostbacks.responseBody,
          lastAttemptAt: offerPostbacks.lastAttemptAt,
          nextRetryAt: offerPostbacks.nextRetryAt,
          createdAt: offerPostbacks.createdAt,
        })
        .from(offerPostbacks)
        .leftJoin(offerCompletions, eq(offerPostbacks.completionId, offerCompletions.id))
        .leftJoin(tasks, eq(offerCompletions.taskId, tasks.id))
        .leftJoin(affiliateNetworks, eq(tasks.affiliateNetworkId, affiliateNetworks.id))
        .where(and(...conditions))
        .orderBy(desc(offerPostbacks.createdAt));

      return postbacks.map((p: any) => ({
        ...p,
        lastError: p.responseBody,
        retries: [
          {
            attemptedAt: p.lastAttemptAt,
            statusCode: p.status === 'success' ? 200 : 500,
          },
        ],
      }));
    }),

  getRetryHistory: adminProcedure
    .input(z.object({ postbackId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database connection failed');
      const postback = await db
        .select()
        .from(offerPostbacks)
        .where(eq(offerPostbacks.id, parseInt(input.postbackId)))
        .then((rows: any) => rows[0]);

      return postback;
    }),

  manualRetry: adminProcedure
    .input(z.object({ postbackId: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database connection failed');
      const postback = await db
        .select()
        .from(offerPostbacks)
        .where(eq(offerPostbacks.id, parseInt(input.postbackId)))
        .then((rows: any) => rows[0]);

      if (!postback) {
        throw new Error('Postback not found');
      }

      // Update attempt count and status
      await db
        .update(offerPostbacks)
        .set({
          attemptCount: (postback.attemptCount || 0) + 1,
          status: 'pending',
          lastAttemptAt: new Date(),
          nextRetryAt: new Date(Date.now() + Math.pow(2, postback.attemptCount) * 10 * 1000),
        })
        .where(eq(offerPostbacks.id, parseInt(input.postbackId)));

      return { success: true };
    }),
});

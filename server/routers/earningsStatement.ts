import { router, protectedProcedure } from '../_core/trpc';
import { z } from 'zod';
import { getDb } from '../db';
import { userPointsHistory, offerCompletions, tasks, affiliateNetworks } from '../../drizzle/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { PDFDocument, rgb } from 'pdf-lib';

export const earningsStatementRouter = router({
  getStatement: protectedProcedure
    .input(
      z.object({
        month: z.number().min(1).max(12),
        year: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database connection failed');

      const startDate = new Date(input.year, input.month - 1, 1);
      const endDate = new Date(input.year, input.month, 0);

      const completions = await db
        .select({
          id: offerCompletions.id,
          taskId: offerCompletions.taskId,
          taskTitle: tasks.title,
          status: offerCompletions.status,
          conversionValue: offerCompletions.conversionValue,
          networkName: affiliateNetworks.name,
          completedAt: offerCompletions.completedAt,
          publisherPayout: tasks.publisherPayout,
        })
        .from(offerCompletions)
        .leftJoin(tasks, eq(offerCompletions.taskId, tasks.id))
        .leftJoin(affiliateNetworks, eq(tasks.affiliateNetworkId, affiliateNetworks.id))
        .where(
          and(
            eq(offerCompletions.userId, ctx.user.id),
            gte(offerCompletions.completedAt, startDate),
            lte(offerCompletions.completedAt, endDate)
          )
        )
        .orderBy(desc(offerCompletions.completedAt));

      const totalEarnings = completions.reduce((sum, c) => sum + (Number(c.publisherPayout) || 0), 0);
      const approvedEarnings = completions
        .filter((c: any) => c.status === 'approved')
        .reduce((sum, c) => sum + (Number(c.publisherPayout) || 0), 0);
      const pendingEarnings = completions
        .filter((c: any) => c.status === 'pending')
        .reduce((sum, c) => sum + (Number(c.publisherPayout) || 0), 0);

      return {
        month: input.month,
        year: input.year,
        completions,
        totalEarnings,
        approvedEarnings,
        pendingEarnings,
        completionCount: completions.length,
      };
    }),

  generatePDF: protectedProcedure
    .input(
      z.object({
        month: z.number().min(1).max(12),
        year: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database connection failed');

      const startDate = new Date(input.year, input.month - 1, 1);
      const endDate = new Date(input.year, input.month, 0);

      const completions = await db
        .select({
          id: offerCompletions.id,
          taskTitle: tasks.title,
          status: offerCompletions.status,
          publisherPayout: tasks.publisherPayout,
          completedAt: offerCompletions.completedAt,
          networkName: affiliateNetworks.name,
        })
        .from(offerCompletions)
        .leftJoin(tasks, eq(offerCompletions.taskId, tasks.id))
        .leftJoin(affiliateNetworks, eq(tasks.affiliateNetworkId, affiliateNetworks.id))
        .where(
          and(
            eq(offerCompletions.userId, ctx.user.id),
            gte(offerCompletions.completedAt, startDate),
            lte(offerCompletions.completedAt, endDate)
          )
        )
        .orderBy(desc(offerCompletions.completedAt));

      // Create PDF
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([612, 792]); // Letter size
      const { height } = page.getSize();

      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const title = `OptimEarn Earnings Statement - ${monthNames[input.month - 1]} ${input.year}`;

      // Title
      page.drawText(title, {
        x: 50,
        y: height - 50,
        size: 20,
        color: rgb(0, 1, 0),
      });

      // User info
      page.drawText(`User: ${ctx.user.name || 'N/A'}`, {
        x: 50,
        y: height - 80,
        size: 12,
      });

      page.drawText(`Generated: ${new Date().toLocaleDateString()}`, {
        x: 50,
        y: height - 100,
        size: 12,
      });

      // Summary
      const totalEarnings = completions.reduce((sum, c) => sum + (Number(c.publisherPayout) || 0), 0);
      const approvedEarnings = completions
        .filter((c: any) => c.status === 'approved')
        .reduce((sum, c) => sum + (Number(c.publisherPayout) || 0), 0);
      const pendingEarnings = completions
        .filter((c: any) => c.status === 'pending')
        .reduce((sum, c) => sum + (Number(c.publisherPayout) || 0), 0);

      page.drawText(`Total Earnings: $${totalEarnings.toFixed(2)}`, {
        x: 50,
        y: height - 140,
        size: 12,
        color: rgb(0, 0.5, 0),
      });

      page.drawText(`Approved: $${approvedEarnings.toFixed(2)}`, {
        x: 50,
        y: height - 160,
        size: 11,
      });

      page.drawText(`Pending: $${pendingEarnings.toFixed(2)}`, {
        x: 50,
        y: height - 180,
        size: 11,
      });

      // Table header
      let yPosition = height - 220;
      page.drawText('Offer', { x: 50, y: yPosition, size: 10 });
      page.drawText('Network', { x: 250, y: yPosition, size: 10 });
      page.drawText('Status', { x: 400, y: yPosition, size: 10 });
      page.drawText('Earnings', { x: 500, y: yPosition, size: 10 });

      yPosition -= 20;

      // Table rows
      completions.forEach((completion: any) => {
        if (yPosition < 50) {
          yPosition = height - 50;
          page.drawText('(continued on next page)', { x: 50, y: yPosition, size: 9 });
        }

        page.drawText(completion.taskTitle?.substring(0, 25) || 'N/A', {
          x: 50,
          y: yPosition,
          size: 9,
        });

        page.drawText(completion.networkName || 'N/A', {
          x: 250,
          y: yPosition,
          size: 9,
        });

        page.drawText(completion.status || 'N/A', {
          x: 400,
          y: yPosition,
          size: 9,
        });

        page.drawText(`$${(Number(completion.publisherPayout) || 0).toFixed(2)}`, {
          x: 500,
          y: yPosition,
          size: 9,
        });

        yPosition -= 15;
      });

      const pdfBytes = await pdfDoc.save();
      return Buffer.from(pdfBytes).toString('base64');
    }),
});

import { adminProcedure } from "../_core/trpc";
import { z } from "zod";
import { randomBytes } from "crypto";
import {
  createAffiliateNetwork,
  updateAffiliateNetwork,
  deleteAffiliateNetwork,
  getAffiliateNetworks,
  getAffiliateNetworkById,
  getEarningsByNetwork,
  getEarningStats,
} from "../db";

// Generate a cryptographically secure webhook secret
function generateWebhookSecret(): string {
  return `sk_live_${randomBytes(32).toString('hex')}`;
}

export const networksRouter = {
  list: adminProcedure.query(async () => {
    return await getAffiliateNetworks();
  }),

  getById: adminProcedure
    .input(z.object({ networkId: z.number() }))
    .query(async ({ input }) => {
      return await getAffiliateNetworkById(input.networkId);
    }),

  create: adminProcedure
    .input(z.object({
      name: z.string().min(1),
      webhookUrl: z.string().url(),
      webhookSecret: z.string().min(1).optional(),
      postbackTypes: z.string().optional(),
      description: z.string().optional(),
      isActive: z.boolean().default(true),
      subIdParamName: z.string().optional(),
      supportedMacros: z.string().optional(),
      customMacros: z.string().optional(),
      postbackFormat: z.string().optional(),
      postbackMethod: z.string().optional(),
      macroFieldMapping: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      // Generate webhook secret if not provided
      const webhookSecret = input.webhookSecret || generateWebhookSecret();
      return await createAffiliateNetwork({
        name: input.name,
        webhookUrl: input.webhookUrl,
        webhookSecret,
        postbackTypes: input.postbackTypes,
        description: input.description,
        isActive: input.isActive,
        subIdParamName: input.subIdParamName,
        supportedMacros: input.supportedMacros,
        customMacros: input.customMacros,
        postbackFormat: input.postbackFormat as any,
        postbackMethod: input.postbackMethod as any,
        macroFieldMapping: input.macroFieldMapping,
      });
    }),

  update: adminProcedure
    .input(z.object({
      networkId: z.number(),
      name: z.string().min(1).optional(),
      webhookUrl: z.string().url().optional(),
      webhookSecret: z.string().min(1).optional(),
      postbackTypes: z.string().optional(),
      description: z.string().optional(),
      isActive: z.boolean().optional(),
      regenerateSecret: z.boolean().optional(),
      subIdParamName: z.string().optional(),
      supportedMacros: z.string().optional(),
      customMacros: z.string().optional(),
      postbackFormat: z.string().optional(),
      postbackMethod: z.string().optional(),
      macroFieldMapping: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { networkId, regenerateSecret, ...data } = input;
      // Regenerate secret if requested
      if (regenerateSecret) {
        data.webhookSecret = generateWebhookSecret();
      }
      return await updateAffiliateNetwork(networkId, data as any);
    }),

  delete: adminProcedure
    .input(z.object({ networkId: z.number() }))
    .mutation(async ({ input }) => {
      return await deleteAffiliateNetwork(input.networkId);
    }),

  getEarnings: adminProcedure
    .input(z.object({
      networkId: z.number().optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .query(async ({ input }) => {
      if (input.networkId) {
        return await getEarningsByNetwork(input.networkId, input.startDate, input.endDate);
      }
      return [];
    }),

  getStats: adminProcedure
    .input(z.object({ networkId: z.number().optional() }))
    .query(async ({ input }) => {
      return await getEarningStats(input.networkId);
    }),

  getPerformanceStats: adminProcedure.query(async () => {
    const networks = await getAffiliateNetworks();
    const stats = await Promise.all(
      networks.map(async (network: any) => {
        const earnings = await getEarningsByNetwork(network.id);
        const conversionCount = earnings?.length || 0;
        const totalEarned = earnings?.reduce((sum: number, e: any) => sum + (Number(e.publisherPayout) || 0), 0) || 0;
        const approvedCount = earnings?.filter((e: any) => e.status === 'approved').length || 0;
        
        return {
          id: network.id,
          name: network.name,
          completionCount: conversionCount,
          conversionRate: conversionCount > 0 ? (approvedCount / conversionCount) * 100 : 0,
          avgPayout: conversionCount > 0 ? totalEarned / conversionCount : 0,
          totalEarned,
          approvalRate: conversionCount > 0 ? (approvedCount / conversionCount) * 100 : 0,
          avgApprovalTime: 24,
          reliabilityScore: conversionCount > 0 ? Math.min(100, (approvedCount / conversionCount) * 100) : 0,
        };
      })
    );
    return { networks: stats };
  }),
} as const;

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { recordOfferCompletion, createPostback, getTrackingConfig } from "../../server/db.js";
import { v4 as uuidv4 } from "uuid";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const taskId = parseInt(req.query.task_id as string);
    const userId = parseInt(req.query.user_id as string);
    const clickId = req.query.click_id as string;
    const customCompletionId = req.query.completion_id as string | undefined;

    if (!taskId || isNaN(taskId)) {
      return res.status(400).json({ error: "task_id is required and must be a number" });
    }
    if (!userId || isNaN(userId)) {
      return res.status(400).json({ error: "user_id is required and must be a number" });
    }
    if (!clickId) {
      return res.status(400).json({ error: "click_id is required" });
    }

    // Get tracking config to validate tracking is enabled
    const config = await getTrackingConfig(taskId);
    if (!config || !config.trackingEnabled) {
      return res.status(404).json({ error: "Tracking not enabled for this offer" });
    }

    // Generate completion ID
    const completionId = customCompletionId || `${taskId}-${uuidv4()}`;
    const status = (req.body as any)?.status || "pending";
    const pointsAwarded = (req.body as any)?.points || 0;
    const conversionValue = (req.body as any)?.conversion_value ? ((req.body as any).conversion_value).toString() : undefined;
    const metadata = (req.body as any)?.metadata ? (typeof (req.body as any).metadata === "string" ? JSON.parse((req.body as any).metadata) : (req.body as any).metadata) : undefined;

    // Record the completion
    const result = await recordOfferCompletion({
      taskId,
      userId,
      clickId,
      completionId,
      status: status as "pending" | "approved" | "rejected" | "duplicate",
      pointsAwarded,
      conversionValue,
      metadata: metadata as any,
    });

    if (!result) {
      return res.status(500).json({ error: "Failed to record completion" });
    }

    // If completion is approved and postback URL is configured, trigger postback
    if (status === "approved" && config.postbackUrl && result.insertId) {
      // Create postback record for delivery
      await createPostback({
        completionId: result.insertId,
        postbackUrl: config.postbackUrl,
        status: "pending",
      });
    }

    res.json({
      success: true,
      completion_id: completionId,
      task_id: taskId,
      user_id: userId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Tracking API] Completion recording error:", error);
    res.status(500).json({ error: "Failed to record completion" });
  }
}

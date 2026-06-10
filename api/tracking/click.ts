import type { VercelRequest, VercelResponse } from "@vercel/node";
import { recordOfferClick, getTrackingConfig } from "../../server/db.js";
import { v4 as uuidv4 } from "uuid";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const taskId = parseInt(req.query.task_id as string);
    const userId = req.query.user_id ? parseInt(req.query.user_id as string) : undefined;
    const customClickId = req.query.click_id as string | undefined;

    if (!taskId || isNaN(taskId)) {
      return res.status(400).json({ error: "task_id is required and must be a number" });
    }

    // Get tracking config to validate tracking is enabled
    const config = await getTrackingConfig(taskId);
    if (!config || !config.trackingEnabled) {
      return res.status(404).json({ error: "Tracking not enabled for this offer" });
    }

    // Generate click ID based on format preference
    let clickId = customClickId;
    if (!clickId) {
      if (config.clickIdFormat === "uuid_prefix") {
        clickId = `${taskId}-${uuidv4()}`;
      } else if (config.clickIdFormat === "sequential") {
        // For sequential, we'd need a counter in DB - for now use timestamp-based
        clickId = `${taskId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      } else {
        clickId = uuidv4();
      }
    }

    const ipAddress = (req.headers["x-forwarded-for"] as string)?.split(",")[0] || req.socket.remoteAddress || undefined;
    const userAgent = req.headers["user-agent"];
    const referrer = (req.body as any)?.referrer || req.headers["referer"];
    const country = (req.body as any)?.country;

    // Record the click
    const recordedClickId = await recordOfferClick({
      taskId,
      userId,
      clickId,
      ipAddress,
      userAgent: userAgent ? String(userAgent) : undefined,
      country,
      referrer: referrer ? String(referrer) : undefined,
    });

    res.json({
      success: true,
      click_id: recordedClickId,
      task_id: taskId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Tracking API] Click recording error:", error);
    res.status(500).json({ error: "Failed to record click" });
  }
}

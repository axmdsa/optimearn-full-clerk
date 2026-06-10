import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Webhook } from "svix";
import { handleClerkWebhook } from "../../server/_core/clerkSdk.js";
import { ENV } from "../../server/_core/env.js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const webhookSecret = ENV.clerkWebhookSecret;
  if (!webhookSecret) {
    console.error("[Clerk Webhook] Missing CLERK_WEBHOOK_SECRET");
    res.status(500).json({ error: "Webhook secret not configured" });
    return;
  }

  try {
    const wh = new Webhook(webhookSecret);
    const payload = await wh.verify(JSON.stringify(req.body), {
      "svix-id": req.headers["svix-id"] as string,
      "svix-timestamp": req.headers["svix-timestamp"] as string,
      "svix-signature": req.headers["svix-signature"] as string,
    });

    const result = await handleClerkWebhook(payload);
    res.status(200).json(result);
  } catch (error) {
    console.error("[Clerk Webhook] Verification failed:", error);
    res.status(400).json({ error: "Webhook verification failed" });
  }
}

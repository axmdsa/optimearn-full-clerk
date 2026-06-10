import { getDb } from "../db";
import { offerPostbacks, offerCompletions } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { generatePostbackSignature } from "./webhookSignature";

/**
 * Postback delivery system with exponential backoff retry logic
 * Handles sending completion notifications to publisher endpoints
 */

const MAX_RETRIES = 5;
const RETRY_DELAYS = [
  60 * 1000,           // 1 minute
  5 * 60 * 1000,       // 5 minutes
  15 * 60 * 1000,      // 15 minutes
  60 * 60 * 1000,      // 1 hour
  4 * 60 * 60 * 1000,  // 4 hours
];

/**
 * Send a postback to a publisher endpoint
 * Validates URL and handles retries
 */
export async function sendPostback(postbackId: number) {
  const db = await getDb();
  if (!db) return false;

  try {
    // Get postback record
    const postback = await db
      .select()
      .from(offerPostbacks)
      .where(eq(offerPostbacks.id, postbackId))
      .limit(1);

    if (!postback || postback.length === 0) {
      console.error(`[Postback] Postback ${postbackId} not found`);
      return false;
    }

    const pb = postback[0];

    // Check if already sent successfully
    if (pb.status === "success") {
      console.log(`[Postback] Postback ${postbackId} already sent successfully`);
      return true;
    }

    // Check if max retries exceeded
    if (pb.attemptCount >= MAX_RETRIES) {
      await db
        .update(offerPostbacks)
        .set({ status: "failed", lastAttemptAt: new Date() })
        .where(eq(offerPostbacks.id, postbackId));
      console.error(`[Postback] Max retries exceeded for postback ${postbackId}`);
      return false;
    }

    // Get completion data for postback payload
    const completion = await db
      .select()
      .from(offerCompletions)
      .where(eq(offerCompletions.id, pb.completionId))
      .limit(1);

    if (!completion || completion.length === 0) {
      console.error(`[Postback] Completion ${pb.completionId} not found`);
      return false;
    }

    const comp = completion[0];

    // Build postback URL with parameters
    const url = new URL(pb.postbackUrl);
    const timestamp = Math.floor(Date.now() / 1000);
    
    url.searchParams.append("click_id", comp.clickId);
    url.searchParams.append("completion_id", comp.completionId);
    url.searchParams.append("user_id", comp.userId.toString());
    url.searchParams.append("points", comp.pointsAwarded.toString());
    if (comp.conversionValue) {
      url.searchParams.append("conversion_value", comp.conversionValue.toString());
    }
    url.searchParams.append("status", comp.status);
    url.searchParams.append("timestamp", timestamp.toString());
    
    // Generate webhook signature (use a default secret - should be configured per publisher)
    const webhookSecret = process.env.WEBHOOK_SECRET || "default-secret-change-me";
    const signature = generatePostbackSignature(
      comp.completionId,
      comp.clickId,
      comp.userId,
      comp.pointsAwarded,
      comp.conversionValue?.toString(),
      comp.status,
      timestamp,
      webhookSecret
    );

    // Send HTTP POST request
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const response = await fetch(url.toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "OptimEarn-Postback/1.0",
          "X-Webhook-Signature": signature,
          "X-Webhook-Timestamp": timestamp.toString(),
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const responseBody = await response.text();
      const nextAttempt = pb.attemptCount + 1;

      if (response.ok) {
        // Success
        await db
          .update(offerPostbacks)
          .set({
            status: "success",
            httpStatus: response.status,
            responseBody,
            attemptCount: nextAttempt,
            lastAttemptAt: new Date(),
            sentAt: new Date(),
          })
          .where(eq(offerPostbacks.id, postbackId));

        console.log(`[Postback] Successfully sent postback ${postbackId} to ${pb.postbackUrl}`);
        return true;
      } else {
        // Non-2xx response
        const nextRetryDelay = RETRY_DELAYS[nextAttempt] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
        const nextRetryAt = new Date(Date.now() + nextRetryDelay);

        await db
          .update(offerPostbacks)
          .set({
            status: nextAttempt >= MAX_RETRIES ? "failed" : "pending",
            httpStatus: response.status,
            responseBody,
            attemptCount: nextAttempt,
            lastAttemptAt: new Date(),
            nextRetryAt: nextAttempt < MAX_RETRIES ? nextRetryAt : null,
          })
          .where(eq(offerPostbacks.id, postbackId));

        console.warn(
          `[Postback] Postback ${postbackId} failed with status ${response.status}. Attempt ${nextAttempt}/${MAX_RETRIES}`
        );
        return false;
      }
    } catch (error) {
      clearTimeout(timeout);

      if (error instanceof Error && error.name === "AbortError") {
        console.error(`[Postback] Postback ${postbackId} timed out`);
      } else {
        console.error(`[Postback] Error sending postback ${postbackId}:`, error);
      }

      const nextAttempt = pb.attemptCount + 1;
      const nextRetryDelay = RETRY_DELAYS[nextAttempt] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
      const nextRetryAt = new Date(Date.now() + nextRetryDelay);

      await db
        .update(offerPostbacks)
        .set({
          status: nextAttempt >= MAX_RETRIES ? "failed" : "pending",
          responseBody: error instanceof Error ? error.message : "Unknown error",
          attemptCount: nextAttempt,
          lastAttemptAt: new Date(),
          nextRetryAt: nextAttempt < MAX_RETRIES ? nextRetryAt : null,
        })
        .where(eq(offerPostbacks.id, postbackId));

      return false;
    }
  } catch (error) {
    console.error(`[Postback] Unexpected error in sendPostback:`, error);
    return false;
  }
}

/**
 * Process all pending postbacks that are ready for retry
 * Call this periodically (e.g., every 5 minutes) via a background job
 */
export async function processPendingPostbacks() {
  const db = await getDb();
  if (!db) return;

  try {
    // Find all pending postbacks that are ready for retry
    const pendingPostbacks = await db
      .select()
      .from(offerPostbacks)
      .where(
        and(
          eq(offerPostbacks.status, "pending"),
          // nextRetryAt is null or in the past
          // For simplicity, we'll fetch all pending and check in JS
        )
      );

    const now = Date.now();
    let processed = 0;

    for (const pb of pendingPostbacks) {
      if (!pb.nextRetryAt || pb.nextRetryAt.getTime() <= now) {
        const success = await sendPostback(pb.id);
        if (success) {
          processed++;
        }
      }
    }

    if (processed > 0) {
      console.log(`[Postback] Processed ${processed} pending postbacks`);
    }
  } catch (error) {
    console.error(`[Postback] Error processing pending postbacks:`, error);
  }
}

/**
 * Validate postback URL format
 */
export function validatePostbackUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Get postback retry schedule for display
 */
export function getRetrySchedule(attemptCount: number): string {
  if (attemptCount >= MAX_RETRIES) {
    return "No more retries";
  }
  const delay = RETRY_DELAYS[attemptCount];
  const minutes = Math.round(delay / 60000);
  if (minutes < 60) {
    return `${minutes} minutes`;
  }
  const hours = Math.round(minutes / 60);
  return `${hours} hours`;
}

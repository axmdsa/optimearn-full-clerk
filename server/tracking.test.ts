import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import {
  recordOfferClick,
  recordOfferCompletion,
  getOfferClicks,
  getOfferCompletions,
  getTrackingConfig,
  createOrUpdateTrackingConfig,
  getTrackingStats,
  getPostbackStats,
  updateOfferCompletionStatus,
  createPostback,
  getDb,
} from "./db";
import { sendPostback, validatePostbackUrl, getRetrySchedule } from "./_core/postbackDelivery";
import { offerPostbacks } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Offer Tracking System", () => {
  const testTaskId = 9999;
  const testUserId = 9999;
  let testClickId: string;
  let testCompletionId: string;

  beforeAll(async () => {
    // Create tracking config for test task
    await createOrUpdateTrackingConfig(testTaskId, {
      postbackUrl: "https://example.com/postback",
      clickIdFormat: "uuid",
      trackingEnabled: true,
    });
  });

  afterAll(async () => {
    // Cleanup test data
    const db = await getDb();
    if (db) {
      // Delete test records
      await db.delete(offerPostbacks).where(eq(offerPostbacks.completionId, 0)); // Placeholder
    }
  });

  describe("Click Tracking", () => {
    it("should record a click with all parameters", async () => {
      const clickId = await recordOfferClick({
        taskId: testTaskId,
        userId: testUserId,
        clickId: `test-click-${Date.now()}`,
        ipAddress: "192.168.1.1",
        userAgent: "Mozilla/5.0",
        country: "US",
        referrer: "https://example.com",
      });

      testClickId = clickId as string;
      expect(clickId).toBeDefined();
      expect(typeof clickId).toBe("string");
    });

    it("should record a click without optional parameters", async () => {
      const clickId = await recordOfferClick({
        taskId: testTaskId,
        userId: testUserId,
        clickId: `test-click-minimal-${Date.now()}`,
      });

      expect(clickId).toBeDefined();
      expect(typeof clickId).toBe("string");
    });

    it("should retrieve clicks for an offer", async () => {
      const clicks = await getOfferClicks(testTaskId, 100, 0);
      expect(Array.isArray(clicks)).toBe(true);
      expect(clicks.length).toBeGreaterThan(0);
    });

    it("should track click with pagination", async () => {
      const page1 = await getOfferClicks(testTaskId, 1, 0);
      const page2 = await getOfferClicks(testTaskId, 1, 1);

      expect(page1).toBeDefined();
      expect(page2).toBeDefined();
    });
  });

  describe("Completion Tracking", () => {
    it("should record a completion", async () => {
      const result = await recordOfferCompletion({
        taskId: testTaskId,
        userId: testUserId,
        clickId: testClickId,
        completionId: `test-completion-${Date.now()}`,
        status: "pending",
        pointsAwarded: 100,
        conversionValue: "2.50",
        metadata: null,
      });

      expect(result).toBeDefined();
      expect(result?.completionId).toBeDefined();
      testCompletionId = result?.completionId as string;
    });

    it("should record completion with metadata", async () => {
      const result = await recordOfferCompletion({
        taskId: testTaskId,
        userId: testUserId,
        clickId: testClickId,
        completionId: `test-completion-meta-${Date.now()}`,
        status: "pending",
        pointsAwarded: 50,
        conversionValue: "1.00",
        metadata: { source: "mobile", device: "iPhone" } as any,
      });

      expect(result?.completionId).toBeDefined();
    });

    it("should retrieve completions for an offer", async () => {
      const completions = await getOfferCompletions(testTaskId, 100, 0);
      expect(Array.isArray(completions)).toBe(true);
    });

    it("should update completion status", async () => {
      // Create a completion first
      const result = await recordOfferCompletion({
        taskId: testTaskId,
        userId: testUserId,
        clickId: testClickId,
        completionId: `test-status-${Date.now()}`,
        status: "pending",
        pointsAwarded: 100,
        conversionValue: undefined,
        metadata: null,
      });

      if (result?.insertId) {
        await updateOfferCompletionStatus(result.insertId, "approved");
        const updated = await getOfferCompletions(testTaskId, 100, 0);
        expect(updated.some((c) => c.status === "approved")).toBe(true);
      }
    });
  });

  describe("Tracking Configuration", () => {
    it("should create tracking config", async () => {
      const config = await createOrUpdateTrackingConfig(testTaskId, {
        postbackUrl: "https://publisher.com/postback",
        clickIdFormat: "uuid_prefix",
        trackingEnabled: true,
      });

      expect(config).toBeDefined();
      // Verify by fetching fresh
      const fresh = await getTrackingConfig(testTaskId);
      expect(fresh?.postbackUrl).toBe("https://publisher.com/postback");
    });

    it("should retrieve tracking config", async () => {
      const config = await getTrackingConfig(testTaskId);
      expect(config).toBeDefined();
      if (config) {
        expect(config.taskId).toBe(testTaskId);
      }
    });

    it("should update tracking config", async () => {
      const updated = await createOrUpdateTrackingConfig(testTaskId, {
        postbackUrl: "https://newpublisher.com/postback",
        clickIdFormat: "uuid",
        trackingEnabled: true,
      });

      expect(updated).toBeDefined();
      // Verify the update was applied by fetching fresh
      const fresh = await getTrackingConfig(testTaskId);
      expect(fresh?.postbackUrl).toBe("https://newpublisher.com/postback");
    });

    it("should disable tracking", async () => {
      const updated = await createOrUpdateTrackingConfig(testTaskId, {
        trackingEnabled: false,
        clickIdFormat: "uuid",
      });

      expect(updated).toBeDefined();
      // Verify the update was applied
      const fresh = await getTrackingConfig(testTaskId);
      expect(fresh?.trackingEnabled).toBe(false);
    });
  });

  describe("Analytics", () => {
    it("should calculate tracking stats", async () => {
      const stats = await getTrackingStats(testTaskId);
      expect(stats).toBeDefined();
      expect(typeof stats?.clicks).toBe("number");
      expect(typeof stats?.completions).toBe("number");
      expect(typeof stats?.conversions).toBe("number");
      expect(typeof stats?.conversionRate).toBe("number");
    });

    it("should calculate postback stats", async () => {
      const stats = await getPostbackStats(testTaskId);
      expect(stats).toBeDefined();
      expect(typeof stats?.total).toBe("number");
      expect(typeof stats?.success).toBe("number");
      expect(typeof stats?.failed).toBe("number");
      expect(typeof stats?.pending).toBe("number");
    });
  });

  describe("Postback Delivery", () => {
    it("should validate correct postback URLs", () => {
      expect(validatePostbackUrl("https://example.com/postback")).toBe(true);
      expect(validatePostbackUrl("http://example.com/postback")).toBe(true);
      expect(validatePostbackUrl("https://example.com:8080/postback?key=value")).toBe(true);
    });

    it("should reject invalid postback URLs", () => {
      expect(validatePostbackUrl("not-a-url")).toBe(false);
      expect(validatePostbackUrl("ftp://example.com")).toBe(false);
      expect(validatePostbackUrl("")).toBe(false);
    });

    it("should return correct retry schedule", () => {
      expect(getRetrySchedule(0)).toContain("minute");
      expect(getRetrySchedule(1)).toContain("minute");
      expect(getRetrySchedule(2)).toContain("minute");
      expect(getRetrySchedule(3)).toContain("hour");
      expect(getRetrySchedule(4)).toContain("hour");
      expect(getRetrySchedule(5)).toBe("No more retries");
    });

    it("should create postback record", async () => {
      const result = await recordOfferCompletion({
        taskId: testTaskId,
        userId: testUserId,
        clickId: testClickId,
        completionId: `test-postback-${Date.now()}`,
        status: "approved",
        pointsAwarded: 100,
        conversionValue: undefined,
        metadata: null,
      });

      if (result?.insertId) {
        const postback = await createPostback({
          completionId: result.insertId,
          postbackUrl: "https://example.com/postback",
          status: "pending",
        });

        expect(postback).toBeDefined();
      }
    });

    it("should handle postback with network error", async () => {
      // Mock fetch to simulate network error
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      const result = await recordOfferCompletion({
        taskId: testTaskId,
        userId: testUserId,
        clickId: testClickId,
        completionId: `test-network-error-${Date.now()}`,
        status: "approved",
        pointsAwarded: 100,
        conversionValue: undefined,
        metadata: null,
      });

      if (result?.insertId) {
        const postback = await createPostback({
          completionId: result.insertId,
          postbackUrl: "https://example.com/postback",
          status: "pending",
        });

        // Attempt to send postback
        const success = await sendPostback(postback?.id || 0);
        expect(success).toBe(false);
      }

      global.fetch = originalFetch;
    });
  });

  describe("Integration Tests", () => {
    it("should complete full tracking flow", async () => {
      // 1. Record click
      const clickId = await recordOfferClick({
        taskId: testTaskId,
        userId: testUserId,
        clickId: `integration-test-${Date.now()}`,
        country: "US",
      });

      expect(clickId).toBeDefined();

      // 2. Record completion
      const completionResult = await recordOfferCompletion({
        taskId: testTaskId,
        userId: testUserId,
        clickId: clickId as string,
        completionId: `integration-completion-${Date.now()}`,
        status: "pending",
        pointsAwarded: 100,
        conversionValue: "2.50",
        metadata: null,
      });

      expect(completionResult?.completionId).toBeDefined();

      // 3. Get stats
      const stats = await getTrackingStats(testTaskId);
      expect(stats?.clicks).toBeGreaterThan(0);
      expect(stats?.completions).toBeGreaterThan(0);
    });

    it("should handle multiple clicks and completions", async () => {
      const clickIds: string[] = [];

      // Record multiple clicks
      for (let i = 0; i < 3; i++) {
        const clickId = await recordOfferClick({
          taskId: testTaskId,
          userId: testUserId + i,
          clickId: `multi-click-${i}-${Date.now()}`,
        });
        clickIds.push(clickId as string);
      }

      expect(clickIds.length).toBe(3);

      // Record completions for some clicks
      for (let i = 0; i < 2; i++) {
        const result = await recordOfferCompletion({
          taskId: testTaskId,
          userId: testUserId + i,
          clickId: clickIds[i],
          completionId: `multi-completion-${i}-${Date.now()}`,
          status: "pending",
          pointsAwarded: 100,
          conversionValue: undefined,
          metadata: null,
        });

        expect(result?.completionId).toBeDefined();
      }

      // Verify stats
      const stats = await getTrackingStats(testTaskId);
      expect(stats?.clicks).toBeGreaterThanOrEqual(3);
      expect(stats?.completions).toBeGreaterThanOrEqual(2);
    });
  });
});

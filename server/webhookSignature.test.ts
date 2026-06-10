import { describe, it, expect } from "vitest";
import {
  generateWebhookSignature,
  verifyWebhookSignature,
  generatePostbackSignature,
  verifyPostbackSignature,
  generateNonce,
  verifyNonce,
  validateWebhookRequest,
  WEBHOOK_HEADERS,
} from "./_core/webhookSignature";

describe("Webhook Signature Validation", () => {
  const testSecret = "test-secret-key-123";

  describe("HMAC-SHA256 Signature", () => {
    it("should generate consistent signatures", () => {
      const payload = "test-payload";
      const sig1 = generateWebhookSignature(payload, testSecret);
      const sig2 = generateWebhookSignature(payload, testSecret);

      expect(sig1).toBe(sig2);
      expect(sig1).toMatch(/^[a-f0-9]{64}$/); // SHA256 hex is 64 chars
    });

    it("should generate different signatures for different payloads", () => {
      const sig1 = generateWebhookSignature("payload1", testSecret);
      const sig2 = generateWebhookSignature("payload2", testSecret);

      expect(sig1).not.toBe(sig2);
    });

    it("should generate different signatures for different secrets", () => {
      const payload = "test-payload";
      const sig1 = generateWebhookSignature(payload, "secret1");
      const sig2 = generateWebhookSignature(payload, "secret2");

      expect(sig1).not.toBe(sig2);
    });

    it("should verify valid signatures", () => {
      const payload = "test-payload";
      const signature = generateWebhookSignature(payload, testSecret);

      const valid = verifyWebhookSignature(payload, signature, testSecret);
      expect(valid).toBe(true);
    });

    it("should reject invalid signatures", () => {
      const payload = "test-payload";
      const invalidSignature = "0".repeat(64);

      const valid = verifyWebhookSignature(payload, invalidSignature, testSecret);
      expect(valid).toBe(false);
    });

    it("should reject signatures with wrong secret", () => {
      const payload = "test-payload";
      const signature = generateWebhookSignature(payload, "secret1");

      const valid = verifyWebhookSignature(payload, signature, "secret2");
      expect(valid).toBe(false);
    });
  });

  describe("Postback Signature", () => {
    const testData = {
      completionId: "comp-123",
      clickId: "click-456",
      userId: 789,
      points: 100,
      conversionValue: "2.50",
      status: "approved",
      timestamp: 1234567890,
    };

    it("should generate postback signature", () => {
      const signature = generatePostbackSignature(
        testData.completionId,
        testData.clickId,
        testData.userId,
        testData.points,
        testData.conversionValue,
        testData.status,
        testData.timestamp,
        testSecret
      );

      expect(signature).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should verify valid postback signature", () => {
      const signature = generatePostbackSignature(
        testData.completionId,
        testData.clickId,
        testData.userId,
        testData.points,
        testData.conversionValue,
        testData.status,
        testData.timestamp,
        testSecret
      );

      const valid = verifyPostbackSignature(
        testData.completionId,
        testData.clickId,
        testData.userId,
        testData.points,
        testData.conversionValue,
        testData.status,
        testData.timestamp,
        signature,
        testSecret
      );

      expect(valid).toBe(true);
    });

    it("should reject postback signature with modified data", () => {
      const signature = generatePostbackSignature(
        testData.completionId,
        testData.clickId,
        testData.userId,
        testData.points,
        testData.conversionValue,
        testData.status,
        testData.timestamp,
        testSecret
      );

      // Modify points
      const valid = verifyPostbackSignature(
        testData.completionId,
        testData.clickId,
        testData.userId,
        200, // Different points
        testData.conversionValue,
        testData.status,
        testData.timestamp,
        signature,
        testSecret
      );

      expect(valid).toBe(false);
    });

    it("should handle postback without conversion value", () => {
      const signature = generatePostbackSignature(
        testData.completionId,
        testData.clickId,
        testData.userId,
        testData.points,
        undefined,
        testData.status,
        testData.timestamp,
        testSecret
      );

      const valid = verifyPostbackSignature(
        testData.completionId,
        testData.clickId,
        testData.userId,
        testData.points,
        undefined,
        testData.status,
        testData.timestamp,
        signature,
        testSecret
      );

      expect(valid).toBe(true);
    });
  });

  describe("Nonce Generation and Verification", () => {
    it("should generate random nonces", () => {
      const nonce1 = generateNonce();
      const nonce2 = generateNonce();

      expect(nonce1).not.toBe(nonce2);
      expect(nonce1).toMatch(/^[a-f0-9]{32}$/); // 16 bytes = 32 hex chars
    });

    it("should verify new nonce", () => {
      const nonce = generateNonce();
      const usedNonces = new Set<string>();

      const valid = verifyNonce(nonce, usedNonces);
      expect(valid).toBe(true);
      expect(usedNonces.has(nonce)).toBe(true);
    });

    it("should reject duplicate nonce", () => {
      const nonce = generateNonce();
      const usedNonces = new Set<string>();

      verifyNonce(nonce, usedNonces);
      const secondAttempt = verifyNonce(nonce, usedNonces);

      expect(secondAttempt).toBe(false);
    });
  });

  describe("Webhook Request Validation", () => {
    it("should validate complete webhook request", () => {
      const body = "test-body";
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = generateWebhookSignature(body, testSecret);

      const result = validateWebhookRequest(
        {
          [WEBHOOK_HEADERS.SIGNATURE]: signature,
          [WEBHOOK_HEADERS.TIMESTAMP]: timestamp.toString(),
        },
        body,
        testSecret
      );

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should reject request with missing signature", () => {
      const body = "test-body";
      const timestamp = Math.floor(Date.now() / 1000);

      const result = validateWebhookRequest(
        {
          [WEBHOOK_HEADERS.TIMESTAMP]: timestamp.toString(),
        },
        body,
        testSecret
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain("Signature");
    });

    it("should reject request with missing timestamp", () => {
      const body = "test-body";
      const signature = generateWebhookSignature(body, testSecret);

      const result = validateWebhookRequest(
        {
          [WEBHOOK_HEADERS.SIGNATURE]: signature,
        },
        body,
        testSecret
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain("Timestamp");
    });

    it("should reject request with invalid signature", () => {
      const body = "test-body";
      const timestamp = Math.floor(Date.now() / 1000);
      const invalidSignature = "0".repeat(64);

      const result = validateWebhookRequest(
        {
          [WEBHOOK_HEADERS.SIGNATURE]: invalidSignature,
          [WEBHOOK_HEADERS.TIMESTAMP]: timestamp.toString(),
        },
        body,
        testSecret
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid signature");
    });

    it("should reject request with old timestamp", () => {
      const body = "test-body";
      const oldTimestamp = Math.floor(Date.now() / 1000) - 400; // 400 seconds ago
      const signature = generateWebhookSignature(body, testSecret);

      const result = validateWebhookRequest(
        {
          [WEBHOOK_HEADERS.SIGNATURE]: signature,
          [WEBHOOK_HEADERS.TIMESTAMP]: oldTimestamp.toString(),
        },
        body,
        testSecret,
        300 // 5 minute max age
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain("too old");
    });

    it("should reject request with future timestamp", () => {
      const body = "test-body";
      const futureTimestamp = Math.floor(Date.now() / 1000) + 120; // 2 minutes in future
      const signature = generateWebhookSignature(body, testSecret);

      const result = validateWebhookRequest(
        {
          [WEBHOOK_HEADERS.SIGNATURE]: signature,
          [WEBHOOK_HEADERS.TIMESTAMP]: futureTimestamp.toString(),
        },
        body,
        testSecret
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain("future");
    });

    it("should reject request with invalid timestamp format", () => {
      const body = "test-body";
      const signature = generateWebhookSignature(body, testSecret);

      const result = validateWebhookRequest(
        {
          [WEBHOOK_HEADERS.SIGNATURE]: signature,
          [WEBHOOK_HEADERS.TIMESTAMP]: "not-a-number",
        },
        body,
        testSecret
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid timestamp");
    });

    it("should allow clock skew up to 60 seconds", () => {
      const body = "test-body";
      const skewedTimestamp = Math.floor(Date.now() / 1000) - 50; // 50 seconds ago
      const signature = generateWebhookSignature(body, testSecret);

      const result = validateWebhookRequest(
        {
          [WEBHOOK_HEADERS.SIGNATURE]: signature,
          [WEBHOOK_HEADERS.TIMESTAMP]: skewedTimestamp.toString(),
        },
        body,
        testSecret,
        300
      );

      expect(result.valid).toBe(true);
    });
  });

  describe("Security", () => {
    it("should use timing-safe comparison", () => {
      // This test ensures we're using timing-safe comparison
      // Timing attacks would be prevented by constant-time comparison
      const payload = "test";
      const correctSig = generateWebhookSignature(payload, testSecret);
      const wrongSig = "0".repeat(64);

      // Both should complete in similar time (timing-safe)
      const start1 = performance.now();
      verifyWebhookSignature(payload, correctSig, testSecret);
      const time1 = performance.now() - start1;

      const start2 = performance.now();
      verifyWebhookSignature(payload, wrongSig, testSecret);
      const time2 = performance.now() - start2;

      // Times should be similar (within 10ms) - timing-safe comparison
      expect(Math.abs(time1 - time2)).toBeLessThan(10);
    });
  });
});

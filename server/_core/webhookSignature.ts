import crypto from "crypto";

/**
 * Webhook signature validation using HMAC-SHA256
 * Ensures postback requests are authentic and haven't been tampered with
 */

/**
 * Generate HMAC-SHA256 signature for postback data
 * @param payload - The postback payload (typically JSON stringified)
 * @param secret - The shared secret key
 * @returns Hex-encoded signature
 */
export function generateWebhookSignature(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * Verify webhook signature
 * @param payload - The postback payload (typically JSON stringified)
 * @param signature - The signature from the request header
 * @param secret - The shared secret key
 * @returns true if signature is valid
 */
export function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = generateWebhookSignature(payload, secret);
  // Use timing-safe comparison to prevent timing attacks
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
}

/**
 * Generate signature for outgoing postback request
 * @param completionId - Completion ID
 * @param clickId - Click ID
 * @param userId - User ID
 * @param points - Points awarded
 * @param conversionValue - Conversion value
 * @param status - Completion status
 * @param timestamp - Timestamp
 * @param secret - Shared secret key
 * @returns Signature to include in X-Webhook-Signature header
 */
export function generatePostbackSignature(
  completionId: string,
  clickId: string,
  userId: number,
  points: number,
  conversionValue: string | undefined,
  status: string,
  timestamp: number,
  secret: string
): string {
  // Create canonical payload string for consistent signing
  const payload = [
    `completion_id=${completionId}`,
    `click_id=${clickId}`,
    `user_id=${userId}`,
    `points=${points}`,
    ...(conversionValue ? [`conversion_value=${conversionValue}`] : []),
    `status=${status}`,
    `timestamp=${timestamp}`,
  ]
    .sort()
    .join("&");

  return generateWebhookSignature(payload, secret);
}

/**
 * Verify incoming postback signature
 * @param completionId - Completion ID from postback
 * @param clickId - Click ID from postback
 * @param userId - User ID from postback
 * @param points - Points from postback
 * @param conversionValue - Conversion value from postback
 * @param status - Status from postback
 * @param timestamp - Timestamp from postback
 * @param signature - Signature from X-Webhook-Signature header
 * @param secret - Shared secret key
 * @returns true if signature is valid
 */
export function verifyPostbackSignature(
  completionId: string,
  clickId: string,
  userId: number,
  points: number,
  conversionValue: string | undefined,
  status: string,
  timestamp: number,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = generatePostbackSignature(
    completionId,
    clickId,
    userId,
    points,
    conversionValue,
    status,
    timestamp,
    secret
  );

  try {
    return crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expectedSignature, "hex"));
  } catch {
    return false;
  }
}

/**
 * Generate nonce for replay attack prevention
 * @returns Random nonce string
 */
export function generateNonce(): string {
  return crypto.randomBytes(16).toString("hex");
}

/**
 * Verify nonce hasn't been used before (implement with cache/DB)
 * @param nonce - Nonce to verify
 * @param usedNonces - Set of previously used nonces
 * @returns true if nonce is valid and hasn't been used
 */
export function verifyNonce(nonce: string, usedNonces: Set<string>): boolean {
  if (usedNonces.has(nonce)) {
    return false;
  }
  usedNonces.add(nonce);
  return true;
}

/**
 * Webhook header names
 */
export const WEBHOOK_HEADERS = {
  SIGNATURE: "x-webhook-signature",
  TIMESTAMP: "x-webhook-timestamp",
  NONCE: "x-webhook-nonce",
} as const;

/**
 * Validate webhook request headers and signature
 * @param headers - Request headers
 * @param body - Request body
 * @param secret - Shared secret key
 * @param maxAgeSeconds - Maximum age of request in seconds (default: 300 = 5 minutes)
 * @returns { valid: boolean; error?: string }
 */
export function validateWebhookRequest(
  headers: Record<string, string | string[] | undefined>,
  body: string,
  secret: string,
  maxAgeSeconds: number = 300
): { valid: boolean; error?: string } {
  // Check for required headers
  const signature = headers[WEBHOOK_HEADERS.SIGNATURE];
  const timestamp = headers[WEBHOOK_HEADERS.TIMESTAMP];

  if (!signature || typeof signature !== "string") {
    return { valid: false, error: "Missing or invalid X-Webhook-Signature header" };
  }

  if (!timestamp || typeof timestamp !== "string") {
    return { valid: false, error: "Missing or invalid X-Webhook-Timestamp header" };
  }

  // Verify timestamp is recent (prevent replay attacks)
  const requestTime = parseInt(timestamp, 10);
  if (isNaN(requestTime)) {
    return { valid: false, error: "Invalid timestamp format" };
  }

  const currentTime = Math.floor(Date.now() / 1000);
  const age = currentTime - requestTime;

  if (age > maxAgeSeconds) {
    return { valid: false, error: `Request too old (${age}s > ${maxAgeSeconds}s)` };
  }

  if (age < -60) {
    // Allow 60 seconds clock skew
    return { valid: false, error: "Request timestamp is in the future" };
  }

  // Verify signature
  try {
    const expectedSignature = generateWebhookSignature(body, secret);
    if (!crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expectedSignature, "hex"))) {
      return { valid: false, error: "Invalid signature" };
    }
  } catch (error) {
    return { valid: false, error: "Signature verification failed" };
  }

  return { valid: true };
}

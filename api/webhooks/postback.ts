import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "crypto";
import { getDb } from "../../server/db.js";
import { offerCompletions, affiliateNetworks, users, userPointsHistory, postbackAuditLogs } from "../../drizzle/schema.js";
import { eq, sql } from "drizzle-orm";

/**
 * Get client IP address from request (handles proxies)
 */
function getClientIp(req: VercelRequest): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  return req.socket.remoteAddress || "unknown";
}

/**
 * Parse postback data based on network configuration
 */
function parsePostbackData(
  req: VercelRequest,
  network: any,
  macroFieldMapping: Record<string, string>
): Record<string, any> {
  let data: Record<string, any> = {};

  if (network.postbackFormat === "json") {
    data = req.body || {};
  } else if (network.postbackFormat === "query_params") {
    data = req.query as Record<string, any>;
  } else {
    data = req.body || {};
  }

  const mappedData: Record<string, any> = {};
  for (const [macroName, fieldName] of Object.entries(macroFieldMapping)) {
    if (data[macroName] !== undefined) {
      mappedData[fieldName] = data[macroName];
    }
  }

  return mappedData;
}

/**
 * Validate postback signature and return validation result
 */
function validateSignatureWithDetails(
  req: VercelRequest,
  network: any,
  payload: string
): { valid: boolean; signature: string | null; error: string | null } {
  const signature = (req.headers["x-signature"] as string) || (req.query.signature as string);

  if (!signature) {
    return { valid: false, signature: null, error: "No signature provided" };
  }

  const expectedSignature = crypto
    .createHmac("sha256", network.webhookSecret)
    .update(payload)
    .digest("hex");

  if (signature !== expectedSignature) {
    return {
      valid: false,
      signature,
      error: `Signature mismatch. Expected: ${expectedSignature.substring(0, 16)}..., Got: ${signature.substring(0, 16)}...`,
    };
  }

  return { valid: true, signature, error: null };
}

/**
 * Log postback to audit table
 */
async function logPostbackAudit(
  db: any,
  networkId: number,
  completionId: string,
  rawPayload: string,
  payloadFormat: string,
  signatureProvided: string | null,
  signatureValid: boolean,
  signatureError: string | null,
  parsedData: Record<string, any>,
  macroMappingUsed: Record<string, string>,
  extractedStatus: string,
  extractedPayout: number | null,
  httpMethod: string,
  sourceIp: string,
  userAgent: string | undefined,
  processingStatus: "success" | "failed" | "pending",
  processingError: string | null
) {
  try {
    await db.insert(postbackAuditLogs).values({
      affiliateNetworkId: networkId,
      completionId,
      rawPayload,
      payloadFormat: payloadFormat as any,
      signatureProvided,
      signatureValid,
      signatureError,
      parsedData: JSON.stringify(parsedData),
      macroMappingUsed: JSON.stringify(macroMappingUsed),
      extractedStatus: extractedStatus as any,
      extractedPayout,
      httpMethod,
      sourceIp,
      userAgent,
      processingStatus,
      processingError,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error("[Postback Audit] Failed to log postback:", error);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let networkId: number | undefined;
  let completionId: string | undefined;
  let processingStatus: "success" | "failed" | "pending" = "pending";
  let processingError: string | null = null;
  let signatureValid = false;
  let signatureError: string | null = null;
  let signatureProvided: string | null = null;
  let extractedStatus = "pending";
  let extractedPayout: number | null = null;
  let rawPayload = "";
  let parsedData: Record<string, any> = {};
  let macroMappingUsed: Record<string, string> = {};
  let payloadFormat = "url_encoded";

  try {
    const sourceIp = getClientIp(req);
    const userAgent = req.headers["user-agent"];

    networkId = req.query.network_id
      ? parseInt(req.query.network_id as string)
      : (req.body as any)?.network_id
      ? parseInt((req.body as any).network_id)
      : undefined;

    if (!networkId || isNaN(networkId)) {
      processingStatus = "failed";
      processingError = "network_id is required and must be a number";
      return res.status(400).json({ error: processingError });
    }

    const db = await getDb();
    if (!db) {
      processingStatus = "failed";
      processingError = "Database connection failed";
      return res.status(500).json({ error: processingError });
    }

    const networks = await db
      .select()
      .from(affiliateNetworks)
      .where(eq(affiliateNetworks.id, networkId));

    if (!networks || networks.length === 0) {
      processingStatus = "failed";
      processingError = "Affiliate network not found";
      return res.status(404).json({ error: processingError });
    }

    const network = networks[0];
    payloadFormat = network.postbackFormat || "url_encoded";

    if (network.postbackFormat === "json") {
      rawPayload = JSON.stringify(req.body || {});
    } else if (network.postbackFormat === "query_params") {
      rawPayload = new URLSearchParams(req.query as Record<string, string>).toString();
    } else {
      rawPayload = JSON.stringify(req.body || {});
    }

    let macroFieldMapping: Record<string, string> = {};
    if (network.macroFieldMapping) {
      try {
        macroFieldMapping = JSON.parse(network.macroFieldMapping);
        macroMappingUsed = macroFieldMapping;
      } catch (e) {
        console.error(`[Postback] Failed to parse macro field mapping for network ${networkId}`, e);
        macroFieldMapping = {
          subid: "clickId",
          status: "status",
          payout: "payout",
          transaction_id: "transactionId",
        };
        macroMappingUsed = macroFieldMapping;
      }
    }

    parsedData = parsePostbackData(req, network, macroFieldMapping);

    completionId = parsedData.clickId || (req.query.click_id as string) || (req.body as any)?.click_id;
    const status = parsedData.status || (req.query.status as string) || (req.body as any)?.status;
    const payout = parsedData.payout || (req.query.payout as string) || (req.body as any)?.payout;
    const transactionId = parsedData.transactionId || (req.query.transaction_id as string) || (req.body as any)?.transaction_id;
    const sessionUuid = parsedData.sessionUuid || parsedData.session_uuid || (req.query.session_uuid as string) || (req.body as any)?.session_uuid;

    extractedStatus = status || "pending";
    if (payout) {
      extractedPayout = parseFloat(payout);
    }

    if (!completionId) {
      processingStatus = "failed";
      processingError = "clickId (or mapped subid) is required";
      await logPostbackAudit(
        db,
        networkId,
        "unknown",
        rawPayload,
        payloadFormat,
        signatureProvided,
        signatureValid,
        signatureError,
        parsedData,
        macroMappingUsed,
        extractedStatus,
        extractedPayout,
        req.method || "POST",
        sourceIp,
        userAgent as string | undefined,
        processingStatus,
        processingError
      );
      return res.status(400).json({ error: processingError });
    }

    if (!status || !["pending", "approved", "rejected"].includes(status)) {
      processingStatus = "failed";
      processingError = "status must be one of: pending, approved, rejected";
      await logPostbackAudit(
        db,
        networkId,
        completionId,
        rawPayload,
        payloadFormat,
        signatureProvided,
        signatureValid,
        signatureError,
        parsedData,
        macroMappingUsed,
        extractedStatus,
        extractedPayout,
        req.method || "POST",
        sourceIp,
        userAgent as string | undefined,
        processingStatus,
        processingError
      );
      return res.status(400).json({ error: processingError });
    }

    let signaturePayload = "";
    if (network.postbackFormat === "json") {
      signaturePayload = JSON.stringify(parsedData);
    } else if (network.postbackFormat === "query_params") {
      const params = new URLSearchParams(req.query as Record<string, string>);
      params.delete("signature");
      params.delete("network_id");
      signaturePayload = params.toString();
    } else {
      signaturePayload = JSON.stringify(parsedData);
    }

    const signatureValidation = validateSignatureWithDetails(req, network, signaturePayload);
    signatureValid = signatureValidation.valid;
    signatureProvided = signatureValidation.signature;
    signatureError = signatureValidation.error;

    if (!signatureValid && signatureProvided) {
      processingStatus = "failed";
      processingError = `Signature validation failed: ${signatureError}`;
      console.warn(`[Postback Webhook] Invalid signature for network ${networkId}, clickId ${completionId}`);
      await logPostbackAudit(
        db,
        networkId,
        completionId,
        rawPayload,
        payloadFormat,
        signatureProvided,
        signatureValid,
        signatureError,
        parsedData,
        macroMappingUsed,
        extractedStatus,
        extractedPayout,
        req.method || "POST",
        sourceIp,
        userAgent as string | undefined,
        processingStatus,
        processingError
      );
      return res.status(401).json({ error: "Invalid signature" });
    } else if (!signatureProvided) {
      signatureValid = true;
      console.log(`[Postback Webhook] No signature provided for network ${networkId}, allowing for testing`);
    }

    const completions = await db
      .select()
      .from(offerCompletions)
      .where(eq(offerCompletions.completionId, completionId));

    if (!completions || completions.length === 0) {
      processingStatus = "failed";
      processingError = `Offer completion not found for clickId ${completionId}`;
      console.warn(`[Postback Webhook] Offer completion not found for clickId ${completionId}`);
      await logPostbackAudit(
        db,
        networkId,
        completionId,
        rawPayload,
        payloadFormat,
        signatureProvided,
        signatureValid,
        signatureError,
        parsedData,
        macroMappingUsed,
        extractedStatus,
        extractedPayout,
        req.method || "POST",
        sourceIp,
        userAgent as string | undefined,
        processingStatus,
        processingError
      );
      return res.status(404).json({ error: "Offer completion not found" });
    }

    const completion = completions[0];
    const newStatus = status as "pending" | "approved" | "rejected";

    let pointsAdjustment = 0;
    if (newStatus === "approved" && completion.status !== "approved") {
      pointsAdjustment = completion.pointsAwarded;
    } else if (newStatus === "rejected" && completion.status === "approved") {
      pointsAdjustment = -completion.pointsAwarded;
    }

    const updateData: any = {
      status: newStatus,
    };
    if (payout) {
      updateData.conversionValue = parseFloat(payout);
    }
    if (sessionUuid) {
      updateData.sessionUuid = sessionUuid;
    }
    if (transactionId) {
      const metadata = (completion.metadata as any) || {};
      metadata.transactionId = transactionId;
      updateData.metadata = metadata;
    }

    await db
      .update(offerCompletions)
      .set(updateData)
      .where(eq(offerCompletions.id, completion.id));

    if (pointsAdjustment !== 0) {
      const userResults = await db
        .select()
        .from(users)
        .where(eq(users.id, completion.userId));

      if (userResults && userResults.length > 0) {
        const newPoints = Math.max(0, (userResults[0].points || 0) + pointsAdjustment);
        await db
          .update(users)
          .set({ points: newPoints, updatedAt: new Date() })
          .where(eq(users.id, completion.userId));

        await db.insert(userPointsHistory).values({
          userId: completion.userId,
          completionId: completionId,
          taskId: completion.taskId,
          pointsAmount: pointsAdjustment,
          pointsStatus: newStatus === "approved" ? "confirmed" : "pending",
          isLockedForCashout: false,
          awardedAt: new Date(),
          confirmedAt: newStatus === "approved" ? new Date() : undefined,
        });
      }
    }

    processingStatus = "success";
    await logPostbackAudit(
      db,
      networkId,
      completionId,
      rawPayload,
      payloadFormat,
      signatureProvided,
      signatureValid,
      signatureError,
      parsedData,
      macroMappingUsed,
      extractedStatus,
      extractedPayout,
      req.method || "POST",
      sourceIp,
      userAgent as string | undefined,
      processingStatus,
      processingError
    );

    res.json({
      success: true,
      completionId,
      status: newStatus,
      pointsAdjustment,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    processingStatus = "failed";
    processingError = error instanceof Error ? error.message : "Unknown error";
    console.error("[Postback Webhook] Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

import { verifyToken } from "@clerk/backend";
import { ENV } from "./env";
import * as db from "../db";
import type { VercelRequest } from "@vercel/node";

import type { User } from "../../drizzle/schema";

export type AuthenticatedUser = User;

/**
 * Extract Clerk session token from request headers
 */
function getClerkToken(req: VercelRequest): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.substring(7);
}

/**
 * Verify Clerk JWT token and extract user info
 */
async function verifyClerkToken(token: string): Promise<any> {
  try {
    console.log("[Clerk] Verifying token...");
    const decoded = await verifyToken(token, {
      secretKey: ENV.clerkSecretKey,
    });
    console.log("[Clerk] Token verified for user:", decoded.sub);
    return decoded;
  } catch (error) {
    console.error("[Clerk] Token verification failed:", error);
    return null;
  }
}

/**
 * Authenticate a request using Clerk JWT
 */
export async function authenticateRequest(req: VercelRequest): Promise<AuthenticatedUser | null> {
  const token = getClerkToken(req);
  if (!token) {
    console.log("[Auth] No token found in request");
    return null;
  }

  const clerkUser = await verifyClerkToken(token);
  if (!clerkUser) {
    console.log("[Auth] Clerk user verification failed");
    return null;
  }

  // Use Clerk user ID as the external identity (openId)
  const clerkUserId = clerkUser.sub;
  const email = clerkUser.email || null;
  const name = clerkUser.given_name || clerkUser.name || null;

  try {
    // Sync user to database if not exists
    console.log("[Auth] Syncing user to DB:", clerkUserId);
    const existingUser = await db.getUserByOpenId(clerkUserId);
    if (!existingUser) {
      console.log("[Auth] Creating new user in DB");
      await db.upsertUser({
        openId: clerkUserId,
        email,
        name,
        loginMethod: "clerk",
        lastSignedIn: new Date(),
        ipAddress: getClientIp(req),
        country: null,
      });
    }

    // Fetch the user from database
    const user = await db.getUserByOpenId(clerkUserId);
    if (!user) {
      console.error("[Auth] Failed to fetch user from DB after sync");
      return null;
    }

    // Check if user is banned
    if (user.isBanned) {
      console.warn("[Auth] Banned user attempted login:", user.id);
      throw new Error(`User is banned: ${user.banReason || "No reason provided"}`);
    }

    console.log("[Auth] Successfully authenticated user:", user.id);
    return user;
  } catch (error) {
    console.error("[Auth] Database error during authentication:", error);
    return null;
  }
}

/**
 * Get client IP address from request (handles proxies)
 */
function getClientIp(req: VercelRequest): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  return req.socket?.remoteAddress || "unknown";
}

/**
 * Handle Clerk webhook for user events (sign-up, update, delete)
 */
export async function handleClerkWebhook(
  event: any
): Promise<{ success: boolean; message: string }> {
  const eventType = event.type;

  try {
    switch (eventType) {
      case "user.created": {
        const clerkUser = event.data;
        const email = clerkUser.email_addresses?.[0]?.email_address || null;
        const name = clerkUser.first_name || clerkUser.username || null;

        await db.upsertUser({
          openId: clerkUser.id,
          email,
          name,
          loginMethod: "clerk",
          lastSignedIn: new Date(),
          ipAddress: null,
          country: null,
        });

        return { success: true, message: "User created successfully" };
      }

      case "user.updated": {
        const clerkUser = event.data;
        const email = clerkUser.email_addresses?.[0]?.email_address || null;
        const name = clerkUser.first_name || clerkUser.username || null;

        // Update user profile
        const dbUser = await db.getUserByOpenId(clerkUser.id);
        if (dbUser) {
          const dbInstance = await db.getDb();
          if (dbInstance) {
            const { users } = await import("../../drizzle/schema");
            const { eq } = await import("drizzle-orm");
            await dbInstance
              .update(users)
              .set({ email, name })
              .where(eq(users.id, dbUser.id));
          }
        }

        return { success: true, message: "User updated successfully" };
      }

      case "user.deleted": {
        const clerkUser = event.data;
        // Optionally: soft-delete or hard-delete the user from your database
        // For now, we'll just log it
        console.log(`[Clerk Webhook] User deleted: ${clerkUser.id}`);
        return { success: true, message: "User deletion logged" };
      }

      default:
        return { success: false, message: `Unknown event type: ${eventType}` };
    }
  } catch (error) {
    console.error("[Clerk Webhook] Error handling event:", error);
    return { success: false, message: `Error: ${String(error)}` };
  }
}

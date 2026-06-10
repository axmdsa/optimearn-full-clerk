import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { User } from "../../drizzle/schema";
import { authenticateRequest as clerkAuthenticate } from "./clerkSdk";

// Extract client IP from request (handles proxies)
export function getClientIp(req: VercelRequest): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  return req.socket?.remoteAddress || "unknown";
}

export type TrpcContext = {
  req: VercelRequest;
  res: VercelResponse;
  user: User | null;
  ip: string;
};

export async function createContextServerless(
  req: VercelRequest,
  res: VercelResponse
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await clerkAuthenticate(req);
  } catch (error) {
    // Authentication is optional for public procedures.
    console.error("[Context] Auth error:", error);
    user = null;
  }

  return {
    req,
    res,
    user,
    ip: getClientIp(req),
  };
}

// Simple IP-to-country lookup using free API
export async function getCountryFromIp(ip: string): Promise<string | undefined> {
  console.log('[Geolocation] Looking up IP:', ip);
  if (ip === "unknown" || ip === "127.0.0.1" || ip.startsWith("192.168.")) {
    console.log('[Geolocation] Skipping private/localhost IP');
    return undefined;
  }

  try {
    console.log('[Geolocation] Fetching from ip-api.com');
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=countryCode,status`);
    console.log('[Geolocation] API response status:', response.status);
    if (!response.ok) {
      console.log('[Geolocation] API returned non-ok status');
      return undefined;
    }
    const data = await response.json() as { countryCode?: string; status?: string };
    console.log('[Geolocation] API response:', data);
    if (data.status === 'fail') {
      console.log('[Geolocation] API returned fail status');
      return undefined;
    }
    console.log('[Geolocation] Country code from API:', data.countryCode);
    return data.countryCode;
  } catch (error) {
    console.warn("[Geolocation] Failed to lookup IP:", error);
    return undefined;
  }
}

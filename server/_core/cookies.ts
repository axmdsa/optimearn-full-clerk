import type { VercelRequest } from "@vercel/node";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isIpAddress(host: string) {
  // Basic IPv4 check and IPv6 presence detection.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  return host.includes(":");
}

function isSecureRequest(req: VercelRequest) {
  const proto = req.headers["x-forwarded-proto"];
  if (proto === "https") return true;

  const protoList = Array.isArray(proto) ? proto : proto?.split(",") || [];
  return protoList.some((p: string) => p.trim().toLowerCase() === "https");
}

export function getSessionCookieOptions(req: VercelRequest): {
  httpOnly: boolean;
  path: string;
  sameSite: string;
  secure: boolean;
  domain?: string;
} {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req),
  };
}

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { nodeHTTPRequestHandler } from "@trpc/server/adapters/node-http";
import { appRouter } from "../server/routers";
import { createContextServerless } from "../server/_core/context";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  return nodeHTTPRequestHandler({
    req: req as any,
    res: res as any,
    router: appRouter,
    createContext: async () => {
      return createContextServerless(req, res);
    },
    path: (req.query.trpc as string) || "",
  });
}

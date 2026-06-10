import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "../server/routers";
import { createContextServerless } from "../server/_core/context";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    res,
    router: appRouter,
    createContext: async () => {
      return createContextServerless(req, res);
    },
  });
}

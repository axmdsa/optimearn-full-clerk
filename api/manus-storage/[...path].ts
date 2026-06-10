import type { VercelRequest, VercelResponse } from "@vercel/node";
import axios from "axios";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const path = req.query.path;
  if (!path || Array.isArray(path) && path.length === 0) {
    return res.status(400).json({ error: "Path is required" });
  }

  const pathStr = Array.isArray(path) ? path.join("/") : path;
  const storageUrl = `https://storage.manus.im/${pathStr}`;

  try {
    const response = await axios.get(storageUrl, {
      responseType: "stream",
      headers: {
        "User-Agent": req.headers["user-agent"] || "OptimEarn/1.0",
      },
    });

    // Set appropriate headers
    if (response.headers["content-type"]) {
      res.setHeader("Content-Type", response.headers["content-type"]);
    }
    if (response.headers["content-length"]) {
      res.setHeader("Content-Length", response.headers["content-length"]);
    }
    if (response.headers["cache-control"]) {
      res.setHeader("Cache-Control", response.headers["cache-control"]);
    } else {
      res.setHeader("Cache-Control", "public, max-age=86400");
    }

    response.data.pipe(res);
  } catch (error) {
    console.error("[Storage Proxy] Error:", error);
    res.status(500).json({ error: "Failed to fetch resource" });
  }
}

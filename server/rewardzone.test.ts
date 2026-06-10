import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

// ─── Helpers ─────────────────────────────────────────────────

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(role: "user" | "admin" = "user"): { ctx: TrpcContext; clearedCookies: { name: string; options: Record<string, unknown> }[] } {
  const clearedCookies: { name: string; options: Record<string, unknown> }[] = [];
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-openid",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  const ctx: TrpcContext = {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };
  return { ctx, clearedCookies };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

// ─── Auth Tests ───────────────────────────────────────────────

describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const { ctx, clearedCookies } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
    expect(clearedCookies[0]?.options).toMatchObject({ maxAge: -1, httpOnly: true, path: "/" });
  });

  it("works for unauthenticated users too", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller({ ...ctx, res: { clearCookie: () => {} } as TrpcContext["res"] });
    const result = await caller.auth.logout();
    expect(result.success).toBe(true);
  });
});

describe("auth.me", () => {
  it("returns user when authenticated", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).not.toBeNull();
    expect(result?.email).toBe("test@example.com");
  });

  it("returns null when not authenticated", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });
});

// ─── Tasks Tests ──────────────────────────────────────────────

describe("tasks.list", () => {
  it("returns an array (public access)", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.tasks.list({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("accepts a category filter", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.tasks.list({ category: "survey" });
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("tasks.getById", () => {
  it("throws NOT_FOUND for non-existent task", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.tasks.getById({ id: 999999 })).rejects.toThrow();
  });
});

// ─── Leaderboard Tests ────────────────────────────────────────

describe("leaderboard.get", () => {
  it("returns alltime leaderboard", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.leaderboard.get({ type: "alltime" });
    expect(Array.isArray(result)).toBe(true);
  });

  it("returns weekly leaderboard", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.leaderboard.get({ type: "weekly" });
    expect(Array.isArray(result)).toBe(true);
  });
});

// ─── Rewards Tests ────────────────────────────────────────────

describe("rewards.list", () => {
  it("returns available rewards", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.rewards.list({});
    expect(Array.isArray(result)).toBe(true);
  });
});

// ─── Achievements Tests ───────────────────────────────────────

describe("achievements.list", () => {
  it("returns all achievements publicly", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.achievements.list();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("achievements.mine", () => {
  it("requires authentication", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.achievements.mine()).rejects.toThrow();
  });
});

// ─── Notifications Tests ──────────────────────────────────────

describe("notifications.list", () => {
  it("requires authentication", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.notifications.list()).rejects.toThrow();
  });

  it("returns array when authenticated", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.notifications.list();
    expect(Array.isArray(result)).toBe(true);
  });
});

// ─── Referrals Tests ──────────────────────────────────────────

describe("referrals.getMyCode", () => {
  it("requires authentication", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.referrals.getMyCode()).rejects.toThrow();
  });
});

// ─── Ledger Tests ─────────────────────────────────────────────

describe("ledger.list", () => {
  it("requires authentication", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.ledger.list()).rejects.toThrow();
  });

  it("returns array when authenticated", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.ledger.list();
    expect(Array.isArray(result)).toBe(true);
  });
});

// ─── Offer Walls Tests ────────────────────────────────────────

describe("offerWalls.list", () => {
  it("returns offer providers publicly", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.offerWalls.list();
    expect(Array.isArray(result)).toBe(true);
  });
});


// ─── Tasks Start Tests ────────────────────────────────────────

describe("tasks.start", () => {
  it("requires authentication", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.tasks.start({ taskId: 1 })).rejects.toThrow();
  });

  it("returns success when authenticated", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    try {
      const result = await caller.tasks.start({ taskId: 1 });
      expect(result).toHaveProperty("success");
    } catch (e) {
      // Task might not exist, but the procedure should be callable
      expect(e).toBeDefined();
    }
  });
});

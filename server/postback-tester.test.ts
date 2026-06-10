import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import { getDb } from "./db";
import { affiliateNetworks } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import type { TrpcContext } from "./_core/context";

// ─── Helpers ─────────────────────────────────────────────────

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 9999,
    openId: "test-admin-openid",
    email: "admin@example.com",
    name: "Test Admin",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  const ctx: TrpcContext = {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
  return ctx;
}

function createUserContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 8888,
    openId: "test-user-openid",
    email: "user@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  const ctx: TrpcContext = {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
  return ctx;
}

// ─── Tests ───────────────────────────────────────────────────

describe("admin.getAffiliateNetworks", () => {
  let testNetworkId: number;

  beforeAll(async () => {
    // Create a test affiliate network
    const db = await getDb();
    if (db) {
      const result = await db.insert(affiliateNetworks).values({
        name: "Test Network",
        webhookUrl: "https://example.com/webhook",
        webhookSecret: "test-secret",
        postbackTypes: "pending,approved,rejected",
        isActive: true,
        subIdParamName: "subid",
        postbackFormat: "url_encoded",
        postbackMethod: "POST",
      });
      testNetworkId = (result as any).insertId || 1;
    }
  });

  afterAll(async () => {
    // Cleanup test data
    const db = await getDb();
    if (db && testNetworkId) {
      await db.delete(affiliateNetworks).where(eq(affiliateNetworks.id, testNetworkId));
    }
  });

  it("should return affiliate networks for admin users", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const networks = await caller.admin.getAffiliateNetworks();
    
    expect(Array.isArray(networks)).toBe(true);
    expect(networks.length).toBeGreaterThan(0);
    expect(networks[0]).toHaveProperty("id");
    expect(networks[0]).toHaveProperty("name");
  });

  it("should reject non-admin users", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    
    try {
      await caller.admin.getAffiliateNetworks();
      expect.fail("Should have thrown FORBIDDEN error");
    } catch (error: any) {
      expect(error.code).toBe("FORBIDDEN");
    }
  });
});

describe("admin.sendTestPostback", () => {
  it("should send a test postback with query format", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.admin.sendTestPostback({
      networkId: 1,
      clickId: "test-click-123",
      status: "approved",
      format: "query",
    });

    expect(result).toHaveProperty("success");
    expect(result).toHaveProperty("statusCode");
    expect(result).toHaveProperty("responseTime");
    expect(typeof result.responseTime).toBe("number");
  });

  it("should send a test postback with session UUID", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.admin.sendTestPostback({
      networkId: 1,
      clickId: "test-click-456",
      status: "pending",
      sessionUuid: "550e8400-e29b-41d4-a716-446655440000",
      format: "query",
    });

    expect(result).toHaveProperty("success");
    expect(result).toHaveProperty("statusCode");
    expect(result).toHaveProperty("responseTime");
  });

  it("should send a test postback with JSON format", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.admin.sendTestPostback({
      networkId: 1,
      clickId: "test-click-789",
      status: "rejected",
      format: "json",
    });

    expect(result).toHaveProperty("success");
    expect(result).toHaveProperty("statusCode");
    expect(result).toHaveProperty("responseTime");
  });

  it("should send a test postback with custom parameters", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.admin.sendTestPostback({
      networkId: 1,
      clickId: "test-click-custom",
      status: "approved",
      customParams: {
        custom_field_1: "value1",
        custom_field_2: "value2",
      },
      format: "custom",
    });

    expect(result).toHaveProperty("success");
    expect(result).toHaveProperty("statusCode");
    expect(result).toHaveProperty("responseTime");
  });

  it("should reject non-admin users", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    
    try {
      await caller.admin.sendTestPostback({
        networkId: 1,
        clickId: "test-click-123",
        status: "approved",
        format: "query",
      });
      expect.fail("Should have thrown FORBIDDEN error");
    } catch (error: any) {
      expect(error.code).toBe("FORBIDDEN");
    }
  });

  it("should handle postback errors gracefully", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.admin.sendTestPostback({
      networkId: 9999, // Non-existent network
      clickId: "test-click-error",
      status: "approved",
      format: "query",
    });

    // Should return error response, not throw
    expect(result).toHaveProperty("success");
    expect(result.success).toBe(false);
    expect(result).toHaveProperty("error");
  });
});

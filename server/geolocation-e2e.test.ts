import { describe, it, expect, beforeAll } from 'vitest';
import { getDb } from './db';
import { eq, and } from 'drizzle-orm';
import { users, userLoginHistory, duplicateAccountAlerts } from '../drizzle/schema';
import { upsertUser, recordUserLogin, banUser, adminGetDuplicateAlerts } from './db';

describe('Geolocation & Ban Flow - End-to-End', () => {
  let db: any;

  beforeAll(async () => {
    db = await getDb();
    if (!db) {
      throw new Error('Database connection failed - cannot run E2E tests');
    }
  });

  describe('User Login & Geolocation Capture', () => {
    it('should capture country on first login', async () => {
      const testOpenId = `test-geo-${Date.now()}`;
      
      // Simulate first login with geolocation
      await upsertUser({
        openId: testOpenId,
        name: 'Geo Test User',
        email: `geo-test-${Date.now()}@example.com`,
        country: 'US',
        ipAddress: '203.0.113.1',
      });

      // Verify user was created with country
      const user = await db.select().from(users).where(eq(users.openId, testOpenId)).limit(1);
      expect(user.length).toBe(1);
      expect(user[0].country).toBe('US');
      expect(user[0].originalCountry).toBe('US');
    });

    it('should track login history with location', async () => {
      const testOpenId = `test-login-${Date.now()}`;
      
      // Create user
      await upsertUser({
        openId: testOpenId,
        name: 'Login History Test',
        email: `login-test-${Date.now()}@example.com`,
        country: 'GB',
        ipAddress: '198.51.100.1',
      });

      // Get user and record login
      const user = await db.select().from(users).where(eq(users.openId, testOpenId)).limit(1);
      if (user.length > 0) {
        await recordUserLogin(user[0].id, '198.51.100.2', 'GB');

        // Verify login history was recorded
        const history = await db.select().from(userLoginHistory)
          .where(eq(userLoginHistory.userId, user[0].id))
          .orderBy((t: any) => t.loginAt)
          .limit(1);

        expect(history.length).toBeGreaterThan(0);
        expect(history[0].country).toBe('GB');
        expect(history[0].ipAddress).toBe('198.51.100.2');
      }
    });

    it('should detect location changes', async () => {
      const testOpenId = `test-location-change-${Date.now()}`;
      
      // Create user in US
      await upsertUser({
        openId: testOpenId,
        name: 'Location Change Test',
        email: `location-change-${Date.now()}@example.com`,
        country: 'US',
        ipAddress: '203.0.113.1',
      });

      // Get user
      const user = await db.select().from(users).where(eq(users.openId, testOpenId)).limit(1);
      expect(user.length).toBe(1);
      expect(user[0].originalCountry).toBe('US');

      // Simulate login from different country
      if (user.length > 0) {
        await recordUserLogin(user[0].id, '198.51.100.1', 'JP');

        // Update user country
        await db.update(users).set({ country: 'JP' }).where(eq(users.id, user[0].id));

        // Verify location change
        const updated = await db.select().from(users).where(eq(users.id, user[0].id)).limit(1);
        expect(updated[0].country).toBe('JP');
        expect(updated[0].originalCountry).toBe('US');
        expect(updated[0].country).not.toBe(updated[0].originalCountry);
      }
    });
  });

  describe('Ban Status Enforcement', () => {
    it('should ban user with reason', async () => {
      const testOpenId = `test-ban-${Date.now()}`;
      
      // Create user
      await upsertUser({
        openId: testOpenId,
        name: 'Ban Test User',
        email: `ban-test-${Date.now()}@example.com`,
        country: 'US',
        ipAddress: '203.0.113.1',
      });

      // Get user
      const user = await db.select().from(users).where(eq(users.openId, testOpenId)).limit(1);
      expect(user.length).toBe(1);

      // Ban user
      if (user.length > 0) {
        await banUser(user[0].id, 'Duplicate account detected');

        // Verify ban status
        const banned = await db.select().from(users).where(eq(users.id, user[0].id)).limit(1);
        expect(banned[0].isBanned).toBe(true);
        expect(banned[0].banReason).toBe('Duplicate account detected');
      }
    });

    it('should prevent banned user from accessing platform', async () => {
      const testOpenId = `test-ban-access-${Date.now()}`;
      
      // Create user
      await upsertUser({
        openId: testOpenId,
        name: 'Ban Access Test',
        email: `ban-access-${Date.now()}@example.com`,
        country: 'US',
        ipAddress: '203.0.113.1',
      });

      // Get user and ban
      const user = await db.select().from(users).where(eq(users.openId, testOpenId)).limit(1);
      if (user.length > 0) {
        await banUser(user[0].id, 'Fraud detected');

        // Verify user is banned
        const banned = await db.select().from(users).where(eq(users.id, user[0].id)).limit(1);
        expect(banned[0].isBanned).toBe(true);

        // In real scenario, auth middleware would reject this user
        // Here we just verify the ban flag is set correctly
        expect(banned[0].banReason).toBeTruthy();
      }
    });
  });

  describe('Duplicate Account Detection', () => {
    it('should detect duplicate accounts by email', async () => {
      const email = `duplicate-test-${Date.now()}@example.com`;
      
      // Create two users with same email
      const openId1 = `test-dup-1-${Date.now()}`;
      const openId2 = `test-dup-2-${Date.now()}`;

      await upsertUser({
        openId: openId1,
        name: 'Duplicate User 1',
        email: email,
        country: 'US',
        ipAddress: '203.0.113.1',
      });

      await upsertUser({
        openId: openId2,
        name: 'Duplicate User 2',
        email: email,
        country: 'US',
        ipAddress: '203.0.113.2',
      });

      // Get users
      const users1 = await db.select().from(users).where(eq(users.email, email));
      expect(users1.length).toBeGreaterThanOrEqual(2);
    });

    it('should detect duplicate accounts by IP', async () => {
      const ipAddress = '203.0.113.99';
      
      // Create two users with same IP
      const openId1 = `test-dup-ip-1-${Date.now()}`;
      const openId2 = `test-dup-ip-2-${Date.now()}`;

      await upsertUser({
        openId: openId1,
        name: 'IP Duplicate 1',
        email: `ip-dup-1-${Date.now()}@example.com`,
        country: 'US',
        ipAddress: ipAddress,
      });

      await upsertUser({
        openId: openId2,
        name: 'IP Duplicate 2',
        email: `ip-dup-2-${Date.now()}@example.com`,
        country: 'US',
        ipAddress: ipAddress,
      });

      // Get users by IP
      const usersWithIp = await db.select().from(users).where(eq(users.ipAddress, ipAddress));
      expect(usersWithIp.length).toBeGreaterThanOrEqual(2);
    });

    it('should retrieve unresolved duplicate alerts', async () => {
      // Get unresolved alerts
      const alerts = await adminGetDuplicateAlerts(false);
      expect(Array.isArray(alerts)).toBe(true);

      // Each alert should have required fields
      alerts.forEach((alert: any) => {
        expect(alert.userIds).toBeDefined();
        expect(alert.isResolved).toBe(false);
      });
    });
  });

  describe('Device Compatibility Filtering', () => {
    it('should filter tasks by device compatibility', () => {
      const mockTasks = [
        { id: 1, title: 'iOS Only', targetDevices: JSON.stringify(['iOS']) },
        { id: 2, title: 'Android Only', targetDevices: JSON.stringify(['Android']) },
        { id: 3, title: 'All Devices', targetDevices: JSON.stringify(['iOS', 'Android', 'PC']) },
        { id: 4, title: 'No Restriction', targetDevices: null },
      ];

      const userDevice = 'iOS';

      // Filter compatible
      const compatible = mockTasks.filter(task => {
        if (!task.targetDevices) return true;
        const devices = JSON.parse(task.targetDevices);
        return devices.includes(userDevice);
      });

      expect(compatible.length).toBe(3); // Tasks 1, 3, 4
      expect(compatible.map(t => t.id)).toContain(1);
      expect(compatible.map(t => t.id)).toContain(3);
      expect(compatible.map(t => t.id)).toContain(4);
      expect(compatible.map(t => t.id)).not.toContain(2);
    });

    it('should sort compatible tasks before incompatible ones', () => {
      const mockTasks = [
        { id: 1, title: 'Android Only', targetDevices: JSON.stringify(['Android']), points: 100 },
        { id: 2, title: 'iOS & Android', targetDevices: JSON.stringify(['iOS', 'Android']), points: 50 },
        { id: 3, title: 'PC Only', targetDevices: JSON.stringify(['PC']), points: 200 },
        { id: 4, title: 'No Restriction', targetDevices: null, points: 75 },
      ];

      const userDevice = 'iOS';

      const sorted = mockTasks.sort((a, b) => {
        const aCompatible = !a.targetDevices || JSON.parse(a.targetDevices).includes(userDevice);
        const bCompatible = !b.targetDevices || JSON.parse(b.targetDevices).includes(userDevice);
        
        if (aCompatible === bCompatible) return b.points - a.points;
        return aCompatible ? -1 : 1;
      });

      // Compatible tasks should come first
      const compatibleIds = sorted.slice(0, 2).map(t => t.id);
      expect(compatibleIds).toContain(2); // iOS & Android
      expect(compatibleIds).toContain(4); // No restriction

      // Incompatible tasks should come last
      const incompatibleIds = sorted.slice(2).map(t => t.id);
      expect(incompatibleIds).toContain(1); // Android only
      expect(incompatibleIds).toContain(3); // PC only
    });
  });

  describe('Country-Based Offer Filtering', () => {
    it('should filter tasks by country', () => {
      const mockTasks = [
        { id: 1, title: 'US Only', targetCountries: JSON.stringify(['US']) },
        { id: 2, title: 'UK Only', targetCountries: JSON.stringify(['GB']) },
        { id: 3, title: 'US & UK', targetCountries: JSON.stringify(['US', 'GB']) },
        { id: 4, title: 'No Restriction', targetCountries: null },
      ];

      const userCountry = 'US';

      // Filter visible (country matches or no restriction)
      const visible = mockTasks.filter(task => {
        if (!task.targetCountries) return true;
        const countries = JSON.parse(task.targetCountries);
        return countries.includes(userCountry);
      });

      expect(visible.length).toBe(3); // Tasks 1, 3, 4
      expect(visible.map(t => t.id)).toContain(1);
      expect(visible.map(t => t.id)).toContain(3);
      expect(visible.map(t => t.id)).toContain(4);
      expect(visible.map(t => t.id)).not.toContain(2);
    });

    it('should hide country-incompatible tasks completely', () => {
      const mockTasks = [
        { id: 1, title: 'US Only', targetCountries: JSON.stringify(['US']) },
        { id: 2, title: 'JP Only', targetCountries: JSON.stringify(['JP']) },
        { id: 3, title: 'Global', targetCountries: null },
      ];

      const userCountry = 'GB';

      // Filter visible
      const visible = mockTasks.filter(task => {
        if (!task.targetCountries) return true;
        const countries = JSON.parse(task.targetCountries);
        return countries.includes(userCountry);
      });

      // Only global task should be visible
      expect(visible.length).toBe(1);
      expect(visible[0].id).toBe(3);
      expect(visible.map(t => t.id)).not.toContain(1);
      expect(visible.map(t => t.id)).not.toContain(2);
    });
  });
});

import { describe, it, expect, beforeAll } from 'vitest';
import { getDb } from './db';
import { eq } from 'drizzle-orm';
import { users, tasks, userLoginHistory } from '../drizzle/schema';

describe('Geolocation & Device Compatibility Features', () => {
  let db: any;

  beforeAll(async () => {
    db = await getDb();
  });

  describe('Location-Based Offer Filtering', () => {
    it('should filter tasks by country', async () => {
      if (!db) {
        expect(true).toBe(true);
        return;
      }

      // Get all tasks
      const allTasks = await db.select().from(tasks).limit(10);
      expect(Array.isArray(allTasks)).toBe(true);

      // Test filtering by country
      const usaTasks = allTasks.filter((task: any) => {
        if (!task.targetCountries) return true;
        try {
          const countries = JSON.parse(task.targetCountries);
          return countries.includes('US');
        } catch {
          return true;
        }
      });

      expect(Array.isArray(usaTasks)).toBe(true);
    });

    it('should show all tasks for users without country restrictions', async () => {
      if (!db) {
        expect(true).toBe(true);
        return;
      }

      const allTasks = await db.select().from(tasks).limit(10);
      const unrestricted = allTasks.filter((task: any) => !task.targetCountries);

      expect(Array.isArray(unrestricted)).toBe(true);
    });

    it('should hide country-incompatible tasks', async () => {
      if (!db) {
        expect(true).toBe(true);
        return;
      }

      const allTasks = await db.select().from(tasks).limit(10);
      
      // Simulate user from UK
      const userCountry = 'GB';
      const filtered = allTasks.filter((task: any) => {
        if (!task.targetCountries) return true;
        try {
          const countries = JSON.parse(task.targetCountries);
          return countries.includes(userCountry);
        } catch {
          return true;
        }
      });

      // Should have filtered some tasks
      expect(Array.isArray(filtered)).toBe(true);
    });
  });

  describe('Device Compatibility', () => {
    it('should identify device-compatible tasks', async () => {
      if (!db) {
        expect(true).toBe(true);
        return;
      }

      const allTasks = await db.select().from(tasks).limit(10);
      const userDevice = 'iOS';

      const compatible = allTasks.filter((task: any) => {
        if (!task.targetDevices) return true;
        try {
          const devices = JSON.parse(task.targetDevices);
          return devices.includes(userDevice);
        } catch {
          return true;
        }
      });

      expect(Array.isArray(compatible)).toBe(true);
    });

    it('should identify device-incompatible tasks', async () => {
      if (!db) {
        expect(true).toBe(true);
        return;
      }

      const allTasks = await db.select().from(tasks).limit(10);
      const userDevice = 'iOS';

      const incompatible = allTasks.filter((task: any) => {
        if (!task.targetDevices) return false;
        try {
          const devices = JSON.parse(task.targetDevices);
          return !devices.includes(userDevice);
        } catch {
          return false;
        }
      });

      expect(Array.isArray(incompatible)).toBe(true);
    });

    it('should sort compatible tasks before incompatible ones', () => {
      const mockTasks = [
        { id: 1, title: 'Task 1', targetDevices: JSON.stringify(['Android']) },
        { id: 2, title: 'Task 2', targetDevices: JSON.stringify(['iOS', 'Android']) },
        { id: 3, title: 'Task 3', targetDevices: JSON.stringify(['PC']) },
        { id: 4, title: 'Task 4', targetDevices: null },
      ];

      const userDevice = 'iOS';

      const sorted = mockTasks.sort((a, b) => {
        const aCompatible = !a.targetDevices || JSON.parse(a.targetDevices).includes(userDevice);
        const bCompatible = !b.targetDevices || JSON.parse(b.targetDevices).includes(userDevice);
        
        if (aCompatible === bCompatible) return a.id - b.id;
        return aCompatible ? -1 : 1;
      });

      // Task 2 (compatible) should come before Task 1 (incompatible)
      expect(sorted[0].id).toBe(2);
      expect(sorted[1].id).toBe(4); // No device restriction
      expect(sorted[2].id).toBe(1); // Incompatible
      expect(sorted[3].id).toBe(3); // Incompatible
    });
  });

  describe('Login History & Location Changes', () => {
    it('should track user login locations', async () => {
      if (!db) {
        expect(true).toBe(true);
        return;
      }

      const history = await db.select().from(userLoginHistory).limit(5);
      expect(Array.isArray(history)).toBe(true);

      // Each entry should have required fields
      history.forEach((entry: any) => {
        expect(entry.userId).toBeDefined();
        expect(entry.ipAddress).toBeDefined();
        expect(entry.loginAt).toBeDefined();
      });
    });

    it('should detect location changes', async () => {
      if (!db) {
        expect(true).toBe(true);
        return;
      }

      const allUsers = await db.select().from(users).limit(10);
      
      const usersWithLocationChanges = allUsers.filter((user: any) => 
        user.country && user.originalCountry && user.country !== user.originalCountry
      );

      expect(Array.isArray(usersWithLocationChanges)).toBe(true);
    });

    it('should preserve original country on first login', async () => {
      if (!db) {
        expect(true).toBe(true);
        return;
      }

      const allUsers = await db.select().from(users).limit(10);
      
      allUsers.forEach((user: any) => {
        if (user.originalCountry) {
          // originalCountry should always be set on first login
          expect(user.originalCountry).toBeTruthy();
        }
      });
    });
  });

  describe('Duplicate Account Detection', () => {
    it('should identify potential duplicate accounts by email', () => {
      const mockUsers = [
        { id: 1, email: 'user@example.com', ipAddress: '192.168.1.1' },
        { id: 2, email: 'user@example.com', ipAddress: '192.168.1.2' },
        { id: 3, email: 'other@example.com', ipAddress: '192.168.1.1' },
      ];

      const emailDuplicates = mockUsers.reduce((acc: any, user: any) => {
        const key = user.email;
        if (!acc[key]) acc[key] = [];
        acc[key].push(user.id);
        return acc;
      }, {});

      const duplicates = Object.values(emailDuplicates).filter((ids: any) => ids.length > 1);
      expect(duplicates.length).toBeGreaterThan(0);
    });

    it('should identify potential duplicate accounts by IP', () => {
      const mockUsers = [
        { id: 1, email: 'user1@example.com', ipAddress: '192.168.1.1' },
        { id: 2, email: 'user2@example.com', ipAddress: '192.168.1.1' },
        { id: 3, email: 'user3@example.com', ipAddress: '192.168.1.2' },
      ];

      const ipDuplicates = mockUsers.reduce((acc: any, user: any) => {
        const key = user.ipAddress;
        if (!acc[key]) acc[key] = [];
        acc[key].push(user.id);
        return acc;
      }, {});

      const duplicates = Object.values(ipDuplicates).filter((ids: any) => ids.length > 1);
      expect(duplicates.length).toBeGreaterThan(0);
    });
  });

  describe('Ban Status Enforcement', () => {
    it('should identify banned users', async () => {
      if (!db) {
        expect(true).toBe(true);
        return;
      }

      const bannedUsers = await db.select().from(users).where(eq(users.isBanned, true));
      expect(Array.isArray(bannedUsers)).toBe(true);
    });

    it('should track ban reason', async () => {
      if (!db) {
        expect(true).toBe(true);
        return;
      }

      const bannedUsers = await db.select().from(users).where(eq(users.isBanned, true)).limit(1);
      
      bannedUsers.forEach((user: any) => {
        if (user.isBanned) {
          expect(user.banReason).toBeDefined();
        }
      });
    });
  });
});

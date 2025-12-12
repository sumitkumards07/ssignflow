import { users, tasks, groups, groupMembers, clashMessages, feedback, appVersions, notifications, type User, type InsertUser, type Task, type InsertTask, type Group, type InsertGroup, type GroupMember, type InsertGroupMember, type ClashMessage, type Feedback, type InsertFeedback, type AppVersion, type InsertAppVersion } from "@shared/schema";
import { db } from "./db";
import { eq, lt, desc, and } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import { randomUUID } from "crypto";
import * as crypto from "crypto";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  getUserByToken(token: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;

  // Task methods
  getTasks(userId?: string): Promise<Task[]>;
  getAllTasks(): Promise<Task[]>;
  createNotification(title: string, body: string): Promise<void>;
  getNotifications(): Promise<{ title: string; body: string; timestamp: number }[]>;
  setUpdate(version: string, notes: string, url: string): Promise<void>;
  getUpdate(): Promise<{ version: string; notes: string; url: string } | null>; // For admin
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, task: Partial<InsertTask>): Promise<Task | undefined>;
  deleteTask(id: string): Promise<void>;

  // Feedback methods
  createFeedback(feedback: InsertFeedback): Promise<Feedback>;
  getAllFeedback(): Promise<Feedback[]>;

  // Activity
  updateUserActivity(userId: string): Promise<void>;
  updateUserRole(userId: string, role: string): Promise<void>;
  updateUserStats(userId: string, totalTime: number, todayTime: number, lastDate: string): Promise<void>;
  getLeaderboard(): Promise<User[]>;
  updatePushToken(userId: string, token: string): Promise<void>;

  // Group methods
  createGroup(name: string, userId: string): Promise<Group>;
  getGroup(id: string): Promise<Group | undefined>;
  getGroupByCode(code: string): Promise<Group | undefined>;
  getUserGroups(userId: string): Promise<(Group & { memberCount: number })[]>;
  joinGroup(groupId: string, userId: string): Promise<void>;
  removeGroupMember(groupId: string, userId: string): Promise<void>;
  getGroupMembers(groupId: string): Promise<User[]>;
  deleteGroup(groupId: string): Promise<void>;
  seed(): Promise<void>;
  createAppVersion(version: InsertAppVersion): Promise<AppVersion>;
  getLatestAppVersion(): Promise<AppVersion | undefined>;

  // Clash Chat
  createClashMessage(userId: string, content: string, groupId: string): Promise<ClashMessage>;
  getClashMessages(groupId: string): Promise<(ClashMessage & { user: { username: string, displayName: string | null } })[]>;
  toggleClashNotifications(userId: string, enabled: boolean): Promise<void>;
  cleanupOldMessages(): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private tasks: Map<string, Task>;
  private feedback: Map<string, Feedback>;
  private groups: Map<string, Group>;
  private groupMembers: Map<string, GroupMember>;

  constructor() {
    this.users = new Map();
    this.tasks = new Map();
    this.feedback = new Map();
    this.groups = new Map();
    this.groupMembers = new Map();

    // Pre-seed admin user
    const adminId = randomUUID();
    this.users.set(adminId, {
      id: adminId,
      username: "sumitkumar",
      password: process.env.ADMIN_PASSWORD || "change_me",
      googleId: "admin_google_id",
      email: "admin@assignflow.com",
      displayName: "Sumit Kumar (Admin)",
      role: "admin",
      lastActive: new Date().toISOString(),
      apiToken: "admin_token",
      totalFocusTime: 0,
      todayFocusTime: 0,
      lastFocusDate: null,
      avatar: null,
      pushToken: null,
      clashChatNotifications: true
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.googleId === googleId,
    );
  }

  async getUserByToken(token: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.apiToken === token,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = {
      ...insertUser,
      id,
      googleId: insertUser.googleId ?? null,
      email: insertUser.email ?? null,
      displayName: insertUser.displayName ?? null,
      role: insertUser.role ?? "user",
      lastActive: new Date().toISOString(),
      apiToken: randomUUID(),
      totalFocusTime: 0,
      todayFocusTime: 0,
      lastFocusDate: null,
      avatar: insertUser.avatar ?? null,
      pushToken: null,
      clashChatNotifications: insertUser.clashChatNotifications ?? true
    };
    this.users.set(id, user);
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getTasks(userId?: string): Promise<Task[]> {
    const allTasks = Array.from(this.tasks.values());
    if (userId) {
      return allTasks.filter(task => task.userId === userId);
    }
    return allTasks;
  }

  async getAllTasks(): Promise<Task[]> {
    return Array.from(this.tasks.values());
  }

  async createNotification(title: string, body: string): Promise<void> {
    // In-memory storage for notifications
    if (!this.notifications) this.notifications = [];
    this.notifications.push({ title, body, timestamp: Date.now() });
  }

  async getNotifications(): Promise<{ title: string; body: string; timestamp: number }[]> {
    return this.notifications || [];
  }

  async setUpdate(version: string, notes: string, url: string): Promise<void> {
    this.latestUpdate = { version, notes, url };
  }

  async getUpdate(): Promise<{ version: string; notes: string; url: string } | null> {
    return this.latestUpdate || null;
  }

  private notifications: { title: string; body: string; timestamp: number }[] = [];
  private latestUpdate: { version: string; notes: string; url: string } | null = null;

  async createTask(insertTask: InsertTask): Promise<Task> {
    const id = randomUUID();
    const task: Task = {
      ...insertTask,
      id,
      userId: (insertTask as any).userId ?? null,
      completed: insertTask.completed ?? false,
      notificationTime: insertTask.notificationTime ?? 1440 // Default 24h
    };
    this.tasks.set(id, task);
    return task;
  }

  async updateTask(id: string, updateData: Partial<InsertTask>): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (!task) return undefined;

    const updatedTask = { ...task, ...updateData };
    this.tasks.set(id, updatedTask);
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  async deleteTask(id: string): Promise<void> {
    this.tasks.delete(id);
  }

  async createFeedback(insertFeedback: InsertFeedback): Promise<Feedback> {
    const id = randomUUID();
    const newFeedback: Feedback = {
      id,
      userId: insertFeedback.userId ?? null,
      content: insertFeedback.content,
      createdAt: new Date().toISOString()
    };
    this.feedback.set(id, newFeedback);
    return newFeedback;
  }

  async getAllFeedback(): Promise<Feedback[]> {
    return Array.from(this.feedback.values());
  }

  async updateUserActivity(userId: string): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      const updatedUser = { ...user, lastActive: new Date().toISOString() };
      this.users.set(userId, updatedUser);
    }
  }

  async updateUserRole(userId: string, role: string): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      const updatedUser = { ...user, role };
      this.users.set(userId, updatedUser);
    }
  }

  async updateUserStats(userId: string, totalTime: number, todayTime: number, lastDate: string): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      const updatedUser = {
        ...user,
        totalFocusTime: totalTime,
        todayFocusTime: todayTime,
        lastFocusDate: lastDate
      };
      this.users.set(userId, updatedUser);
    }
  }

  async getLeaderboard(): Promise<User[]> {
    return Array.from(this.users.values())
      .sort((a, b) => (b.totalFocusTime || 0) - (a.totalFocusTime || 0))
      .slice(0, 50);
  }

  async updatePushToken(userId: string, token: string): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      this.users.set(userId, { ...user, pushToken: token });
    }
  }

  // Group methods implementation for MemStorage
  async createGroup(name: string, userId: string): Promise<Group> {
    const id = randomUUID();
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const group: Group = {
      id,
      name,
      code,
      createdBy: userId,
      createdAt: new Date().toISOString()
    };
    this.groups.set(id, group);

    // Auto-join creator
    await this.joinGroup(id, userId);

    return group;
  }

  async getGroup(id: string): Promise<Group | undefined> {
    return this.groups.get(id);
  }

  async getGroupByCode(code: string): Promise<Group | undefined> {
    return Array.from(this.groups.values()).find(g => g.code === code);
  }

  async getUserGroups(userId: string): Promise<(Group & { memberCount: number })[]> {
    const memberEntries = Array.from(this.groupMembers.values())
      .filter(m => m.userId === userId);

    const userGroups: (Group & { memberCount: number })[] = [];
    for (const member of memberEntries) {
      const group = this.groups.get(member.groupId!);
      if (group) {
        const count = Array.from(this.groupMembers.values()).filter(m => m.groupId === group.id).length;
        userGroups.push({ ...group, memberCount: count });
      }
    }
    return userGroups;
  }

  async joinGroup(groupId: string, userId: string): Promise<void> {
    const existing = Array.from(this.groupMembers.values()).find(
      m => m.groupId === groupId && m.userId === userId
    );
    if (!existing) {
      const id = randomUUID(); // Changed from (this.currentId++).toString() to randomUUID() to match existing pattern
      this.groupMembers.set(id, { id, groupId, userId, joinedAt: new Date().toISOString() });
    }
  }

  async removeGroupMember(groupId: string, userId: string): Promise<void> {
    const member = Array.from(this.groupMembers.values()).find(
      m => m.groupId === groupId && m.userId === userId
    );
    if (member) {
      this.groupMembers.delete(member.id);
    }
  }

  async getGroupMembers(groupId: string): Promise<User[]> {
    const members = Array.from(this.groupMembers.values())
      .filter((m) => m.groupId === groupId)
      .map((m) => m.userId ? this.users.get(m.userId) : undefined)
      .filter((u): u is User => u !== undefined);
    return members;
  }

  async deleteGroup(groupId: string): Promise<void> {
    // Delete members
    const entries = Array.from(this.groupMembers.entries());
    for (const [key, member] of entries) {
      if (member.groupId === groupId) {
        this.groupMembers.delete(key);
      }
    }
    // Delete group
    this.groups.delete(groupId);
  }

  async seed(): Promise<void> {
    return;
  }

  private appVersions: AppVersion[] = [];

  async createAppVersion(insertVersion: InsertAppVersion): Promise<AppVersion> {
    const id = randomUUID();
    const version: AppVersion = {
      ...insertVersion,
      id,
      releaseNotes: insertVersion.releaseNotes ?? null,
      createdAt: new Date().toISOString()
    };
    this.appVersions.push(version);
    return version;
  }

  async getLatestAppVersion(): Promise<AppVersion | undefined> {
    return this.appVersions.sort((a, b) => b.versionCode - a.versionCode)[0];
  }

  private clashMessages: ClashMessage[] = [];

  async createClashMessage(userId: string, content: string, groupId: string): Promise<ClashMessage> {
    const id = randomUUID();
    const message: ClashMessage = {
      id,
      userId,
      groupId,
      content,
      timestamp: new Date().toISOString()
    };
    this.clashMessages.push(message);
    return message;
  }

  async getClashMessages(groupId: string): Promise<(ClashMessage & { user: { username: string, displayName: string | null } })[]> {
    return this.clashMessages
      .filter(msg => msg.groupId === groupId)
      .sort((a, b) => new Date(a.timestamp || "").getTime() - new Date(b.timestamp || "").getTime())
      .map(msg => {
        const user = this.users.get(msg.userId || "");
        return {
          ...msg,
          user: {
            username: user?.username || 'Unknown',
            displayName: user?.displayName || null
          }
        };
      });
  }

  async toggleClashNotifications(userId: string, enabled: boolean): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.clashChatNotifications = enabled;
      this.users.set(userId, user);
    }
  }

  async cleanupOldMessages(): Promise<void> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    this.clashMessages = this.clashMessages.filter(msg => msg.timestamp && new Date(msg.timestamp) > sevenDaysAgo);
  }
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.googleId, googleId));
    return user;
  }

  async getUserByToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.apiToken, token));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        lastActive: new Date().toISOString(),
        apiToken: randomUUID()
      })
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getTasks(userId?: string): Promise<Task[]> {
    if (userId) {
      return await db.select().from(tasks).where(eq(tasks.userId, userId));
    }
    return await db.select().from(tasks);
  }

  async getAllTasks(): Promise<Task[]> {
    return await db.select().from(tasks);
  }

  async createNotification(title: string, body: string): Promise<void> {
    await db.insert(notifications).values({
      title,
      body,
      status: "pending",
      createdAt: new Date().toISOString()
    });
  }

  async getNotifications(): Promise<{ title: string; body: string; timestamp: number }[]> {
    const notifs = await db.select().from(notifications).orderBy(desc(notifications.createdAt));
    return notifs.map(n => ({
      title: n.title,
      body: n.body,
      timestamp: new Date(n.createdAt || "").getTime()
    }));
  }

  async setUpdate(version: string, notes: string, url: string): Promise<void> {
    // Same for updates, ideally a table.
    return;
  }

  async getUpdate(): Promise<{ version: string; notes: string; url: string } | null> {
    return null;
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const [task] = await db
      .insert(tasks)
      .values({
        ...insertTask,
        completed: insertTask.completed ?? false,
        notificationTime: insertTask.notificationTime ?? 1440
      })
      .returning();
    return task;
  }

  async updateTask(id: string, updateData: Partial<InsertTask>): Promise<Task | undefined> {
    const [task] = await db
      .update(tasks)
      .set(updateData)
      .where(eq(tasks.id, id))
      .returning();
    return task;
  }

  async deleteTask(id: string): Promise<void> {
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  async createFeedback(insertFeedback: InsertFeedback): Promise<Feedback> {
    const [newFeedback] = await db
      .insert(feedback)
      .values({
        ...insertFeedback,
        createdAt: new Date().toISOString()
      })
      .returning();
    return newFeedback;
  }

  async getAllFeedback(): Promise<Feedback[]> {
    return await db.select().from(feedback).orderBy(desc(feedback.createdAt));
  }

  async updateUserActivity(userId: string): Promise<void> {
    await db
      .update(users)
      .set({ lastActive: new Date().toISOString() })
      .where(eq(users.id, userId));
  }

  async updateUserRole(userId: string, role: string): Promise<void> {
    await db
      .update(users)
      .set({ role })
      .where(eq(users.id, userId));
  }

  async updateUserStats(userId: string, totalTime: number, todayTime: number, lastDate: string): Promise<void> {
    await db
      .update(users)
      .set({
        totalFocusTime: totalTime,
        todayFocusTime: todayTime,
        lastFocusDate: lastDate
      })
      .where(eq(users.id, userId));
  }

  async getLeaderboard(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .orderBy(desc(users.totalFocusTime))
      .limit(50);
  }

  // Group methods implementation for DatabaseStorage
  async createGroup(name: string, userId: string): Promise<Group> {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const [group] = await db
      .insert(groups)
      .values({
        name,
        code,
        createdBy: userId,
        createdAt: new Date().toISOString()
      })
      .returning();

    await this.joinGroup(group.id, userId);
    return group;
  }

  async getGroup(id: string): Promise<Group | undefined> {
    const [group] = await db.select().from(groups).where(eq(groups.id, id));
    return group;
  }

  async getGroupByCode(code: string): Promise<Group | undefined> {
    const [group] = await db.select().from(groups).where(eq(groups.code, code));
    return group;
  }

  async getUserGroups(userId: string): Promise<(Group & { memberCount: number })[]> {
    const members = await db
      .select()
      .from(groupMembers)
      .where(eq(groupMembers.userId, userId));

    const userGroups: (Group & { memberCount: number })[] = [];
    for (const member of members) {
      if (member.groupId) {
        const group = await this.getGroup(member.groupId);
        if (group) {
          const memberCount = await db
            .select({ count: groupMembers.id })
            .from(groupMembers)
            .where(eq(groupMembers.groupId, group.id));

          userGroups.push({ ...group, memberCount: memberCount.length });
        }
      }
    }
    return userGroups;
  }

  async joinGroup(groupId: string, userId: string): Promise<void> {
    // Check if already member
    const [existing] = await db
      .select()
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)));

    if (!existing) {
      await db.insert(groupMembers).values({
        groupId,
        userId,
        joinedAt: new Date().toISOString()
      });
    }
  }

  async removeGroupMember(groupId: string, userId: string): Promise<void> {
    await db
      .delete(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)));
  }

  async getGroupMembers(groupId: string): Promise<User[]> {
    const members = await db
      .select()
      .from(groupMembers)
      .where(eq(groupMembers.groupId, groupId));

    const groupUsers: User[] = [];
    for (const member of members) {
      if (member.userId) {
        const user = await this.getUser(member.userId);
        if (user) groupUsers.push(user);
      }
    }
    return groupUsers.sort((a, b) => (b.totalFocusTime || 0) - (a.totalFocusTime || 0));
  }

  async deleteGroup(groupId: string): Promise<void> {
    await db.delete(groupMembers).where(eq(groupMembers.groupId, groupId));
    await db.delete(groups).where(eq(groups.id, groupId));
  }

  async updatePushToken(userId: string, token: string): Promise<void> {
    await db
      .update(users)
      .set({ pushToken: token })
      .where(eq(users.id, userId));
  }

  async seed(): Promise<void> {
    const adminEmail = "admin@assignflow.com";
    const [existing] = await db.select().from(users).where(eq(users.email, adminEmail));

    if (!existing) {
      await db.insert(users).values({
        username: "sumitkumar",
        password: process.env.ADMIN_PASSWORD || "change_me",
        googleId: "admin_google_id",
        email: adminEmail,
        displayName: "Sumit Kumar (Admin)",
        role: "admin",
        lastActive: new Date().toISOString(),
        apiToken: "admin_token",
        totalFocusTime: 0,
        todayFocusTime: 0,
        lastFocusDate: null,
        avatar: null,
        pushToken: null
      });
      console.log("Admin user seeded successfully");
    }

    // Seed sumitkumar user if missing
    const [sumitUser] = await db.select().from(users).where(eq(users.username, "sumitkumar"));
    if (!sumitUser) {
      console.log("Seeding sumitkumar user...");
      await db.insert(users).values({
        username: "sumitkumar",
        password: process.env.ADMIN_PASSWORD || "change_me",
        role: "admin",
        displayName: "Sumit Kumar",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=sumitkumar",
        lastActive: new Date().toISOString(),
        apiToken: randomUUID()
      });
      console.log("Sumitkumar user created.");
    } else if (sumitUser.role !== "admin") {
      console.log("Promoting sumitkumar to admin...");
      await this.updateUserRole(sumitUser.id, "admin");
    }

    // Seed latest app version (v1.0.5)
    const latestVersion = await this.getLatestAppVersion();
    if (!latestVersion || latestVersion.versionCode < 6) {
      console.log("Seeding app version 1.0.5...");
      await db.insert(appVersions).values({
        versionCode: 6,
        versionName: "1.0.5",
        apkUrl: "https://assignflow-exuc.onrender.com/app-release.apk",
        releaseNotes: "New Features: Group Deletion in Clash Zone, Attendance Calculator.",
        createdAt: new Date().toISOString()
      });
    }
  }

  async createAppVersion(insertVersion: InsertAppVersion): Promise<AppVersion> {
    const [version] = await db
      .insert(appVersions)
      .values({
        ...insertVersion,
        createdAt: new Date().toISOString()
      })
      .returning();
    return version;
  }

  async getLatestAppVersion(): Promise<AppVersion | undefined> {
    const [version] = await db
      .select()
      .from(appVersions)
      .orderBy(desc(appVersions.versionCode))
      .limit(1);
    return version;
  }

  // Encryption helpers
  private encryptMessage(text: string): string {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(process.env.SESSION_SECRET || 'default_secret', 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  private decryptMessage(text: string): string {
    try {
      const algorithm = 'aes-256-cbc';
      const key = crypto.scryptSync(process.env.SESSION_SECRET || 'default_secret', 'salt', 32);
      const textParts = text.split(':');
      const iv = Buffer.from(textParts.shift()!, 'hex');
      const encryptedText = textParts.join(':');
      const decipher = crypto.createDecipheriv(algorithm, key, iv);
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (e) {
      console.error("Decryption failed:", e);
      return "[Encrypted Message]";
    }
  }

  async createClashMessage(userId: string, content: string, groupId: string): Promise<ClashMessage> {
    const encryptedContent = this.encryptMessage(content);
    const [message] = await db
      .insert(clashMessages)
      .values({
        userId,
        groupId,
        content: encryptedContent,
        timestamp: new Date().toISOString()
      })
      .returning();

    return {
      ...message,
      content: content // Return original content to sender
    };
  }

  async getClashMessages(groupId: string): Promise<(ClashMessage & { user: { username: string, displayName: string | null } })[]> {
    const messages = await db
      .select({
        id: clashMessages.id,
        userId: clashMessages.userId,
        groupId: clashMessages.groupId,
        content: clashMessages.content,
        timestamp: clashMessages.timestamp,
        user: {
          username: users.username,
          displayName: users.displayName
        }
      })
      .from(clashMessages)
      .leftJoin(users, eq(clashMessages.userId, users.id))
      .where(eq(clashMessages.groupId, groupId))
      .orderBy(clashMessages.timestamp);

    return messages.map(msg => ({
      ...msg,
      content: this.decryptMessage(msg.content),
      user: msg.user || { username: 'Unknown', displayName: 'Unknown' }
    }));
  }

  async cleanupOldMessages(): Promise<void> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    await db.delete(clashMessages)
      .where(lt(clashMessages.timestamp, sevenDaysAgo.toISOString()));
  }

  async toggleClashNotifications(userId: string, enabled: boolean): Promise<void> {
    await db
      .update(users)
      .set({ clashChatNotifications: enabled })
      .where(eq(users.id, userId));
  }
}

export const storage = (process.env.DATABASE_URL && process.env.DATABASE_URL !== "your_database_url") ? new DatabaseStorage() : new MemStorage();

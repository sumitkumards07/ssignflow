var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.prod.ts
import "dotenv/config";
import express2 from "express";
import session from "express-session";

// server/auth.ts
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  appVersions: () => appVersions,
  clashMessages: () => clashMessages,
  feedback: () => feedback,
  groupMembers: () => groupMembers,
  groups: () => groups,
  insertAppVersionSchema: () => insertAppVersionSchema,
  insertClashMessageSchema: () => insertClashMessageSchema,
  insertFeedbackSchema: () => insertFeedbackSchema,
  insertGroupMemberSchema: () => insertGroupMemberSchema,
  insertGroupSchema: () => insertGroupSchema,
  insertNotificationSchema: () => insertNotificationSchema,
  insertTaskSchema: () => insertTaskSchema,
  insertUserSchema: () => insertUserSchema,
  notifications: () => notifications,
  tasks: () => tasks,
  users: () => users
});
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
var users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  googleId: text("google_id").unique(),
  email: text("email"),
  displayName: text("display_name"),
  role: text("role").default("user"),
  // 'admin' | 'user'
  lastActive: text("last_active"),
  // ISO string timestamp
  apiToken: text("api_token").unique(),
  totalFocusTime: integer("total_focus_time").default(0),
  // in minutes
  todayFocusTime: integer("today_focus_time").default(0),
  // in minutes
  lastFocusDate: text("last_focus_date"),
  // YYYY-MM-DD
  avatar: text("avatar"),
  pushToken: text("push_token"),
  clashChatNotifications: boolean("clash_chat_notifications").default(true)
});
var insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  googleId: true,
  email: true,
  displayName: true,
  role: true,
  totalFocusTime: true,
  todayFocusTime: true,
  lastFocusDate: true,
  avatar: true,
  clashChatNotifications: true
});
var clashMessages = pgTable("clash_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  groupId: varchar("group_id").references(() => groups.id),
  // Added groupId
  content: text("content").notNull(),
  timestamp: text("timestamp").default((/* @__PURE__ */ new Date()).toISOString())
});
var insertClashMessageSchema = createInsertSchema(clashMessages).pick({
  userId: true,
  content: true
});
var tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  type: text("type").notNull(),
  // 'assignment' | 'quiz'
  title: text("title").notNull(),
  courseCode: text("course_code").notNull(),
  sectionId: text("section_id").notNull(),
  deadline: text("deadline").notNull(),
  // Storing as ISO string for simplicity
  completed: boolean("completed").notNull().default(false),
  notificationTime: integer("notification_time").default(24 * 60)
  // Minutes before deadline, default 24h
});
var insertTaskSchema = createInsertSchema(tasks).pick({
  type: true,
  title: true,
  courseCode: true,
  sectionId: true,
  deadline: true,
  completed: true,
  notificationTime: true
});
var feedback = pgTable("feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  content: text("content").notNull(),
  createdAt: text("created_at").default((/* @__PURE__ */ new Date()).toISOString())
});
var insertFeedbackSchema = createInsertSchema(feedback).pick({
  userId: true,
  content: true
});
var groups = pgTable("groups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: text("created_at").default((/* @__PURE__ */ new Date()).toISOString())
});
var insertGroupSchema = createInsertSchema(groups).pick({
  name: true,
  code: true,
  createdBy: true
});
var groupMembers = pgTable("group_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: varchar("group_id").references(() => groups.id),
  userId: varchar("user_id").references(() => users.id),
  joinedAt: text("joined_at").default((/* @__PURE__ */ new Date()).toISOString())
});
var insertGroupMemberSchema = createInsertSchema(groupMembers).pick({
  groupId: true,
  userId: true
});
var notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  // Nullable for broadcast
  title: text("title").notNull(),
  body: text("body").notNull(),
  status: text("status").default("pending"),
  // pending, sent, failed
  createdAt: text("created_at").default((/* @__PURE__ */ new Date()).toISOString())
});
var insertNotificationSchema = createInsertSchema(notifications).pick({
  userId: true,
  title: true,
  body: true,
  status: true
});
var appVersions = pgTable("app_versions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  versionCode: integer("version_code").notNull(),
  versionName: text("version_name").notNull(),
  apkUrl: text("apk_url").notNull(),
  releaseNotes: text("release_notes"),
  createdAt: text("created_at").default((/* @__PURE__ */ new Date()).toISOString())
});
var insertAppVersionSchema = createInsertSchema(appVersions).pick({
  versionCode: true,
  versionName: true,
  apkUrl: true,
  releaseNotes: true
});

// server/db.ts
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}
var pool = new Pool({ connectionString: process.env.DATABASE_URL });
var db = drizzle(pool, { schema: schema_exports });

// server/storage.ts
import { eq, lt, desc, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import * as crypto from "crypto";
var MemStorage = class {
  users;
  tasks;
  feedback;
  groups;
  groupMembers;
  constructor() {
    this.users = /* @__PURE__ */ new Map();
    this.tasks = /* @__PURE__ */ new Map();
    this.feedback = /* @__PURE__ */ new Map();
    this.groups = /* @__PURE__ */ new Map();
    this.groupMembers = /* @__PURE__ */ new Map();
    const adminId = randomUUID();
    this.users.set(adminId, {
      id: adminId,
      username: "sumitkumar",
      password: "sk2007@",
      googleId: "admin_google_id",
      email: "admin@assignflow.com",
      displayName: "Sumit Kumar (Admin)",
      role: "admin",
      lastActive: (/* @__PURE__ */ new Date()).toISOString(),
      apiToken: "admin_token",
      totalFocusTime: 0,
      todayFocusTime: 0,
      lastFocusDate: null,
      avatar: null,
      pushToken: null,
      clashChatNotifications: true
    });
  }
  async getUser(id) {
    return this.users.get(id);
  }
  async getUserByUsername(username) {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }
  async getUserByGoogleId(googleId) {
    return Array.from(this.users.values()).find(
      (user) => user.googleId === googleId
    );
  }
  async getUserByToken(token) {
    return Array.from(this.users.values()).find(
      (user) => user.apiToken === token
    );
  }
  async createUser(insertUser) {
    const id = randomUUID();
    const user = {
      ...insertUser,
      id,
      googleId: insertUser.googleId ?? null,
      email: insertUser.email ?? null,
      displayName: insertUser.displayName ?? null,
      role: insertUser.role ?? "user",
      lastActive: (/* @__PURE__ */ new Date()).toISOString(),
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
  async getAllUsers() {
    return Array.from(this.users.values());
  }
  async getTasks(userId) {
    const allTasks = Array.from(this.tasks.values());
    if (userId) {
      return allTasks.filter((task) => task.userId === userId);
    }
    return allTasks;
  }
  async getAllTasks() {
    return Array.from(this.tasks.values());
  }
  async createNotification(title, body) {
    if (!this.notifications) this.notifications = [];
    this.notifications.push({ title, body, timestamp: Date.now() });
  }
  async getNotifications() {
    return this.notifications || [];
  }
  async setUpdate(version, notes, url) {
    this.latestUpdate = { version, notes, url };
  }
  async getUpdate() {
    return this.latestUpdate || null;
  }
  notifications = [];
  latestUpdate = null;
  async createTask(insertTask) {
    const id = randomUUID();
    const task = {
      ...insertTask,
      id,
      userId: insertTask.userId ?? null,
      completed: insertTask.completed ?? false,
      notificationTime: insertTask.notificationTime ?? 1440
      // Default 24h
    };
    this.tasks.set(id, task);
    return task;
  }
  async updateTask(id, updateData) {
    const task = this.tasks.get(id);
    if (!task) return void 0;
    const updatedTask = { ...task, ...updateData };
    this.tasks.set(id, updatedTask);
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }
  async deleteTask(id) {
    this.tasks.delete(id);
  }
  async createFeedback(insertFeedback) {
    const id = randomUUID();
    const newFeedback = {
      id,
      userId: insertFeedback.userId ?? null,
      content: insertFeedback.content,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.feedback.set(id, newFeedback);
    return newFeedback;
  }
  async getAllFeedback() {
    return Array.from(this.feedback.values());
  }
  async updateUserActivity(userId) {
    const user = this.users.get(userId);
    if (user) {
      const updatedUser = { ...user, lastActive: (/* @__PURE__ */ new Date()).toISOString() };
      this.users.set(userId, updatedUser);
    }
  }
  async updateUserRole(userId, role) {
    const user = this.users.get(userId);
    if (user) {
      const updatedUser = { ...user, role };
      this.users.set(userId, updatedUser);
    }
  }
  async updateUserStats(userId, totalTime, todayTime, lastDate) {
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
  async getLeaderboard() {
    return Array.from(this.users.values()).sort((a, b) => (b.totalFocusTime || 0) - (a.totalFocusTime || 0)).slice(0, 50);
  }
  async updatePushToken(userId, token) {
    const user = this.users.get(userId);
    if (user) {
      this.users.set(userId, { ...user, pushToken: token });
    }
  }
  // Group methods implementation for MemStorage
  async createGroup(name, userId) {
    const id = randomUUID();
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const group = {
      id,
      name,
      code,
      createdBy: userId,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.groups.set(id, group);
    await this.joinGroup(id, userId);
    return group;
  }
  async getGroup(id) {
    return this.groups.get(id);
  }
  async getGroupByCode(code) {
    return Array.from(this.groups.values()).find((g) => g.code === code);
  }
  async getUserGroups(userId) {
    const memberEntries = Array.from(this.groupMembers.values()).filter((m) => m.userId === userId);
    const userGroups = [];
    for (const member of memberEntries) {
      const group = this.groups.get(member.groupId);
      if (group) {
        const count = Array.from(this.groupMembers.values()).filter((m) => m.groupId === group.id).length;
        userGroups.push({ ...group, memberCount: count });
      }
    }
    return userGroups;
  }
  async joinGroup(groupId, userId) {
    const existing = Array.from(this.groupMembers.values()).find(
      (m) => m.groupId === groupId && m.userId === userId
    );
    if (!existing) {
      const id = randomUUID();
      this.groupMembers.set(id, { id, groupId, userId, joinedAt: (/* @__PURE__ */ new Date()).toISOString() });
    }
  }
  async removeGroupMember(groupId, userId) {
    const member = Array.from(this.groupMembers.values()).find(
      (m) => m.groupId === groupId && m.userId === userId
    );
    if (member) {
      this.groupMembers.delete(member.id);
    }
  }
  async getGroupMembers(groupId) {
    const members = Array.from(this.groupMembers.values()).filter((m) => m.groupId === groupId).map((m) => m.userId ? this.users.get(m.userId) : void 0).filter((u) => u !== void 0);
    return members;
  }
  async deleteGroup(groupId) {
    const entries = Array.from(this.groupMembers.entries());
    for (const [key, member] of entries) {
      if (member.groupId === groupId) {
        this.groupMembers.delete(key);
      }
    }
    this.groups.delete(groupId);
  }
  async seed() {
    return;
  }
  appVersions = [];
  async createAppVersion(insertVersion) {
    const id = randomUUID();
    const version = {
      ...insertVersion,
      id,
      releaseNotes: insertVersion.releaseNotes ?? null,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.appVersions.push(version);
    return version;
  }
  async getLatestAppVersion() {
    return this.appVersions.sort((a, b) => b.versionCode - a.versionCode)[0];
  }
  clashMessages = [];
  async createClashMessage(userId, content, groupId) {
    const id = randomUUID();
    const message = {
      id,
      userId,
      groupId,
      content,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.clashMessages.push(message);
    return message;
  }
  async getClashMessages(groupId) {
    return this.clashMessages.filter((msg) => msg.groupId === groupId).sort((a, b) => new Date(a.timestamp || "").getTime() - new Date(b.timestamp || "").getTime()).map((msg) => {
      const user = this.users.get(msg.userId || "");
      return {
        ...msg,
        user: {
          username: user?.username || "Unknown",
          displayName: user?.displayName || null
        }
      };
    });
  }
  async toggleClashNotifications(userId, enabled) {
    const user = this.users.get(userId);
    if (user) {
      user.clashChatNotifications = enabled;
      this.users.set(userId, user);
    }
  }
  async cleanupOldMessages() {
    const sevenDaysAgo = /* @__PURE__ */ new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    this.clashMessages = this.clashMessages.filter((msg) => msg.timestamp && new Date(msg.timestamp) > sevenDaysAgo);
  }
};
var DatabaseStorage = class {
  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  async getUserByUsername(username) {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
  async getUserByGoogleId(googleId) {
    const [user] = await db.select().from(users).where(eq(users.googleId, googleId));
    return user;
  }
  async getUserByToken(token) {
    const [user] = await db.select().from(users).where(eq(users.apiToken, token));
    return user;
  }
  async createUser(insertUser) {
    const [user] = await db.insert(users).values({
      ...insertUser,
      lastActive: (/* @__PURE__ */ new Date()).toISOString(),
      apiToken: randomUUID()
    }).returning();
    return user;
  }
  async getAllUsers() {
    return await db.select().from(users);
  }
  async getTasks(userId) {
    if (userId) {
      return await db.select().from(tasks).where(eq(tasks.userId, userId));
    }
    return await db.select().from(tasks);
  }
  async getAllTasks() {
    return await db.select().from(tasks);
  }
  async createNotification(title, body) {
    await db.insert(notifications).values({
      title,
      body,
      status: "pending",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
  async getNotifications() {
    const notifs = await db.select().from(notifications).orderBy(desc(notifications.createdAt));
    return notifs.map((n) => ({
      title: n.title,
      body: n.body,
      timestamp: new Date(n.createdAt || "").getTime()
    }));
  }
  async setUpdate(version, notes, url) {
    return;
  }
  async getUpdate() {
    return null;
  }
  async createTask(insertTask) {
    const [task] = await db.insert(tasks).values({
      ...insertTask,
      completed: insertTask.completed ?? false,
      notificationTime: insertTask.notificationTime ?? 1440
    }).returning();
    return task;
  }
  async updateTask(id, updateData) {
    const [task] = await db.update(tasks).set(updateData).where(eq(tasks.id, id)).returning();
    return task;
  }
  async deleteTask(id) {
    await db.delete(tasks).where(eq(tasks.id, id));
  }
  async createFeedback(insertFeedback) {
    const [newFeedback] = await db.insert(feedback).values({
      ...insertFeedback,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    }).returning();
    return newFeedback;
  }
  async getAllFeedback() {
    return await db.select().from(feedback).orderBy(desc(feedback.createdAt));
  }
  async updateUserActivity(userId) {
    await db.update(users).set({ lastActive: (/* @__PURE__ */ new Date()).toISOString() }).where(eq(users.id, userId));
  }
  async updateUserRole(userId, role) {
    await db.update(users).set({ role }).where(eq(users.id, userId));
  }
  async updateUserStats(userId, totalTime, todayTime, lastDate) {
    await db.update(users).set({
      totalFocusTime: totalTime,
      todayFocusTime: todayTime,
      lastFocusDate: lastDate
    }).where(eq(users.id, userId));
  }
  async getLeaderboard() {
    return await db.select().from(users).orderBy(desc(users.totalFocusTime)).limit(50);
  }
  // Group methods implementation for DatabaseStorage
  async createGroup(name, userId) {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const [group] = await db.insert(groups).values({
      name,
      code,
      createdBy: userId,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    }).returning();
    await this.joinGroup(group.id, userId);
    return group;
  }
  async getGroup(id) {
    const [group] = await db.select().from(groups).where(eq(groups.id, id));
    return group;
  }
  async getGroupByCode(code) {
    const [group] = await db.select().from(groups).where(eq(groups.code, code));
    return group;
  }
  async getUserGroups(userId) {
    const members = await db.select().from(groupMembers).where(eq(groupMembers.userId, userId));
    const userGroups = [];
    for (const member of members) {
      if (member.groupId) {
        const group = await this.getGroup(member.groupId);
        if (group) {
          const memberCount = await db.select({ count: groupMembers.id }).from(groupMembers).where(eq(groupMembers.groupId, group.id));
          userGroups.push({ ...group, memberCount: memberCount.length });
        }
      }
    }
    return userGroups;
  }
  async joinGroup(groupId, userId) {
    const [existing] = await db.select().from(groupMembers).where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)));
    if (!existing) {
      await db.insert(groupMembers).values({
        groupId,
        userId,
        joinedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
  }
  async removeGroupMember(groupId, userId) {
    await db.delete(groupMembers).where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)));
  }
  async getGroupMembers(groupId) {
    const members = await db.select().from(groupMembers).where(eq(groupMembers.groupId, groupId));
    const groupUsers = [];
    for (const member of members) {
      if (member.userId) {
        const user = await this.getUser(member.userId);
        if (user) groupUsers.push(user);
      }
    }
    return groupUsers.sort((a, b) => (b.totalFocusTime || 0) - (a.totalFocusTime || 0));
  }
  async deleteGroup(groupId) {
    await db.delete(groupMembers).where(eq(groupMembers.groupId, groupId));
    await db.delete(groups).where(eq(groups.id, groupId));
  }
  async updatePushToken(userId, token) {
    await db.update(users).set({ pushToken: token }).where(eq(users.id, userId));
  }
  async seed() {
    const adminEmail = "admin@assignflow.com";
    const [existing] = await db.select().from(users).where(eq(users.email, adminEmail));
    if (!existing) {
      await db.insert(users).values({
        username: "sumitkumar",
        password: "sk2007@",
        googleId: "admin_google_id",
        email: adminEmail,
        displayName: "Sumit Kumar (Admin)",
        role: "admin",
        lastActive: (/* @__PURE__ */ new Date()).toISOString(),
        apiToken: "admin_token",
        totalFocusTime: 0,
        todayFocusTime: 0,
        lastFocusDate: null,
        avatar: null,
        pushToken: null
      });
      console.log("Admin user seeded successfully");
    }
    const [sumitUser] = await db.select().from(users).where(eq(users.username, "sumitkumar"));
    if (!sumitUser) {
      console.log("Seeding sumitkumar user...");
      await db.insert(users).values({
        username: "sumitkumar",
        password: "sk2007@",
        role: "admin",
        displayName: "Sumit Kumar",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=sumitkumar",
        lastActive: (/* @__PURE__ */ new Date()).toISOString(),
        apiToken: randomUUID()
      });
      console.log("Sumitkumar user created.");
    } else if (sumitUser.role !== "admin") {
      console.log("Promoting sumitkumar to admin...");
      await this.updateUserRole(sumitUser.id, "admin");
    }
    const latestVersion = await this.getLatestAppVersion();
    if (!latestVersion || latestVersion.versionCode < 6) {
      console.log("Seeding app version 1.0.5...");
      await db.insert(appVersions).values({
        versionCode: 6,
        versionName: "1.0.5",
        apkUrl: "https://assignflow-exuc.onrender.com/app-release.apk",
        releaseNotes: "New Features: Group Deletion in Clash Zone, Attendance Calculator.",
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
  }
  async createAppVersion(insertVersion) {
    const [version] = await db.insert(appVersions).values({
      ...insertVersion,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    }).returning();
    return version;
  }
  async getLatestAppVersion() {
    const [version] = await db.select().from(appVersions).orderBy(desc(appVersions.versionCode)).limit(1);
    return version;
  }
  // Encryption helpers
  encryptMessage(text2) {
    const algorithm = "aes-256-cbc";
    const key = crypto.scryptSync(process.env.SESSION_SECRET || "default_secret", "salt", 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text2, "utf8", "hex");
    encrypted += cipher.final("hex");
    return iv.toString("hex") + ":" + encrypted;
  }
  decryptMessage(text2) {
    try {
      const algorithm = "aes-256-cbc";
      const key = crypto.scryptSync(process.env.SESSION_SECRET || "default_secret", "salt", 32);
      const textParts = text2.split(":");
      const iv = Buffer.from(textParts.shift(), "hex");
      const encryptedText = textParts.join(":");
      const decipher = crypto.createDecipheriv(algorithm, key, iv);
      let decrypted = decipher.update(encryptedText, "hex", "utf8");
      decrypted += decipher.final("utf8");
      return decrypted;
    } catch (e) {
      console.error("Decryption failed:", e);
      return "[Encrypted Message]";
    }
  }
  async createClashMessage(userId, content, groupId) {
    const encryptedContent = this.encryptMessage(content);
    const [message] = await db.insert(clashMessages).values({
      userId,
      groupId,
      content: encryptedContent,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }).returning();
    return {
      ...message,
      content
      // Return original content to sender
    };
  }
  async getClashMessages(groupId) {
    const messages = await db.select({
      id: clashMessages.id,
      userId: clashMessages.userId,
      groupId: clashMessages.groupId,
      content: clashMessages.content,
      timestamp: clashMessages.timestamp,
      user: {
        username: users.username,
        displayName: users.displayName
      }
    }).from(clashMessages).leftJoin(users, eq(clashMessages.userId, users.id)).where(eq(clashMessages.groupId, groupId)).orderBy(clashMessages.timestamp);
    return messages.map((msg) => ({
      ...msg,
      content: this.decryptMessage(msg.content),
      user: msg.user || { username: "Unknown", displayName: "Unknown" }
    }));
  }
  async cleanupOldMessages() {
    const sevenDaysAgo = /* @__PURE__ */ new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    await db.delete(clashMessages).where(lt(clashMessages.timestamp, sevenDaysAgo.toISOString()));
  }
  async toggleClashNotifications(userId, enabled) {
    await db.update(users).set({ clashChatNotifications: enabled }).where(eq(users.id, userId));
  }
};
var storage = process.env.DATABASE_URL ? new DatabaseStorage() : new MemStorage();

// server/auth.ts
passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return done(null, false, { message: "Incorrect username." });
      }
      if (user.password !== password) {
        return done(null, false, { message: "Incorrect password." });
      }
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  })
);
passport.serializeUser((user, done) => {
  done(null, user.id);
});
passport.deserializeUser(async (id, done) => {
  try {
    const user = await storage.getUser(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});
var auth_default = passport;

// server/routes.ts
import { createServer } from "http";
import multer from "multer";
import { GoogleGenerativeAI } from "@google/generative-ai";

// server/firebase.ts
import admin from "firebase-admin";
var firebaseApp = null;
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log("Firebase Admin initialized successfully");
  } else {
    console.warn("FIREBASE_SERVICE_ACCOUNT not found. Push notifications will be mocked.");
  }
} catch (error) {
  console.error("Failed to initialize Firebase Admin:", error);
}
async function sendMulticastNotification(tokens, title, body) {
  if (!firebaseApp) {
    console.log(`[MOCK] Sending multicast push to ${tokens.length} tokens: ${title} - ${body}`);
    return { successCount: tokens.length, failureCount: 0 };
  }
  try {
    const response = await firebaseApp.messaging().sendEachForMulticast({
      tokens,
      notification: {
        title,
        body
      }
    });
    return response;
  } catch (error) {
    console.error("Error sending multicast notification:", error);
    return { successCount: 0, failureCount: tokens.length };
  }
}

// server/routes.ts
function containsProfanity(text2) {
  const profanityList = [
    // Common offensive words (partial list - add more as needed)
    "fuck",
    "shit",
    "bitch",
    "ass",
    "damn",
    "hell",
    "bastard",
    "crap",
    "dick",
    "pussy",
    "cock",
    "slut",
    "whore",
    "fag",
    "nigger",
    "nigga",
    "retard",
    "cunt",
    "piss",
    "asshole",
    "motherfucker",
    "bullshit",
    // Add variations and common bypasses
    "f*ck",
    "sh*t",
    "b*tch",
    "a$$",
    "fuk",
    "fck",
    "sht",
    "btch",
    // Abusive terms
    "idiot",
    "stupid",
    "dumb",
    "moron",
    "loser",
    "kill yourself",
    "kys",
    "die",
    "hate you",
    "ugly",
    "fat",
    "worthless"
  ];
  const lowerText = text2.toLowerCase();
  return profanityList.some((word) => {
    const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    return regex.test(lowerText) || lowerText.includes(word);
  });
}
async function registerRoutes(app2) {
  app2.use("/api", async (req, res, next) => {
    if (!process.env.GEMINI_API_KEY) {
      console.warn("WARNING: GEMINI_API_KEY is not set!");
    }
    const allowedOrigins = [
      "http://localhost:5173",
      "http://localhost:5001",
      "https://assignflow-exuc.onrender.com",
      "http://13.235.90.150",
      "capacitor://localhost",
      "http://localhost",
      "https://localhost"
      // AWS App Runner - add your App Runner URL here after deployment
    ];
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
      res.header("Access-Control-Allow-Origin", origin);
    } else {
      res.header("Access-Control-Allow-Origin", origin || "http://localhost");
    }
    res.header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    res.header("Access-Control-Allow-Credentials", "true");
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const user = await storage.getUserByToken(token);
      if (user) {
        req.user = user;
      }
    }
    if (req.isAuthenticated() || req.user) {
      await storage.updateUserActivity(req.user.id);
    }
    console.log(`[${req.method}] ${req.path}`);
    console.log("Origin:", req.headers.origin);
    console.log("Cookie:", req.headers.cookie ? "Present" : "Missing");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });
  app2.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });
  app2.get("/api/health", (_req, res) => {
    res.status(200).json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  });
  app2.get("/api/auth/me", (req, res) => {
    if (req.user) {
      res.json(req.user);
    } else {
      res.status(401).json({ message: "Not authenticated" });
    }
  });
  app2.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      req.session.destroy((err2) => {
        if (err2) console.error("Session destroy error:", err2);
        res.json({ message: "Logged out successfully" });
      });
    });
  });
  app2.post("/api/register", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        const suggestions = [
          `${username}${Math.floor(Math.random() * 1e3)}`,
          `${username}_${(/* @__PURE__ */ new Date()).getFullYear()}`,
          `${username}${Math.floor(Math.random() * 100)}`
        ];
        return res.status(400).json({
          message: "Username already exists",
          suggestions
        });
      }
      const user = await storage.createUser({
        username,
        password,
        role: "user",
        displayName: username,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`
      });
      req.login(user, (err) => {
        if (err) return res.status(500).json({ message: "Login failed after registration" });
        req.session.save(async (err2) => {
          if (err2) {
            console.error("Session save error:", err2);
            return res.status(500).json({ message: "Session save failed" });
          }
          return res.json(user);
        });
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.post("/api/login", auth_default.authenticate("local"), (req, res) => {
    req.session.save((err) => {
      if (err) {
        console.error("Session save error:", err);
        return res.status(500).json({ message: "Session save failed" });
      }
      res.json(req.user);
    });
  });
  app2.get("/api/admin/users", async (req, res) => {
    const user = req.user;
    console.log(`Admin check for user: ${user?.username}, role: ${user?.role}`);
    if (!req.isAuthenticated() || user.role !== "admin" && user.username !== "sumitkumar") {
      console.log("Admin access denied");
      return res.status(403).json({ message: "Forbidden" });
    }
    const users2 = await storage.getAllUsers();
    const tasks2 = await storage.getAllTasks();
    const usersWithStats = users2.map((user2) => {
      const userTasks = tasks2.filter((t) => t.userId === user2.id);
      return {
        ...user2,
        taskCount: userTasks.length,
        completedTaskCount: userTasks.filter((t) => t.completed).length
      };
    });
    res.json(usersWithStats);
  });
  app2.get("/api/tasks", async (req, res) => {
    try {
      const tasks2 = await storage.getTasks(req.user.id);
      res.setHeader("Content-Type", "application/json");
      res.status(200).json(tasks2);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.setHeader("Content-Type", "application/json");
      res.status(500).json({
        message: error.message || "Failed to fetch tasks",
        error: "SERVER_ERROR"
      });
    }
  });
  app2.post("/api/tasks", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const result = insertTaskSchema.safeParse(req.body);
      if (!result.success) {
        res.status(400).json({
          message: "Invalid request data",
          errors: result.error.errors
        });
        return;
      }
      const task = await storage.createTask({
        ...result.data,
        userId: req.user.id
      });
      res.setHeader("Content-Type", "application/json");
      res.status(201).json({
        success: true,
        ...task
      });
    } catch (error) {
      console.error("Error creating task:", error);
      res.setHeader("Content-Type", "application/json");
      res.status(500).json({
        message: error.message || "Failed to create task",
        error: "SERVER_ERROR"
      });
    }
  });
  app2.patch("/api/tasks/:id", async (req, res) => {
    try {
      const id = req.params.id;
      if (!id) {
        res.status(400).json({ message: "Task ID is required" });
        return;
      }
      const updatedTask = await storage.updateTask(id, req.body);
      if (!updatedTask) {
        res.setHeader("Content-Type", "application/json");
        res.status(404).json({
          message: "Task not found",
          error: "NOT_FOUND"
        });
        return;
      }
      res.setHeader("Content-Type", "application/json");
      res.status(200).json({
        success: true,
        ...updatedTask
      });
    } catch (error) {
      console.error("Error updating task:", error);
      res.setHeader("Content-Type", "application/json");
      res.status(500).json({
        message: error.message || "Failed to update task",
        error: "SERVER_ERROR"
      });
    }
  });
  app2.delete("/api/tasks/:id", async (req, res) => {
    try {
      const id = req.params.id;
      if (!id) {
        res.status(400).json({ message: "Task ID is required" });
        return;
      }
      await storage.deleteTask(id);
      res.sendStatus(204);
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({
        message: error.message || "Failed to delete task",
        error: "SERVER_ERROR"
      });
    }
  });
  app2.post("/api/feedback", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const { content } = req.body;
      if (!content) {
        return res.status(400).json({ message: "Content is required" });
      }
      const feedback2 = await storage.createFeedback({
        userId: req.user.id,
        content
      });
      res.status(201).json(feedback2);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.get("/api/admin/feedback", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }
    const feedback2 = await storage.getAllFeedback();
    res.json(feedback2);
  });
  app2.post("/api/analytics/sync", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const { totalTime, todayTime, date } = req.body;
    try {
      await storage.updateUserStats(
        req.user.id,
        totalTime,
        todayTime,
        date
      );
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.get("/api/analytics/leaderboard", async (req, res) => {
    try {
      const leaderboard = await storage.getLeaderboard();
      const safeLeaderboard = leaderboard.map((u) => ({
        id: u.id,
        username: u.username,
        displayName: u.displayName,
        totalFocusTime: u.totalFocusTime || 0,
        todayFocusTime: u.todayFocusTime || 0,
        lastFocusDate: u.lastFocusDate
      }));
      res.json(safeLeaderboard);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.post("/api/groups", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const { name } = req.body;
      if (!name) {
        return res.status(400).json({ message: "Group name is required" });
      }
      const group = await storage.createGroup(name, req.user.id);
      res.status(201).json(group);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.post("/api/groups/join", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const { code } = req.body;
      if (!code) {
        return res.status(400).json({ message: "Group code is required" });
      }
      const group = await storage.getGroupByCode(code);
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }
      await storage.joinGroup(group.id, req.user.id);
      res.json({ message: "Joined group successfully", group });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.get("/api/groups", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const groups2 = await storage.getUserGroups(req.user.id);
      res.json(groups2);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.get("/api/groups/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const group = await storage.getGroup(req.params.id);
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }
      const members = await storage.getGroupMembers(req.params.id);
      const safeMembers = members.map((u) => ({
        id: u.id,
        username: u.username,
        displayName: u.displayName,
        totalFocusTime: u.totalFocusTime || 0,
        todayFocusTime: u.todayFocusTime || 0,
        lastFocusDate: u.lastFocusDate
      }));
      res.json({ group, members: safeMembers });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.delete("/api/groups/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const group = await storage.getGroup(req.params.id);
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }
      if (group.createdBy !== req.user.id && req.user.role !== "admin") {
        return res.status(403).json({ message: "Only the group creator can delete this group" });
      }
      await storage.deleteGroup(req.params.id);
      res.json({ message: "Group deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.delete("/api/groups/:id/members/:userId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const group = await storage.getGroup(req.params.id);
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }
      if (group.createdBy !== req.user.id && req.user.role !== "admin") {
        return res.status(403).json({ message: "Only the group creator can remove members" });
      }
      if (req.params.userId === group.createdBy) {
        return res.status(400).json({ message: "Cannot remove the group creator" });
      }
      await storage.removeGroupMember(req.params.id, req.params.userId);
      res.json({ message: "Member removed successfully" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.get("/api/admin/tasks", async (req, res) => {
    const user = req.user;
    if (!req.isAuthenticated() || user.role !== "admin" && user.username !== "sumitkumar") {
      return res.status(403).json({ message: "Forbidden" });
    }
    const tasks2 = await storage.getAllTasks();
    res.json(tasks2);
  });
  app2.post("/api/admin/notifications", async (req, res) => {
    const user = req.user;
    if (!req.isAuthenticated() || user.role !== "admin" && user.username !== "sumitkumar") {
      return res.status(403).json({ message: "Forbidden" });
    }
    const { title, body } = req.body;
    await storage.createNotification(title, body);
    const users2 = await storage.getAllUsers();
    const tokens = users2.map((u) => u.pushToken).filter((t) => t);
    if (tokens.length > 0) {
      await sendMulticastNotification(tokens, title, body);
    }
    res.json({ success: true, message: "Notification created and queued for sending" });
  });
  app2.post("/api/notifications/register", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: "Token required" });
    await storage.updatePushToken(req.user.id, token);
    res.json({ success: true });
  });
  app2.post("/api/admin/updates", async (req, res) => {
    const user = req.user;
    if (!req.isAuthenticated() || user.role !== "admin" && user.username !== "sumitkumar") {
      return res.status(403).json({ message: "Forbidden" });
    }
    const { versionCode, versionName, apkUrl, releaseNotes } = req.body;
    if (!versionCode || !versionName || !apkUrl) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    await storage.createAppVersion({
      versionCode: parseInt(versionCode),
      versionName,
      apkUrl,
      releaseNotes
    });
    const users2 = await storage.getAllUsers();
    const tokens = users2.map((u) => u.pushToken).filter((t) => t);
    if (tokens.length > 0) {
      await sendMulticastNotification(tokens, "Update Available", `Version ${versionName} is now available.`);
    }
    res.json({ success: true });
  });
  app2.get("/api/updates", async (req, res) => {
    const update = await storage.getLatestAppVersion();
    if (update) {
      res.json(update);
    } else {
      res.json({
        versionCode: 1,
        versionName: "1.0.0",
        apkUrl: "",
        releaseNotes: "No updates available"
      });
    }
  });
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }
    // 10MB limit
  });
  app2.post("/api/quiz/generate", (req, res, next) => {
    upload.single("pdf")(req, res, (err) => {
      if (err) {
        console.error("Multer error in quiz:", err);
        return res.status(400).json({ message: "File upload failed: " + err.message });
      }
      next();
    });
  }, async (req, res) => {
    try {
      if (!req.file) {
        res.status(400).json({ message: "No PDF file uploaded" });
        return;
      }
      const dataBuffer = req.file.buffer;
      const { createRequire: createRequire2 } = await import("module");
      const require3 = createRequire2(import.meta.url);
      const pdfParse = require3("pdf-parse");
      const data = await pdfParse(dataBuffer);
      const text2 = data.text;
      if (!text2 || text2.length < 50) {
        res.status(400).json({ message: "Not enough text found in PDF" });
        return;
      }
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        res.status(500).json({ message: "Gemini API Key not configured" });
        return;
      }
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const prompt = `
        Generate a quiz with 5 multiple-choice questions based on the following text.
        Return the result as a JSON array of objects.
        Each object should have:
        - "question": string
        - "options": string[] (4 options)
        - "correctAnswer": string (the correct option text)
        
        Text: ${text2.substring(0, 1e4)}
      `;
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const quiz = JSON.parse(response.text().replace(/```json/g, "").replace(/```/g, "").trim());
      res.json(quiz);
    } catch (error) {
      console.error("Quiz generation error:", error);
      res.status(500).json({ message: "Failed to generate quiz" });
    }
  });
  app2.post("/api/ai/generate", async (req, res) => {
    try {
      const { prompt } = req.body;
      if (!prompt) {
        res.status(400).json({ message: "Prompt is required" });
        return;
      }
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        res.status(500).json({ message: "Gemini API Key not configured" });
        return;
      }
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const systemPrompt = `
        You are an advanced AI Research Assistant. 
        Your goal is to provide comprehensive, accurate, and well-structured answers.
        
        Guidelines:
        - If the user asks a question, provide a detailed explanation.
        - If the user asks for a summary, provide a concise but complete summary.
        - Use formatting (bullet points, bold text) to make the answer readable.
        - If you don't know the answer, admit it and suggest what you do know.
        - Be helpful, polite, and professional.
      `;
      const result = await model.generateContent([systemPrompt, prompt]);
      const response = await result.response;
      const text2 = response.text();
      res.json({ text: text2 });
    } catch (error) {
      console.error("AI generation error:", error);
      res.status(500).json({ message: "Failed to generate content" });
    }
  });
  app2.post("/api/ai/analyze-image", (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err) {
        console.error("Multer error:", err);
        return res.status(400).json({ message: "File upload failed: " + err.message });
      }
      next();
    });
  }, async (req, res) => {
    try {
      if (!req.file) {
        res.status(400).json({ message: "No file uploaded" });
        return;
      }
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        res.status(500).json({ message: "Gemini API Key not configured" });
        return;
      }
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const prompt = "Analyze this content and provide a solution or explanation. If it's a math problem, solve it step-by-step. If it's a schedule, extract the timetable.";
      let content = [prompt];
      if (req.file.mimetype === "application/pdf") {
        const { createRequire: createRequire2 } = await import("module");
        const require3 = createRequire2(import.meta.url);
        const pdfParse = require3("pdf-parse");
        const data = await pdfParse(req.file.buffer);
        content.push(data.text);
      } else {
        content.push({
          inlineData: {
            data: req.file.buffer.toString("base64"),
            mimeType: req.file.mimetype
          }
        });
      }
      const result = await model.generateContent(content);
      const response = await result.response;
      const text2 = response.text();
      res.json({ text: text2 });
    } catch (error) {
      console.error("Analysis error:", error);
      res.status(500).json({ message: "Failed to analyze file" });
    }
  });
  app2.post("/api/ai/pdf-to-notes", (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err) {
        console.error("Multer error:", err);
        return res.status(400).json({ message: "File upload failed: " + err.message });
      }
      next();
    });
  }, async (req, res) => {
    try {
      if (!req.file) {
        res.status(400).json({ message: "No file uploaded" });
        return;
      }
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.error("Gemini API Key is missing in environment variables!");
        res.status(500).json({ message: "Server Error: Gemini API Key not configured. Please set GEMINI_API_KEY in Render." });
        return;
      }
      if (!apiKey) {
        res.status(500).json({ message: "Gemini API Key not configured" });
        return;
      }
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const promptText = `
        Summarize the following content into concise, handwritten-style study notes. 
        Focus on key concepts, definitions, and important points. 
        Use bullet points and short paragraphs.
      `;
      let content = [promptText];
      if (req.file.mimetype === "application/pdf") {
        content.push({
          inlineData: {
            data: req.file.buffer.toString("base64"),
            mimeType: "application/pdf"
          }
        });
      } else {
        content.push({
          inlineData: {
            data: req.file.buffer.toString("base64"),
            mimeType: req.file.mimetype
          }
        });
      }
      const result = await model.generateContent(content);
      const response = await result.response;
      const notes = response.text();
      res.json({ notes });
    } catch (error) {
      console.error("File to notes error:", error);
      res.status(500).json({ message: "Failed to generate notes: " + error.message });
    }
  });
  app2.post("/api/ai/pdf-to-timetable", (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err) {
        console.error("Multer error:", err);
        return res.status(400).json({ message: "File upload failed: " + err.message });
      }
      next();
    });
  }, async (req, res) => {
    try {
      if (!req.file) {
        res.status(400).json({ message: "No file uploaded" });
        return;
      }
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        res.status(500).json({ message: "Gemini API Key not configured" });
        return;
      }
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const mode = req.body.mode;
      const topicsPerDay = req.body.topicsPerDay || "2";
      const studyTime = req.body.studyTime || "10:00";
      let promptText = "";
      if (mode === "syllabus") {
        promptText = `
            Create a study schedule from the following syllabus content.
            The user wants to study ${topicsPerDay} topics per day starting at ${studyTime}.
            Start from tomorrow.
            Return a JSON array of objects with:
            - "day": string (e.g., "Monday", "2023-10-27")
            - "time": string (e.g., "${studyTime} - [End Time]")
            - "subject": string (Course Name)
            - "task": string (Topic to study)
          `;
      } else {
        promptText = `
            Extract a study timetable or schedule from the following content.
            Return a JSON array of objects with:
            - "day": string (e.g., "Monday", "2023-10-27")
            - "time": string (e.g., "10:00 AM - 11:00 AM")
            - "subject": string
            - "task": string
            
            If NO explicit schedule (dates/times) is found, return exactly this JSON:
            {"error": "no_schedule_found", "mode": "syllabus_required"}
          `;
      }
      let content = [promptText];
      if (req.file.mimetype === "application/pdf") {
        const { createRequire: createRequire2 } = await import("module");
        const require3 = createRequire2(import.meta.url);
        const pdfParse = require3("pdf-parse");
        const data = await pdfParse(req.file.buffer);
        content.push(data.text.substring(0, 2e4));
      } else {
        content.push({
          inlineData: {
            data: req.file.buffer.toString("base64"),
            mimeType: req.file.mimetype
          }
        });
      }
      const result = await model.generateContent(content);
      const response = await result.response;
      const jsonString = response.text().replace(/```json/g, "").replace(/```/g, "").trim();
      const timetable = JSON.parse(jsonString);
      res.json(timetable);
    } catch (error) {
      console.error("File to timetable error:", error);
      res.status(500).json({ message: "Failed to generate timetable" });
    }
  });
  app2.post("/api/ai/attendance", async (req, res) => {
    try {
      const { present, totalConducted, upcoming, required } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        res.status(500).json({ message: "Gemini API Key not configured" });
        return;
      }
      const p = parseInt(present);
      const t = parseInt(totalConducted);
      const u = parseInt(upcoming);
      const r = parseInt(required);
      const totalClasses = t + u;
      const requiredClasses = Math.ceil(totalClasses * r / 100);
      const deficit = requiredClasses - p;
      const mustAttend = Math.max(0, deficit);
      const canBunk = Math.max(0, u - mustAttend);
      const currentPercentage = (p / t * 100).toFixed(2);
      const maxPossiblePercentage = ((p + u) / totalClasses * 100).toFixed(2);
      let status = "";
      if (mustAttend > u) {
        status = `Even if you attend ALL ${u} upcoming classes, you will only reach ${maxPossiblePercentage}%. You cannot reach ${r}%.`;
      } else if (mustAttend > 0) {
        status = `You MUST attend ${mustAttend} out of ${u} upcoming classes to reach ${r}%. You can bunk ${canBunk}.`;
      } else {
        status = `You are safe! You can bunk ${canBunk} upcoming classes and still stay above ${r}%.`;
      }
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const prompt = `
        The user wants to know their attendance status.
        Here is the mathematically correct data:
        - Current Percentage: ${currentPercentage}%
        - Target Percentage: ${r}%
        - Upcoming Classes: ${u}
        - Must Attend: ${mustAttend}
        - Can Bunk: ${canBunk}
        - Status Summary: "${status}"
        
        Task:
        Rewrite the "Status Summary" in a fun, student-friendly way.
        Keep it extremely short and concise.
        Use bullet points.
        Use emojis.
        Keep the numbers EXACTLY as provided. Do NOT recalculate.
        
        Return JSON: { "analysis": "Your short bulleted response here" }
      `;
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text2 = response.text();
      const jsonMatch = text2.match(/\{[\s\S]*\}/);
      const json = jsonMatch ? JSON.parse(jsonMatch[0]) : { analysis: text2 };
      res.json(json);
    } catch (error) {
      console.error("AI Attendance error:", error);
      res.status(500).json({ message: "Failed to analyze attendance" });
    }
  });
  app2.get("/api/youtube/playlist", async (req, res) => {
    try {
      const { listId } = req.query;
      if (!listId) {
        res.status(400).json({ message: "Playlist ID is required" });
        return;
      }
      const apiKey = process.env.YOUTUBE_API_KEY;
      if (!apiKey) {
        res.status(500).json({ message: "YouTube API Key not configured" });
        return;
      }
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=50&playlistId=${listId}&key=${apiKey}`
      );
      if (!response.ok) {
        const errorData = await response.json();
        console.error("YouTube API Error:", JSON.stringify(errorData, null, 2));
        if (response.status === 403) {
          return res.status(403).json({ message: "YouTube API Quota Exceeded or Invalid Key" });
        }
        if (response.status === 404) {
          return res.status(404).json({ message: "Playlist not found" });
        }
        throw new Error(errorData.error?.message || "Failed to fetch playlist");
      }
      const data = await response.json();
      const videoIds = data.items.map((item) => item.snippet.resourceId.videoId).join(",");
      const videosResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoIds}&key=${apiKey}`
      );
      if (!videosResponse.ok) {
        throw new Error("Failed to fetch video details");
      }
      const videosData = await videosResponse.json();
      const durationMap = new Map(
        videosData.items.map((item) => [item.id, item.contentDetails.duration])
      );
      const videos = data.items.map((item) => ({
        id: item.snippet.resourceId.videoId,
        title: item.snippet.title,
        thumbnail: item.snippet.thumbnails?.default?.url || "",
        position: item.snippet.position,
        duration: durationMap.get(item.snippet.resourceId.videoId) || "PT0M"
      }));
      res.json(videos);
    } catch (error) {
      console.error("YouTube playlist error:", error);
      res.status(500).json({ message: error.message || "Internal Server Error" });
    }
  });
  app2.post("/api/admin/promote-temp", async (req, res) => {
    try {
      const { username, secret } = req.body;
      if (secret !== "temp-secret-123") {
        return res.status(403).json({ message: "Forbidden" });
      }
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      await storage.updateUserRole(user.id, "admin");
      res.json({ message: `User ${username} promoted to admin` });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.get("/api/clash/messages", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    const groupId = req.query.groupId;
    if (!groupId) return res.status(400).json({ message: "Group ID is required" });
    const members = await storage.getGroupMembers(groupId);
    const isMember = members.some((m) => m.id === req.user.id);
    if (!isMember) return res.status(403).json({ message: "Not a member of this group" });
    const messages = await storage.getClashMessages(groupId);
    res.json(messages);
  });
  app2.post("/api/clash/messages", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    const { content, groupId } = req.body;
    if (!content) return res.status(400).json({ message: "Content is required" });
    if (!groupId) return res.status(400).json({ message: "Group ID is required" });
    if (containsProfanity(content)) {
      return res.status(400).json({ message: "Message contains inappropriate language. Please keep the chat respectful." });
    }
    const members = await storage.getGroupMembers(groupId);
    const isMember = members.some((m) => m.id === req.user.id);
    if (!isMember) return res.status(403).json({ message: "Not a member of this group" });
    const message = await storage.createClashMessage(req.user.id, content, groupId);
    res.json(message);
  });
  app2.post("/api/user/settings/clash-notifications", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    const { enabled } = req.body;
    if (typeof enabled !== "boolean") return res.status(400).json({ message: "Enabled must be a boolean" });
    await storage.toggleClashNotifications(req.user.id, enabled);
    res.json({ success: true });
  });
  app2.delete("/api/groups/:groupId/members/:userId", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    const { groupId, userId } = req.params;
    const group = await storage.getGroup(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });
    if (group.createdBy !== req.user.id) {
      return res.status(403).json({ message: "Only the group admin can remove members" });
    }
    if (userId === req.user.id) {
      return res.status(400).json({ message: "Cannot remove yourself" });
    }
    await storage.removeGroupMember(groupId, userId);
    res.sendStatus(200);
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/utils.ts
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
var __filename = fileURLToPath(import.meta.url);
var __dirname = dirname(__filename);
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
function serveStatic(app2) {
  const distPath = path.resolve(__dirname, "public");
  console.log("Serving static files from:", distPath);
  console.log("Current directory:", __dirname);
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}

// server/index.prod.ts
import { createRequire } from "module";
var app = express2();
app.set("trust proxy", 1);
var require2 = createRequire(import.meta.url);
var PostgresqlStore = require2("connect-pg-simple")(session);
app.use(session({
  secret: process.env.SESSION_SECRET || "fallback-secret",
  resave: false,
  saveUninitialized: false,
  store: new PostgresqlStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true
  }),
  cookie: {
    secure: process.env.NODE_ENV === "production",
    sameSite: "none",
    // Important for mobile
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1e3
    // 24 hours
  }
}));
app.use(auth_default.initialize());
app.use(auth_default.session());
app.use(express2.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  },
  strict: true
}));
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && "body" in err) {
    console.error("JSON parsing error:", err);
    res.status(400).json({
      message: "Invalid JSON in request body",
      error: err.message
    });
    return;
  }
  next(err);
});
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path2 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path2.startsWith("/api")) {
      let logLine = `${req.method} ${path2} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  console.log("Starting PRODUCTION server with Admin Promotion Route...");
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  serveStatic(app);
  const port = parseInt(process.env.PORT || "5001", 10);
  server.listen({
    port,
    host: "0.0.0.0"
  }, () => {
    log(`serving on port ${port}`);
  });
})();

import { type User, type InsertUser, type Task, type InsertTask, type Feedback, type InsertFeedback, type Group, type InsertGroup, type GroupMember, type InsertGroupMember, users, tasks, feedback, groups, groupMembers, notifications } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

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
  getUserGroups(userId: string): Promise<Group[]>;
  joinGroup(groupId: string, userId: string): Promise<void>;
  getGroupMembers(groupId: string): Promise<User[]>;
  seed(): Promise<void>;
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
      password: "sk2007@",
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
      pushToken: null
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
      pushToken: null
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
      userId: insertTask.userId ?? null,
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

  async getUserGroups(userId: string): Promise<Group[]> {
    const memberEntries = Array.from(this.groupMembers.values())
      .filter(m => m.userId === userId);

    const userGroups: Group[] = [];
    for (const member of memberEntries) {
      const group = this.groups.get(member.groupId!);
      if (group) userGroups.push(group);
    }
    return userGroups;
  }

  async joinGroup(groupId: string, userId: string): Promise<void> {
    // Check if already member
    const existing = Array.from(this.groupMembers.values())
      .find(m => m.groupId === groupId && m.userId === userId);

    if (existing) return;

    const id = randomUUID();
    this.groupMembers.set(id, {
      id,
      groupId,
      userId,
      joinedAt: new Date().toISOString()
    });
  }

  async getGroupMembers(groupId: string): Promise<User[]> {
    const memberEntries = Array.from(this.groupMembers.values())
      .filter(m => m.groupId === groupId);

    const members: User[] = [];
    for (const m of memberEntries) {
      const user = this.users.get(m.userId!);
      if (user) members.push(user);
    }
    return members.sort((a, b) => (b.totalFocusTime || 0) - (a.totalFocusTime || 0));
  }

  async seed(): Promise<void> {
    // MemStorage seeds in constructor
    return;
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

  async getUserGroups(userId: string): Promise<Group[]> {
    const members = await db
      .select()
      .from(groupMembers)
      .where(eq(groupMembers.userId, userId));

    const userGroups: Group[] = [];
    for (const member of members) {
      if (member.groupId) {
        const group = await this.getGroup(member.groupId);
        if (group) userGroups.push(group);
      }
    }
    return userGroups;
  }

  async joinGroup(groupId: string, userId: string): Promise<void> {
    const members = await db
      .select()
      .from(groupMembers)
      .where(eq(groupMembers.groupId, groupId));

    const isMember = members.some(m => m.userId === userId);
    if (isMember) return;

    await db.insert(groupMembers).values({
      groupId,
      userId,
      joinedAt: new Date().toISOString()
    });
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
        password: "sk2007@",
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
  }
}

export const storage = process.env.DATABASE_URL ? new DatabaseStorage() : new MemStorage();


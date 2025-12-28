import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  googleId: text("google_id").unique(),
  email: text("email"),
  displayName: text("display_name"),
  role: text("role").default("user"), // 'admin' | 'user'
  lastActive: text("last_active"), // ISO string timestamp
  apiToken: text("api_token").unique(),
  totalFocusTime: integer("total_focus_time").default(0), // in minutes
  todayFocusTime: integer("today_focus_time").default(0), // in minutes
  lastFocusDate: text("last_focus_date"), // YYYY-MM-DD
  avatar: text("avatar"),
  pushToken: text("push_token"),
  clashChatNotifications: boolean("clash_chat_notifications").default(true),
  isPro: boolean("is_pro").default(false),
  proExpiresAt: text("pro_expires_at"), // ISO timestamp
  stripeSubscriptionId: text("stripe_subscription_id"),
  createdAt: text("created_at").default(sql`now()`), // ISO timestamp for free trial
  // Gamification & Tiers
  rankTier: text("rank_tier").default("Bronze"), // Bronze, Silver, Gold...
  rankPoints: integer("rank_points").default(0),
});

export const insertUserSchema = createInsertSchema(users).pick({
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
  clashChatNotifications: true,
  isPro: true,
  rankTier: true,
  rankPoints: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const clashMessages = pgTable("clash_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  groupId: varchar("group_id").references(() => groups.id), // Added groupId
  content: text("content").notNull(),
  timestamp: text("timestamp").default(new Date().toISOString()),
});

export const insertClashMessageSchema = createInsertSchema(clashMessages).pick({
  userId: true,
  content: true,
});

export type InsertClashMessage = z.infer<typeof insertClashMessageSchema>;
export type ClashMessage = typeof clashMessages.$inferSelect;

export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  type: text("type").notNull(), // 'assignment' | 'quiz'
  title: text("title").notNull(),
  courseCode: text("course_code").notNull(),
  sectionId: text("section_id").notNull(),
  deadline: text("deadline").notNull(), // Storing as ISO string for simplicity
  completed: boolean("completed").notNull().default(false),
  notificationTime: integer("notification_time").default(24 * 60), // Minutes before deadline, default 24h
});

export const insertTaskSchema = createInsertSchema(tasks).pick({
  type: true,
  title: true,
  courseCode: true,
  sectionId: true,
  deadline: true,
  completed: true,
  notificationTime: true,
});

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;

export const feedback = pgTable("feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  content: text("content").notNull(),
  createdAt: text("created_at").default(new Date().toISOString()),
});

export const insertFeedbackSchema = createInsertSchema(feedback).pick({
  userId: true,
  content: true,
});

export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;
export type Feedback = typeof feedback.$inferSelect;

export const groups = pgTable("groups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: text("created_at").default(new Date().toISOString()),
});

export const insertGroupSchema = createInsertSchema(groups).pick({
  name: true,
  code: true,
  createdBy: true,
});

export type InsertGroup = z.infer<typeof insertGroupSchema>;
export type Group = typeof groups.$inferSelect;

export const groupMembers = pgTable("group_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: varchar("group_id").references(() => groups.id),
  userId: varchar("user_id").references(() => users.id),
  joinedAt: text("joined_at").default(new Date().toISOString()),
});

export const insertGroupMemberSchema = createInsertSchema(groupMembers).pick({
  groupId: true,
  userId: true,
});

export type InsertGroupMember = z.infer<typeof insertGroupMemberSchema>;
export type GroupMember = typeof groupMembers.$inferSelect;

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id), // Nullable for broadcast
  title: text("title").notNull(),
  body: text("body").notNull(),
  status: text("status").default("pending"), // pending, sent, failed
  createdAt: text("created_at").default(new Date().toISOString()),
});

export const insertNotificationSchema = createInsertSchema(notifications).pick({
  userId: true,
  title: true,
  body: true,
  status: true,
});

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export const appVersions = pgTable("app_versions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  versionCode: integer("version_code").notNull(),
  versionName: text("version_name").notNull(),
  apkUrl: text("apk_url").notNull(),
  releaseNotes: text("release_notes"),
  createdAt: text("created_at").default(new Date().toISOString()),
});

export const insertAppVersionSchema = createInsertSchema(appVersions).pick({
  versionCode: true,
  versionName: true,
  apkUrl: true,
  releaseNotes: true,
});

export type InsertAppVersion = z.infer<typeof insertAppVersionSchema>;
export type AppVersion = typeof appVersions.$inferSelect;

export const pomodoroSessions = pgTable("pomodoro_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  duration: integer("duration").notNull(), // Minutes
  startedAt: text("started_at").notNull(),
  endedAt: text("ended_at").notNull(),
  verified: boolean("verified").default(false),
  clientHash: text("client_hash"),
  createdAt: text("created_at").default(new Date().toISOString()),
});

export const insertPomodoroSessionSchema = createInsertSchema(pomodoroSessions).pick({
  userId: true,
  duration: true,
  startedAt: true,
  endedAt: true,
  clientHash: true,
  verified: true,
});

export type InsertPomodoroSession = z.infer<typeof insertPomodoroSessionSchema>;
export type PomodoroSession = typeof pomodoroSessions.$inferSelect;

export const rankHistory = pgTable("rank_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  seasonId: text("season_id").notNull(),
  finalRank: text("final_rank"),
  finalPoints: integer("final_points"),
  recordedAt: text("recorded_at").default(new Date().toISOString()),
});

export const insertRankHistorySchema = createInsertSchema(rankHistory).pick({
  userId: true,
  seasonId: true,
  finalRank: true,
  finalPoints: true,
});

export type InsertRankHistory = z.infer<typeof insertRankHistorySchema>;
export type RankHistory = typeof rankHistory.$inferSelect;

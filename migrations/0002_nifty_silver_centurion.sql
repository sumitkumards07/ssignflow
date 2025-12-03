CREATE TABLE "app_versions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version_code" integer NOT NULL,
	"version_name" text NOT NULL,
	"apk_url" text NOT NULL,
	"release_notes" text,
	"created_at" text DEFAULT '2025-12-03T18:51:09.088Z'
);
--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"content" text NOT NULL,
	"created_at" text DEFAULT '2025-12-03T18:51:09.088Z'
);
--> statement-breakpoint
CREATE TABLE "group_members" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" varchar,
	"user_id" varchar,
	"joined_at" text DEFAULT '2025-12-03T18:51:09.088Z'
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"created_by" varchar,
	"created_at" text DEFAULT '2025-12-03T18:51:09.088Z',
	CONSTRAINT "groups_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"status" text DEFAULT 'pending',
	"created_at" text DEFAULT '2025-12-03T18:51:09.088Z'
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "total_focus_time" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "today_focus_time" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_focus_date" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "avatar" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "push_token" text;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
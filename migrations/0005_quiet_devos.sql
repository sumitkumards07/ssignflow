ALTER TABLE "app_versions" ALTER COLUMN "created_at" SET DEFAULT '2025-12-25T15:19:52.428Z';--> statement-breakpoint
ALTER TABLE "clash_messages" ALTER COLUMN "timestamp" SET DEFAULT '2025-12-25T15:19:52.427Z';--> statement-breakpoint
ALTER TABLE "feedback" ALTER COLUMN "created_at" SET DEFAULT '2025-12-25T15:19:52.428Z';--> statement-breakpoint
ALTER TABLE "group_members" ALTER COLUMN "joined_at" SET DEFAULT '2025-12-25T15:19:52.428Z';--> statement-breakpoint
ALTER TABLE "groups" ALTER COLUMN "created_at" SET DEFAULT '2025-12-25T15:19:52.428Z';--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "created_at" SET DEFAULT '2025-12-25T15:19:52.428Z';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "created_at" text DEFAULT now();
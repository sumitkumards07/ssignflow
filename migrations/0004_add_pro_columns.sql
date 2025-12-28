ALTER TABLE "app_versions" ALTER COLUMN "created_at" SET DEFAULT '2025-12-25T08:34:59.397Z';--> statement-breakpoint
ALTER TABLE "clash_messages" ALTER COLUMN "timestamp" SET DEFAULT '2025-12-25T08:34:59.396Z';--> statement-breakpoint
ALTER TABLE "feedback" ALTER COLUMN "created_at" SET DEFAULT '2025-12-25T08:34:59.397Z';--> statement-breakpoint
ALTER TABLE "group_members" ALTER COLUMN "joined_at" SET DEFAULT '2025-12-25T08:34:59.397Z';--> statement-breakpoint
ALTER TABLE "groups" ALTER COLUMN "created_at" SET DEFAULT '2025-12-25T08:34:59.397Z';--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "created_at" SET DEFAULT '2025-12-25T08:34:59.397Z';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_pro" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "pro_expires_at" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "stripe_subscription_id" text;
CREATE TABLE "clash_messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"group_id" varchar,
	"content" text NOT NULL,
	"timestamp" text DEFAULT '2025-12-23T15:34:52.908Z'
);
--> statement-breakpoint
ALTER TABLE "app_versions" ALTER COLUMN "created_at" SET DEFAULT '2025-12-23T15:34:52.909Z';--> statement-breakpoint
ALTER TABLE "feedback" ALTER COLUMN "created_at" SET DEFAULT '2025-12-23T15:34:52.909Z';--> statement-breakpoint
ALTER TABLE "group_members" ALTER COLUMN "joined_at" SET DEFAULT '2025-12-23T15:34:52.909Z';--> statement-breakpoint
ALTER TABLE "groups" ALTER COLUMN "created_at" SET DEFAULT '2025-12-23T15:34:52.909Z';--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "created_at" SET DEFAULT '2025-12-23T15:34:52.909Z';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "clash_chat_notifications" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "clash_messages" ADD CONSTRAINT "clash_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clash_messages" ADD CONSTRAINT "clash_messages_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE no action ON UPDATE no action;
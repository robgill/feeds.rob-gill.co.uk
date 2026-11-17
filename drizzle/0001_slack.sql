ALTER TABLE "feeds" ADD COLUMN "mark" text;
--> statement-breakpoint
ALTER TABLE "feeds" ADD COLUMN "via" text;
--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "description" text;
--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "slack_posted_at" timestamp with time zone;

CREATE TABLE "destinations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_id" uuid NOT NULL,
	"type" text NOT NULL,
	"name" text NOT NULL,
	"config" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "destinations_type_check" CHECK ("destinations"."type" in ('slack', 'email', 'browser'))
);
--> statement-breakpoint
CREATE TABLE "feeds" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"schedule_cadence" text DEFAULT 'daily' NOT NULL,
	"schedule_time" text NOT NULL,
	"schedule_timezone" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "feeds_cadence_check" CHECK ("feeds"."schedule_cadence" in ('daily'))
);
--> statement-breakpoint
CREATE TABLE "items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"feed_id" uuid NOT NULL,
	"dedupe_hash" text NOT NULL,
	"title" text NOT NULL,
	"link" text,
	"published" timestamp with time zone,
	"seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "routes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_id" uuid NOT NULL,
	"feed_id" uuid NOT NULL,
	"destination_id" uuid NOT NULL,
	"format" text DEFAULT 'summary' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "routes_format_check" CHECK ("routes"."format" in ('summary', 'full'))
);
--> statement-breakpoint
CREATE TABLE "runs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"feed_id" uuid NOT NULL,
	"started" timestamp with time zone NOT NULL,
	"finished" timestamp with time zone,
	"status" text NOT NULL,
	"counts" jsonb NOT NULL,
	"error" text,
	CONSTRAINT "runs_status_check" CHECK ("runs"."status" in ('ok', 'error'))
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "destinations" ADD CONSTRAINT "destinations_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feeds" ADD CONSTRAINT "feeds_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_feed_id_feeds_id_fk" FOREIGN KEY ("feed_id") REFERENCES "public"."feeds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routes" ADD CONSTRAINT "routes_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routes" ADD CONSTRAINT "routes_feed_id_feeds_id_fk" FOREIGN KEY ("feed_id") REFERENCES "public"."feeds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routes" ADD CONSTRAINT "routes_destination_id_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."destinations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runs" ADD CONSTRAINT "runs_feed_id_feeds_id_fk" FOREIGN KEY ("feed_id") REFERENCES "public"."feeds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "destinations_owner_type_name_unique" ON "destinations" USING btree ("owner_id","type","name");--> statement-breakpoint
CREATE INDEX "destinations_owner_idx" ON "destinations" USING btree ("owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "feeds_url_unique" ON "feeds" USING btree ("url");--> statement-breakpoint
CREATE INDEX "feeds_owner_idx" ON "feeds" USING btree ("owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "items_feed_dedupe_unique" ON "items" USING btree ("feed_id","dedupe_hash");--> statement-breakpoint
CREATE INDEX "items_feed_published_idx" ON "items" USING btree ("feed_id","published");--> statement-breakpoint
CREATE UNIQUE INDEX "routes_feed_destination_unique" ON "routes" USING btree ("feed_id","destination_id");--> statement-breakpoint
CREATE INDEX "routes_owner_idx" ON "routes" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "runs_feed_started_idx" ON "runs" USING btree ("feed_id","started");
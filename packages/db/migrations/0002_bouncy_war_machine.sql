CREATE TABLE "game" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"hosting" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"replay_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_file" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"game_id" uuid NOT NULL,
	"version" text NOT NULL,
	"object_key" text NOT NULL,
	"size_bytes" bigint NOT NULL,
	"content_type" text NOT NULL,
	"etag" text,
	"status" text DEFAULT 'pending_upload' NOT NULL,
	"is_current" boolean DEFAULT false NOT NULL,
	"uploaded_by_member_id" uuid,
	"upload_expires_at" timestamp with time zone,
	"ready_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_platform_assignment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"game_id" uuid NOT NULL,
	"platform_id" uuid NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"assigned_by_member_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"assignment_id" uuid NOT NULL,
	"name" text NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "game" ADD CONSTRAINT "game_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_file" ADD CONSTRAINT "game_file_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_file" ADD CONSTRAINT "game_file_game_id_game_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."game"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_file" ADD CONSTRAINT "game_file_uploaded_by_member_id_member_id_fk" FOREIGN KEY ("uploaded_by_member_id") REFERENCES "public"."member"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_platform_assignment" ADD CONSTRAINT "game_platform_assignment_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_platform_assignment" ADD CONSTRAINT "game_platform_assignment_game_id_game_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."game"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_platform_assignment" ADD CONSTRAINT "game_platform_assignment_platform_id_platform_id_fk" FOREIGN KEY ("platform_id") REFERENCES "public"."platform"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_platform_assignment" ADD CONSTRAINT "game_platform_assignment_assigned_by_member_id_member_id_fk" FOREIGN KEY ("assigned_by_member_id") REFERENCES "public"."member"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_config" ADD CONSTRAINT "game_config_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_config" ADD CONSTRAINT "game_config_assignment_id_game_platform_assignment_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."game_platform_assignment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "game_organization_slug_ux" ON "game" USING btree ("organization_id","slug");--> statement-breakpoint
CREATE INDEX "game_organization_ix" ON "game" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "game_file_object_key_ux" ON "game_file" USING btree ("object_key");--> statement-breakpoint
CREATE INDEX "game_file_game_ix" ON "game_file" USING btree ("game_id");--> statement-breakpoint
CREATE UNIQUE INDEX "game_file_current_ux" ON "game_file" USING btree ("game_id") WHERE "game_file"."is_current" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "game_platform_assignment_game_platform_ux" ON "game_platform_assignment" USING btree ("game_id","platform_id");--> statement-breakpoint
CREATE INDEX "game_platform_assignment_organization_ix" ON "game_platform_assignment" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "game_platform_assignment_platform_ix" ON "game_platform_assignment" USING btree ("platform_id");--> statement-breakpoint
CREATE UNIQUE INDEX "game_config_assignment_name_ux" ON "game_config" USING btree ("assignment_id","name");--> statement-breakpoint
CREATE INDEX "game_config_assignment_ix" ON "game_config" USING btree ("assignment_id");
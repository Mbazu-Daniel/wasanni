CREATE TABLE "template" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"object_key" text,
	"size_bytes" bigint,
	"content_type" text,
	"status" text DEFAULT 'pending_upload' NOT NULL,
	"pending_object_key" text,
	"pending_size_bytes" bigint,
	"pending_content_type" text,
	"pending_expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"platform_id" uuid NOT NULL,
	"game_id" uuid NOT NULL,
	"assignment_id" uuid NOT NULL,
	"game_file_id" uuid,
	"game_config_id" uuid,
	"external_user_id" text NOT NULL,
	"external_user_name" text,
	"mode" text,
	"status" text DEFAULT 'active' NOT NULL,
	"token_hash" text,
	"config_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"config_schema_version" integer DEFAULT 1 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_session_score" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"platform_id" uuid NOT NULL,
	"game_id" uuid NOT NULL,
	"external_user_id" text NOT NULL,
	"mode" text,
	"score" bigint NOT NULL,
	"status" text DEFAULT 'accepted' NOT NULL,
	"flagged" boolean DEFAULT false NOT NULL,
	"flags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"source" text NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "template" ADD CONSTRAINT "template_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_session" ADD CONSTRAINT "game_session_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_session" ADD CONSTRAINT "game_session_platform_id_platform_id_fk" FOREIGN KEY ("platform_id") REFERENCES "public"."platform"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_session" ADD CONSTRAINT "game_session_game_id_game_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."game"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_session" ADD CONSTRAINT "game_session_assignment_id_game_platform_assignment_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."game_platform_assignment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_session" ADD CONSTRAINT "game_session_game_file_id_game_file_id_fk" FOREIGN KEY ("game_file_id") REFERENCES "public"."game_file"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_session" ADD CONSTRAINT "game_session_game_config_id_game_config_id_fk" FOREIGN KEY ("game_config_id") REFERENCES "public"."game_config"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_session_score" ADD CONSTRAINT "game_session_score_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_session_score" ADD CONSTRAINT "game_session_score_session_id_game_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."game_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_session_score" ADD CONSTRAINT "game_session_score_platform_id_platform_id_fk" FOREIGN KEY ("platform_id") REFERENCES "public"."platform"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_session_score" ADD CONSTRAINT "game_session_score_game_id_game_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."game"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "template_organization_kind_slug_ux" ON "template" USING btree ("organization_id","kind","slug");--> statement-breakpoint
CREATE INDEX "template_organization_ix" ON "template" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "game_session_token_hash_ux" ON "game_session" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "game_session_platform_user_ix" ON "game_session" USING btree ("platform_id","external_user_id");--> statement-breakpoint
CREATE INDEX "game_session_game_platform_ix" ON "game_session" USING btree ("game_id","platform_id");--> statement-breakpoint
CREATE INDEX "game_session_organization_ix" ON "game_session" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "game_session_score_session_ux" ON "game_session_score" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "game_session_score_game_platform_score_ix" ON "game_session_score" USING btree ("game_id","platform_id","score");--> statement-breakpoint
CREATE INDEX "game_session_score_organization_ix" ON "game_session_score" USING btree ("organization_id");
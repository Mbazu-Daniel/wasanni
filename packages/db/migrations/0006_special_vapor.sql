CREATE TABLE "tournament" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"game_id" uuid NOT NULL,
	"assignment_id" uuid,
	"game_config_id" uuid,
	"template_id" uuid,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"format" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"max_participants" integer,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournament_participant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"tournament_id" uuid NOT NULL,
	"platform_id" uuid NOT NULL,
	"external_user_id" text NOT NULL,
	"display_name" text,
	"seed" integer,
	"status" text DEFAULT 'registered' NOT NULL,
	"registered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"withdrawn_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "match" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"game_id" uuid NOT NULL,
	"tournament_id" uuid,
	"name" text,
	"bracket_round" integer,
	"bracket_slot" integer,
	"status" text DEFAULT 'pending' NOT NULL,
	"winner_participant_id" uuid,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "match_participant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"slot" integer NOT NULL,
	"platform_id" uuid NOT NULL,
	"external_user_id" text NOT NULL,
	"display_name" text,
	"seed" integer,
	"session_id" uuid,
	"score" bigint,
	"placement" integer,
	"outcome" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "game_session" ADD COLUMN "tournament_id" uuid;--> statement-breakpoint
ALTER TABLE "game_session" ADD COLUMN "match_id" uuid;--> statement-breakpoint
ALTER TABLE "tournament" ADD CONSTRAINT "tournament_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament" ADD CONSTRAINT "tournament_game_id_game_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."game"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament" ADD CONSTRAINT "tournament_assignment_id_game_platform_assignment_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."game_platform_assignment"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament" ADD CONSTRAINT "tournament_game_config_id_game_config_id_fk" FOREIGN KEY ("game_config_id") REFERENCES "public"."game_config"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament" ADD CONSTRAINT "tournament_template_id_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."template"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_participant" ADD CONSTRAINT "tournament_participant_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_participant" ADD CONSTRAINT "tournament_participant_tournament_id_tournament_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournament"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_participant" ADD CONSTRAINT "tournament_participant_platform_id_platform_id_fk" FOREIGN KEY ("platform_id") REFERENCES "public"."platform"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match" ADD CONSTRAINT "match_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match" ADD CONSTRAINT "match_game_id_game_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."game"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match" ADD CONSTRAINT "match_tournament_id_tournament_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournament"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_participant" ADD CONSTRAINT "match_participant_match_id_match_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."match"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_participant" ADD CONSTRAINT "match_participant_platform_id_platform_id_fk" FOREIGN KEY ("platform_id") REFERENCES "public"."platform"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "tournament_organization_slug_ux" ON "tournament" USING btree ("organization_id","slug");--> statement-breakpoint
CREATE INDEX "tournament_organization_ix" ON "tournament" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "tournament_status_ix" ON "tournament" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "tournament_participant_identity_ux" ON "tournament_participant" USING btree ("tournament_id","platform_id","external_user_id");--> statement-breakpoint
CREATE INDEX "tournament_participant_tournament_ix" ON "tournament_participant" USING btree ("tournament_id");--> statement-breakpoint
CREATE INDEX "tournament_participant_organization_ix" ON "tournament_participant" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "match_tournament_slot_ux" ON "match" USING btree ("tournament_id","bracket_round","bracket_slot");--> statement-breakpoint
CREATE INDEX "match_organization_game_ix" ON "match" USING btree ("organization_id","game_id");--> statement-breakpoint
CREATE INDEX "match_tournament_ix" ON "match" USING btree ("tournament_id");--> statement-breakpoint
CREATE UNIQUE INDEX "match_participant_slot_ux" ON "match_participant" USING btree ("match_id","slot");--> statement-breakpoint
CREATE UNIQUE INDEX "match_participant_identity_ux" ON "match_participant" USING btree ("match_id","platform_id","external_user_id");--> statement-breakpoint
CREATE INDEX "match_participant_session_ix" ON "match_participant" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "match_participant_identity_ix" ON "match_participant" USING btree ("platform_id","external_user_id");--> statement-breakpoint
ALTER TABLE "game_session" ADD CONSTRAINT "game_session_tournament_id_tournament_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournament"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_session" ADD CONSTRAINT "game_session_match_id_match_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."match"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "game_session_tournament_ix" ON "game_session" USING btree ("tournament_id");
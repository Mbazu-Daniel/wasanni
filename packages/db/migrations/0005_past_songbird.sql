CREATE TABLE "webhook_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"platform_id" uuid NOT NULL,
	"url" text NOT NULL,
	"description" text,
	"secret_ciphertext" text NOT NULL,
	"secret_last4" text NOT NULL,
	"events" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"last_delivery_at" timestamp with time zone,
	"last_failure_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "game_session_score" ADD COLUMN "archive_key" text;--> statement-breakpoint
ALTER TABLE "game_session_score" ADD COLUMN "archive_offset" bigint;--> statement-breakpoint
ALTER TABLE "game_session_score" ADD COLUMN "archive_length" bigint;--> statement-breakpoint
ALTER TABLE "game_session_score" ADD COLUMN "archive_rows" integer;--> statement-breakpoint
ALTER TABLE "webhook_config" ADD CONSTRAINT "webhook_config_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_config" ADD CONSTRAINT "webhook_config_platform_id_platform_id_fk" FOREIGN KEY ("platform_id") REFERENCES "public"."platform"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_config_platform_url_ux" ON "webhook_config" USING btree ("platform_id","url");--> statement-breakpoint
CREATE INDEX "webhook_config_platform_ix" ON "webhook_config" USING btree ("platform_id");--> statement-breakpoint
CREATE INDEX "webhook_config_organization_ix" ON "webhook_config" USING btree ("organization_id");
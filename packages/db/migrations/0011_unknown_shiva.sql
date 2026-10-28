CREATE TABLE "usage_counter" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"platform_id" uuid,
	"period_start" timestamp with time zone NOT NULL,
	"metric" text NOT NULL,
	"value" bigint DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usage_counter_ux" UNIQUE NULLS NOT DISTINCT("organization_id","platform_id","period_start","metric")
);
--> statement-breakpoint
CREATE TABLE "usage_quota" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"metric" text NOT NULL,
	"period" text DEFAULT 'monthly' NOT NULL,
	"limit_value" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "game_session" ADD COLUMN "score_verification_mode" text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "game_session" ADD COLUMN "score_signing_key_ciphertext" text;--> statement-breakpoint
ALTER TABLE "game_session_score" ADD COLUMN "verification_status" text DEFAULT 'not_required' NOT NULL;--> statement-breakpoint
ALTER TABLE "usage_counter" ADD CONSTRAINT "usage_counter_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_counter" ADD CONSTRAINT "usage_counter_platform_id_platform_id_fk" FOREIGN KEY ("platform_id") REFERENCES "public"."platform"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_quota" ADD CONSTRAINT "usage_quota_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "usage_counter_lookup_ix" ON "usage_counter" USING btree ("organization_id","metric","period_start");--> statement-breakpoint
CREATE INDEX "usage_counter_platform_ix" ON "usage_counter" USING btree ("platform_id");--> statement-breakpoint
CREATE UNIQUE INDEX "usage_quota_org_metric_ux" ON "usage_quota" USING btree ("organization_id","metric","period");
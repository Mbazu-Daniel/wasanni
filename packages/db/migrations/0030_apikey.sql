ALTER TABLE "audit_log" DROP CONSTRAINT "audit_log_actor_api_key_id_api_key_id_fk";
--> statement-breakpoint
CREATE TABLE "apikey" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"config_id" text DEFAULT 'default' NOT NULL,
	"name" text,
	"start" text,
	"reference_id" text NOT NULL,
	"prefix" text,
	"key" text NOT NULL,
	"refill_interval" integer,
	"refill_amount" integer,
	"last_refill_at" timestamp with time zone,
	"enabled" boolean DEFAULT true NOT NULL,
	"rate_limit_enabled" boolean DEFAULT true NOT NULL,
	"rate_limit_time_window" integer,
	"rate_limit_max" integer,
	"request_count" integer DEFAULT 0 NOT NULL,
	"remaining" integer,
	"last_request" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"permissions" text,
	"metadata" text
);
--> statement-breakpoint
INSERT INTO "apikey" (
	"id",
	"config_id",
	"name",
	"start",
	"reference_id",
	"prefix",
	"key",
	"enabled",
	"expires_at",
	"created_at",
	"updated_at",
	"permissions"
)
SELECT
	"id",
	'platform',
	"name",
	"prefix",
	"organization_id"::text,
	"prefix",
	"key_hash",
	false,
	"expires_at",
	"created_at",
	"created_at",
	"permissions"
FROM "api_key";
--> statement-breakpoint
DROP TABLE "api_key";
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_api_key_id_apikey_id_fk" FOREIGN KEY ("actor_api_key_id") REFERENCES "public"."apikey"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "apikey_config_id_ix" ON "apikey" USING btree ("config_id");--> statement-breakpoint
CREATE INDEX "apikey_reference_id_ix" ON "apikey" USING btree ("reference_id");--> statement-breakpoint
CREATE INDEX "apikey_key_ix" ON "apikey" USING btree ("key");


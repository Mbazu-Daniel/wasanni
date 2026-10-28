CREATE TABLE "agent_provider" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"spec" text NOT NULL,
	"base_url" text NOT NULL,
	"model" text NOT NULL,
	"api_key_ciphertext" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_by_member_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_run" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"provider_id" uuid,
	"model" text NOT NULL,
	"prompt" text NOT NULL,
	"output" text,
	"status" text NOT NULL,
	"prompt_tokens" integer DEFAULT 0 NOT NULL,
	"completion_tokens" integer DEFAULT 0 NOT NULL,
	"cost_micros" integer DEFAULT 0 NOT NULL,
	"duration_ms" integer DEFAULT 0 NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_provider" ADD CONSTRAINT "agent_provider_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_provider" ADD CONSTRAINT "agent_provider_created_by_member_id_member_id_fk" FOREIGN KEY ("created_by_member_id") REFERENCES "public"."member"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_run" ADD CONSTRAINT "agent_run_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_run" ADD CONSTRAINT "agent_run_provider_id_agent_provider_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."agent_provider"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "agent_provider_organization_name_ux" ON "agent_provider" USING btree ("organization_id","name");--> statement-breakpoint
CREATE INDEX "agent_provider_organization_ix" ON "agent_provider" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "agent_run_organization_created_ix" ON "agent_run" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "agent_run_provider_ix" ON "agent_run" USING btree ("provider_id");
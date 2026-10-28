CREATE TABLE "webhook_delivery" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"platform_id" uuid NOT NULL,
	"webhook_id" uuid NOT NULL,
	"event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"attempt" integer NOT NULL,
	"status" text NOT NULL,
	"status_code" integer,
	"response_body" text,
	"error" text,
	"duration_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "webhook_delivery" ADD CONSTRAINT "webhook_delivery_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_delivery" ADD CONSTRAINT "webhook_delivery_platform_id_platform_id_fk" FOREIGN KEY ("platform_id") REFERENCES "public"."platform"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_delivery" ADD CONSTRAINT "webhook_delivery_webhook_id_webhook_config_id_fk" FOREIGN KEY ("webhook_id") REFERENCES "public"."webhook_config"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "webhook_delivery_webhook_created_ix" ON "webhook_delivery" USING btree ("webhook_id","created_at");--> statement-breakpoint
CREATE INDEX "webhook_delivery_event_ix" ON "webhook_delivery" USING btree ("event_id");
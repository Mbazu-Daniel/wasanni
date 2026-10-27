CREATE TABLE "organization_role" (
	"organization_id" uuid NOT NULL,
	"role" text NOT NULL,
	"permission" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organization_role_organization_id_role_pk" PRIMARY KEY("organization_id","role")
);
--> statement-breakpoint
ALTER TABLE "organization_role" ADD CONSTRAINT "organization_role_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "organization_role_organization_ix" ON "organization_role" USING btree ("organization_id");
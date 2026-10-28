ALTER TABLE "agent_run" ADD COLUMN "created_by_member_id" uuid;--> statement-breakpoint
ALTER TABLE "agent_run" ADD COLUMN "created_by_user_id" text;--> statement-breakpoint
ALTER TABLE "agent_run" ADD CONSTRAINT "agent_run_created_by_member_id_member_id_fk" FOREIGN KEY ("created_by_member_id") REFERENCES "public"."member"("id") ON DELETE set null ON UPDATE no action;
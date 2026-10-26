DROP INDEX "member_organization_user_ux";--> statement-breakpoint
ALTER TABLE "member" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "member_organization_user_ux" ON "member" USING btree ("organization_id","user_id") WHERE "member"."deleted_at" is null;
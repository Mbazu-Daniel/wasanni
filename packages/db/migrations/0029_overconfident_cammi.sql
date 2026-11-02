ALTER TABLE "api_key" DROP CONSTRAINT "api_key_platform_id_platform_id_fk";
--> statement-breakpoint
DROP INDEX "api_key_platform_ix";--> statement-breakpoint
ALTER TABLE "api_key" DROP COLUMN "platform_id";
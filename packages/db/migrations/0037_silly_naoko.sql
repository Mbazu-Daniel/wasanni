DROP INDEX "game_file_current_ux";--> statement-breakpoint
ALTER TABLE "game_file" ADD COLUMN "platform_id" uuid;--> statement-breakpoint
ALTER TABLE "game_file" ADD CONSTRAINT "game_file_platform_id_platform_id_fk" FOREIGN KEY ("platform_id") REFERENCES "public"."platform"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "platform_slug_ux" ON "platform" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "game_file_current_platform_ux" ON "game_file" USING btree ("game_id","platform_id") WHERE "game_file"."is_current" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "game_file_current_ux" ON "game_file" USING btree ("game_id") WHERE "game_file"."is_current" = true AND "game_file"."platform_id" IS NULL;
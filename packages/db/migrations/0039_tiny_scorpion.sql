ALTER TABLE "tournament" ADD COLUMN "game_seed" text;--> statement-breakpoint
UPDATE "tournament" SET "game_seed" = substr(md5(random()::text || id::text), 1, 12) WHERE "game_seed" IS NULL;--> statement-breakpoint
ALTER TABLE "tournament" ALTER COLUMN "game_seed" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "tournament_game_seed_ux" ON "tournament" USING btree ("game_seed");

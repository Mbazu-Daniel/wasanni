ALTER TABLE "game_file" ADD COLUMN "kind" text DEFAULT 'single' NOT NULL;--> statement-breakpoint
ALTER TABLE "game_file" ADD COLUMN "entry_point" text DEFAULT 'index.html' NOT NULL;--> statement-breakpoint
ALTER TABLE "game_file" ADD COLUMN "served_prefix" text;--> statement-breakpoint
ALTER TABLE "game_file" ADD COLUMN "cross_origin_isolation" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "game_file" ADD COLUMN "spa_fallback" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "game_file" ADD COLUMN "extracted_at" timestamp with time zone;

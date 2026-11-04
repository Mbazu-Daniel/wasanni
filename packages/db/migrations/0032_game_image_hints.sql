ALTER TABLE "game" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "game" ADD COLUMN "hints" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "tournament" ADD COLUMN "image_url" text;
ALTER TABLE "agent_run" ADD COLUMN "messages" jsonb;--> statement-breakpoint
ALTER TABLE "agent_session" ADD COLUMN "game_id" uuid;--> statement-breakpoint
ALTER TABLE "agent_session" ADD CONSTRAINT "agent_session_game_id_game_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."game"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_session_game_ix" ON "agent_session" USING btree ("game_id");
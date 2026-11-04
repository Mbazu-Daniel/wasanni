CREATE INDEX "tournament_organization_game_ix" ON "tournament" USING btree ("organization_id","game_id");--> statement-breakpoint
CREATE INDEX "tournament_participant_tournament_status_ix" ON "tournament_participant" USING btree ("tournament_id","status");--> statement-breakpoint
CREATE INDEX "match_organization_game_status_ix" ON "match" USING btree ("organization_id","game_id","status");--> statement-breakpoint
CREATE INDEX "game_session_score_board_ix" ON "game_session_score" USING btree ("organization_id","game_id","status","score");
ALTER TABLE "agent_provider" DROP COLUMN "max_request_tokens";--> statement-breakpoint
ALTER TABLE "agent_run" DROP COLUMN "prompt_tokens";--> statement-breakpoint
ALTER TABLE "agent_run" DROP COLUMN "completion_tokens";--> statement-breakpoint
ALTER TABLE "agent_run" DROP COLUMN "cost_micros";--> statement-breakpoint
DELETE FROM "usage_counter" WHERE "metric" IN ('ai_runs', 'ai_cost_micros');--> statement-breakpoint
DELETE FROM "usage_quota" WHERE "metric" IN ('ai_runs', 'ai_cost_micros');

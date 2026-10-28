import { RateLimitedError, type Logger, type Redis } from "@wasanni/kit";
import type { RateLimitHook, RateLimitRequest, RateLimitRules } from "./types.ts";

const WINDOW_SCRIPT = `
local count = redis.call("INCR", KEYS[1])
if count == 1 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
end
return {count, redis.call("PTTL", KEYS[1])}
`;

export const createRateLimiter = (
  redis: Redis | null,
  rules: RateLimitRules,
  logger: Logger,
): RateLimitHook =>
  (name: string) =>
    async function guard(context: RateLimitRequest): Promise<void> {
      if (redis === null) return;

      const rule = rules[name];
      if (rule === undefined) return;

      const key = rule.key(context);
      if (key === null) return;

      let count: number;
      let ttlMs: number;

      try {
        const result = await redis.eval(WINDOW_SCRIPT, 1, key, String(rule.windowMs));
        [count, ttlMs] = result as [number, number];
      } catch (error) {
        logger.warn("rate limit unavailable", { err: error, key });
        return;
      }

      if (count > rule.limit) {
        const retryAfter = Math.max(1, Math.ceil(ttlMs / 1000));

        throw new RateLimitedError(`rate limit exceeded; retry in ${retryAfter}s`, {
          details: { retryAfter, limit: rule.limit, windowMs: rule.windowMs },
        });
      }
    };

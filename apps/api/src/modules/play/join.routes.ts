import {
  JoinCodeParams,
  JoinResolveSingle,
} from "@wasanni/contracts";
import type { PrincipalApi, RateLimitHook } from "../../plugins/types.ts";
import type { JoinService } from "./join.service.ts";

export type JoinRouteDeps = {
  service: JoinService;
  rateLimit?: RateLimitHook;
};

export const createJoinRoutes = <T extends PrincipalApi>(
  api: T,
  { service, rateLimit }: JoinRouteDeps,
) =>
  api.get(
    "/api/v1/join/:code",
    async ({ params }) => ({ join: await service.resolve(params.code) }),
    {
      params: JoinCodeParams,
      response: { 200: JoinResolveSingle },
      ...(rateLimit === undefined ? {} : { beforeHandle: rateLimit("joinResolve") }),
      detail: { tags: ["play"], summary: "Resolve a 10-digit join code into a play url" },
    },
  );

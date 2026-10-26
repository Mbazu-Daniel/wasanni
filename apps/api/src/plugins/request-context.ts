import { randomUUID } from "node:crypto";
import { Elysia } from "elysia";
import type { Logger } from "@wasanni/kit";

export type RequestContext = {
  readonly requestId: string;
  readonly startedAt: number;
};

const SAFE_REQUEST_ID = /^[A-Za-z0-9_-]{8,64}$/;

const contexts = new WeakMap<Request, RequestContext>();

export function requestContextOf(request: Request): RequestContext {
  const context = contexts.get(request);

  if (context === undefined) {
    throw new Error("request context missing: onRequest did not run");
  }

  return context;
}

export const requestContext = (rootLogger: Logger) =>
  new Elysia({ name: "request-context" })
    .onRequest(({ request, set }) => {
      const inbound = request.headers.get("x-request-id");
      const requestId = inbound && SAFE_REQUEST_ID.test(inbound) ? inbound : randomUUID();

      contexts.set(request, { requestId, startedAt: performance.now() });
      set.headers["x-request-id"] = requestId;
    })
    .derive({ as: "global" }, ({ request }) => {
      const { requestId, startedAt } = requestContextOf(request);
      return { requestId, startedAt, log: rootLogger.child({ requestId }) };
    });

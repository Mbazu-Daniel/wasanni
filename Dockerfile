FROM oven/bun:1.4.4-alpine AS dependencies
WORKDIR /app

COPY package.json bun.lock bunfig.toml ./
COPY apps/api/package.json ./apps/api/
COPY apps/mcp/package.json ./apps/mcp/
COPY apps/realtime/package.json ./apps/realtime/
COPY apps/web/package.json ./apps/web/
COPY apps/worker/package.json ./apps/worker/
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/db/package.json ./packages/db/
COPY packages/jobs/package.json ./packages/jobs/
COPY packages/kit/package.json ./packages/kit/
RUN bun install --frozen-lockfile --production

FROM oven/bun:1.4.4-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -qO- "http://localhost:${PORT:-3000}/healthz" || exit 1

COPY --from=dependencies /app /app
COPY apps/api ./apps/api
COPY apps/realtime ./apps/realtime
COPY apps/worker ./apps/worker
COPY packages ./packages

USER bun
CMD ["sh", "-c", "bun run packages/db/src/cli-migrate.ts && exec bun run apps/api/src/index.ts"]

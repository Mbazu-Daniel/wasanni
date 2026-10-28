FROM oven/bun:1-alpine

WORKDIR /app

COPY package.json bun.lock bunfig.toml ./
COPY apps ./apps
COPY packages ./packages
RUN bun install --frozen-lockfile --production

ENV NODE_ENV=production
EXPOSE 3000

CMD ["bun", "run", "apps/api/src/index.ts"]

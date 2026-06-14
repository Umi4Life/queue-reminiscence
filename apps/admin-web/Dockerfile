FROM oven/bun:1-alpine AS builder
WORKDIR /app

# Copy all workspace manifests so the monorepo lockfile is consistent
COPY package.json bun.lock ./
COPY apps/admin-web/package.json ./apps/admin-web/
COPY apps/api/package.json ./apps/api/
COPY apps/public-web/package.json ./apps/public-web/
COPY packages/config/package.json ./packages/config/
COPY packages/db/package.json ./packages/db/
COPY packages/domain/package.json ./packages/domain/
COPY packages/ui/package.json ./packages/ui/

RUN bun install --frozen-lockfile

# Only copy source needed for this app
COPY apps/admin-web ./apps/admin-web/

RUN bun run --cwd apps/admin-web build

FROM node:22-alpine AS runner
WORKDIR /app

COPY --from=builder /app/apps/admin-web/build ./build

ENV PORT=3001
EXPOSE 3001

CMD ["node", "build/index.js"]

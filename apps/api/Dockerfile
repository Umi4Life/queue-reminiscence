FROM oven/bun:1-alpine AS base
WORKDIR /app

# Copy all workspace manifests so the monorepo lockfile is consistent
COPY package.json bun.lock ./
COPY apps/api/package.json ./apps/api/
COPY apps/admin-web/package.json ./apps/admin-web/
COPY apps/public-web/package.json ./apps/public-web/
COPY packages/config/package.json ./packages/config/
COPY packages/db/package.json ./packages/db/
COPY packages/domain/package.json ./packages/domain/
COPY packages/ui/package.json ./packages/ui/

RUN bun install --frozen-lockfile

# Copy source files needed by the API and its workspace dependencies
COPY apps/api ./apps/api/
COPY packages ./packages/

EXPOSE 3002
CMD ["bun", "run", "apps/api/src/index.ts"]

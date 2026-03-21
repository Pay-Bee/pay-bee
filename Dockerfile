# ── Stage 1: Builder ─────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Copy workspace manifests first for layer caching
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

# Install all deps (devDeps needed for TypeScript compilation)
RUN npm ci

# Copy source
COPY packages/shared/ ./packages/shared/
COPY apps/api/ ./apps/api/

# Compile TypeScript + copy schema.sql into dist
# (tsc doesn't copy .sql files, but gateway/index.ts reads it from dist/db/schema.sql at runtime)
RUN npm run build --workspace=apps/api && \
    cp apps/api/src/db/schema.sql apps/api/dist/db/schema.sql

# ── Stage 2: Runner ───────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

# Copy workspace manifests so npm can resolve the shared workspace symlink
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

# Production deps only
RUN npm ci --omit=dev

# Copy compiled output (includes schema.sql)
COPY --from=builder /app/apps/api/dist ./apps/api/dist

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["node", "apps/api/dist/gateway/index.js"]

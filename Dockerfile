# ─── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app

# Copy workspace root + per-package manifests for efficient layer caching
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/server/package.json ./packages/server/package.json
COPY packages/client/package.json ./packages/client/package.json
RUN npm ci

# Copy source and build all workspaces (shared must build before server)
COPY tsconfig.json ./
COPY packages/shared ./packages/shared
COPY packages/server ./packages/server
COPY packages/client ./packages/client
RUN npm run build

# ─── Stage 2: Production runtime ────────────────────────────────────────────
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Install production deps only for shared + server (client not needed at runtime)
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/server/package.json ./packages/server/package.json
RUN npm ci --omit=dev --workspace @ellmud/shared --workspace @ellmud/server \
    && npm cache clean --force

# Copy compiled output
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/server/dist ./packages/server/dist
COPY --from=build /app/packages/client/dist ./packages/server/dist/public

EXPOSE 2567
CMD ["node", "packages/server/dist/index.js"]

# syntax=docker/dockerfile:1

# ---------- build stage ----------
# Astro inlines import.meta.env at build time; secrets are NOT passed here —
# they are injected at runtime (see docker-compose.yml) via process.env.
# Bun pinned to 1.4.2 (matches bun.lock).
#
# python3/make/g++ are required because better-sqlite3's prebuilt binary
# does not load under Bun's node shim (ABI mismatch) and its install script
# falls back to a node-gyp source build — which needs a full toolchain. The
# compiled N-API binding is glibc-compatible with the debian runtime stage.
FROM oven/bun:1.4.2 AS build
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json bun.lock ./
# better-sqlite3's postinstall (prebuild-install) is allowed via the
# package.json `allowScripts` entry — keep it, or the native binary is
# never fetched and the runtime crashes on first DB access.
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

# ---------- runtime stage ----------
# debian (glibc) keeps better-sqlite3's and sharp's prebuilt binaries happy —
# do not switch to alpine without checking musl prebuild coverage.
FROM oven/bun:1.4.2-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=4321 \
    DB_PATH=/app/data/raybrilliant.db

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

# SQLite database + uploaded images (data/uploads) live in here.
# Mount a volume on /app/data so both survive image rebuilds.
VOLUME ["/app/data"]

EXPOSE 4321
CMD ["bun", "./dist/server/entry.mjs"]

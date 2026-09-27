# syntax=docker/dockerfile:1

# ---------- build stage ----------
# Astro inlines import.meta.env at build time; secrets are NOT passed here —
# they are injected at runtime (see docker-compose.yml) via process.env.
# Bun pinned to 1.4.2 (matches bun.lock). The content store uses
# better-sqlite3, whose N-API binding runs identically under Bun — no Node
# needed in the image (`bun run` aliases node → bun for the astro CLI).
FROM oven/bun:1.4.2 AS build
WORKDIR /app

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

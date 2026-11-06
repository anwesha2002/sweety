# API image. Build from the repository root:
#   docker build -f server/Dockerfile -t sweety-server .
# (docker-compose.prod.yml does this for you.)

# ---- build: install everything, compile TypeScript -------------------------------------------
FROM node:22-bookworm-slim AS build
WORKDIR /app

# The workspaces share one lockfile, so every workspace's package.json must be present.
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci --workspace server

COPY server server
RUN npm run build --workspace server

# ---- runtime: production dependencies + compiled code only -----------------------------------
FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci --workspace server --omit=dev && npm cache clean --force

COPY --from=build /app/server/dist server/dist
# The SQL migrations; applied on every start by dist/db/migrate.js
COPY server/drizzle server/drizzle

WORKDIR /app/server
USER node
EXPOSE 4000

# Healthy when the API answers and the database is reachable.
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 4000) + '/api/v1/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# Bring the database up to date, then start the API. `exec` makes node PID 1 of the container,
# so it receives SIGTERM and can shut down gracefully.
CMD ["sh", "-c", "node dist/db/migrate.js && exec node dist/server.js"]

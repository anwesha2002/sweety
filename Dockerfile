# One image that runs the whole app: the Express API also serves the built React app.
# Made for hosts that run a single container, such as Render's free web service:
#   docker build -t sweety .
#
# (For a server you control, docker-compose.prod.yml runs nginx + API + Postgres as separate
# containers instead; see docs/deployment.md.)

# ---- build: compile the React app and the API -------------------------------------------------
FROM node:22-bookworm-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci

COPY server server
COPY client client
# The browser calls the API on the same origin ("/api/v1").
ARG VITE_API_URL=/api/v1
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build --workspace client && npm run build --workspace server

# ---- runtime: production dependencies, compiled API, built React app --------------------------
FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci --workspace server --omit=dev && npm cache clean --force

COPY --from=build /app/server/dist server/dist
COPY server/drizzle server/drizzle
COPY --from=build /app/client/dist client-dist

# Tell the API to serve the React app from here.
ENV CLIENT_DIST_DIR=/app/client-dist

WORKDIR /app/server
USER node

# Render provides PORT (10000 by default) and expects the app to listen on it.
EXPOSE 10000

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 4000) + '/api/v1/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# 1. CLIENT_URL (the app's public address, used for CORS) defaults to the address Render
#    provides in RENDER_EXTERNAL_URL, so it does not have to be set by hand.
# 2. Bring the database up to date (Render's free plan has no pre-deploy command, so this
#    happens on every start; it does nothing when the database is already current).
# 3. `exec` makes node PID 1, so it receives SIGTERM and shuts down gracefully.
CMD ["sh", "-c", "export CLIENT_URL=\"${CLIENT_URL:-$RENDER_EXTERNAL_URL}\"; node dist/db/migrate.js && exec node dist/server.js"]

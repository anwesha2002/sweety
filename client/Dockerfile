# Web image: the built React app served by nginx, which also forwards /api to the API container.
# Build from the repository root:
#   docker build -f client/Dockerfile -t sweety-web .
# (docker-compose.prod.yml does this for you.)

# ---- build: compile the React app -------------------------------------------------------------
FROM node:22-bookworm-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY client/package.json client/
COPY server/package.json server/
RUN npm ci --workspace client

COPY client client
# The browser calls the API on the same origin ("/api/v1"), which nginx forwards to the server.
# Override only if the API lives on another domain (that also needs SameSite=None + CSRF tokens).
ARG VITE_API_URL=/api/v1
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build --workspace client

# ---- runtime: nginx ---------------------------------------------------------------------------
FROM nginx:1.27-alpine AS runtime
COPY client/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/client/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=15s --timeout=3s --retries=5 \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1

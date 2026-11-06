# Deploying Sweety

Two ways to run Sweety in production, both built from Docker images in this repository:

|              | **A. Render (free plan)**             | **B. A server you control (VPS)**                                   |
| ------------ | ------------------------------------- | ------------------------------------------------------------------- |
| Containers   | 1 (the API also serves the React app) | 3: nginx + API + PostgreSQL                                         |
| Config files | `Dockerfile`, `render.yaml`           | `server/Dockerfile`, `client/Dockerfile`, `docker-compose.prod.yml` |
| Database     | an external one, e.g. Neon (free)     | bundled Postgres with a Docker volume                               |
| HTTPS        | provided by Render                    | you add it (Caddy example below)                                    |
| Cost         | free, with the limits listed below    | the price of the server                                             |

---

# A. Deploy to Render (free)

## What "free" means here: read this first

These come from [Render's own free-plan page](https://render.com/docs/free), which also says free instances are "not for production applications":

- **The service sleeps after 15 minutes without traffic.** The next visit takes about a minute while it wakes up (Render shows a loading page). Waking up re-runs the database migration check, which is quick.
- **Free web services can't receive private-network traffic,** so Render can't run the nginx + API split from option B. That is why option A uses one container: the API serves the React app too (one origin, so the login cookie works with no CORS or CSRF setup).
- **Render's free Postgres expires after 30 days** (then a 14-day grace period before it is deleted), has no backups, and is 1 GB. Use an external database instead. Neon's free plan has no expiry, and you already know it. (How to use Render's Postgres anyway: see the end of this section.)
- 750 free instance hours per month per workspace, no shell access, the filesystem is wiped on every restart (the app stores nothing on disk), and Render may restart a free service at any time.
- Logins survive restarts and sleep: the session is a signed token in a cookie, not something kept in memory.

## What you need

- A **Neon** account (neon.tech), a **GitHub** account and a **Render** account (render.com). Creating those accounts and the repository is up to you.
- This project pushed to a GitHub repository (a private one is fine). Nothing secret is in the repository: `.env` files are git-ignored (check with `git status` that no `.env` file is listed before you commit).

## Steps

1. **Create the production database.** In Neon, create a **new project** (for example `sweety-prod`) in the region closest to your users (Singapore matches the `render.yaml` default). Do not reuse your development database. From the connection details copy the **connection string**; it looks like `postgresql://user:password@ep-xxxx.region.aws.neon.tech/neondb?sslmode=require`. The tables are created automatically when the app first starts.

2. **Push the code to GitHub:**

   ```bash
   git add -A
   git commit -m "Add Render deployment"
   git remote add origin https://github.com/<you>/<repo>.git
   git push -u origin main
   ```

3. **Create the service from the Blueprint.** In the [Render dashboard](https://dashboard.render.com) choose **New → Blueprint**, connect the repository, and let Render read `render.yaml`. It shows one free web service named `sweety`. Render asks for **`DATABASE_URL`**: paste the Neon connection string. (`JWT_SECRET` is generated for you; the other settings come from `render.yaml`.) Click **Apply**.

4. **Wait for the first build** (several minutes: it installs dependencies and builds both apps). In the service's **Logs** you should see, in order:

   ```
   Database migrations are up to date.
   {"level":30, ... "msg":"Sweety API listening on port 10000 (production)"}
   ```

   When Render marks the deploy **Live**, its health check (`/api/v1/health`, which includes the database) has passed.

5. **Open the address Render shows** (`https://sweety-xxxx.onrender.com`). Register an account, add a reading, check the dashboard and the reports. The demo-user seed does not run in production; you create your own account.

6. **Check the client IP setting** (once). Rate limiting on login and register needs to see each visitor's real address. `render.yaml` sets `TRUST_PROXY=1`, as Render's own Express example does. To confirm: open the service **Logs**, make a request from your browser, and find the request line's `"x-forwarded-for"` value.
   - One address (yours): `TRUST_PROXY=1` is right.
   - Two addresses separated by a comma (yours first, then another): set `TRUST_PROXY=2` under **Environment** and save. Otherwise every visitor looks like the same address and shares one login-attempt limit.

7. **Optional:** add your own domain under **Settings → Custom Domains** (free plan supported; Render provides the certificate). If you do, nothing in the app needs to change.

## After it is live

- **Updates:** push to the branch Render watches; `autoDeployTrigger: commit` rebuilds and redeploys, and a new deploy only receives traffic once its health check passes. Schema changes ship as new files in `server/drizzle/` (created with `npm run db:generate`) and are applied on start. Migrations only go forward and Render rolls back only to the two previous deploys, so back up before a schema change.
- **Backups:** your data lives in Neon. Neon's free plan keeps a short history you can restore from in its dashboard; for your own copy run `pg_dump "<connection string>" > backup.sql` regularly.
- **Environment changes** (for example `TRUST_PROXY`, `JWT_EXPIRES_IN`) are made under the service's **Environment** tab and restart the service.
- **Changing `JWT_SECRET`** logs everyone out (existing tokens stop verifying).

## If something goes wrong

| What you see                                  | Likely cause and fix                                                                                                                                       |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Build fails or is killed                      | The free build machine ran out of memory or time. Retry the deploy; if it repeats, the build (not the app) is the limit.                                   |
| Logs: `Invalid environment configuration`     | The lines after it name the missing/invalid setting (usually `DATABASE_URL` pasted wrongly: it must start with `postgresql://`).                           |
| Deploy never goes Live, health check fails    | The app can't reach the database. Check the Neon string (`?sslmode=require` is fine), that the Neon project is active, and the log line above the failure. |
| Page loads but login says "Too many attempts" | Probably the client IP setting: see step 6.                                                                                                                |
| Very slow first visit                         | The service was asleep (about a minute), and the Neon database may need a second to wake. Normal on free plans.                                            |
| "Service suspended"                           | Monthly free hours or bandwidth used up, or Render flagged heavy outbound traffic. Check the Billing page.                                                 |

## Using Render's free Postgres instead of Neon

Only if you accept the 30-day expiry. In `render.yaml` add a database and point `DATABASE_URL` at it instead of `sync: false`:

```yaml
databases:
  - name: sweety-db
    plan: free
    region: singapore

services:
  - type: web
    # ... as before, but:
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: sweety-db
          property: connectionString
```

## What was verified, and what was not

The image from the root `Dockerfile` was built and run locally the way Render runs it: `PORT=10000`, `RENDER_EXTERNAL_URL` set and `CLIENT_URL` not set, against a scratch Postgres database. Checked: migrations run on start; the health endpoint answers; the React app loads (also on deep links like `/reports` and after a reload); hashed assets are cached for a year and `index.html` is not; unknown API paths and missing files give a JSON 404 rather than the app; register/login set the `HttpOnly; Secure; SameSite=Lax` cookie; readings and reports work; Helmet's security headers (including its Content-Security-Policy) do not break the app in a browser; `docker stop` exits cleanly with code 0 in about two seconds; a missing `DATABASE_URL` stops the container with a readable message.

**Not verified:** an actual deployment on Render (I cannot create accounts or deploy), Render's build on its free machines, `render.yaml` against Render's validator (it follows Render's Blueprint reference), Neon with this image, the real number of proxies in front of your service (step 6 tells you how to check), and behaviour under load.

---

# B. Deploy to a server you control (VPS)

Sweety ships as a three-container stack (`docker-compose.prod.yml`):

```
browser ──HTTPS──► your TLS proxy ──► web (nginx: React app + /api proxy) ──► server (Express) ──► postgres
```

- **web** serves the built React app and forwards `/api` to the API. The browser only ever talks to one origin, so the HttpOnly login cookie works without CORS or CSRF tokens (see "CSRF" in the README).
- **server** runs the SQL migrations on every start, then the API (non-root user, graceful shutdown, health check).
- **postgres** keeps its data in a named Docker volume. Only `web` is reachable from outside; the API and the database publish no ports.

**Verified** on a developer machine with Docker Desktop: both images build; Postgres, API and nginx become healthy in order; migrations apply (and are skipped on the next start); `/api/v1/health` answers through nginx; the app and deep links load; register, login, the session cookie, readings, reports, the duplicate-slot rule and the 401s work through nginx; rate-limit headers show the right client address (`TRUST_PROXY=1`); `docker stop` shuts the API down in about a second with exit code 0; data survives `docker compose down` and `up`; login works in a browser on `http://localhost:8080`. **Not verified:** a real server with a real domain and HTTPS (the Caddy example below is untested).

You need a Linux server with Docker and the Compose plugin, a domain name pointing at it, and ports 80 and 443 open.

1. **Get the code onto the server** (git clone, or copy the folder).
2. **Create the settings file** and fill it in:

   ```bash
   cp .env.production.example .env.production
   ```

   - `PUBLIC_URL`: the address people will open, for example `https://sweety.example.com`. It must be `https://` (the login cookie is marked `Secure`, so login does not work over plain HTTP on a real domain).
   - `POSTGRES_PASSWORD`: letters and digits only. `node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"`
   - `JWT_SECRET`: 32+ characters. `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
   - `TRUST_PROXY`: `2` when a TLS proxy (Caddy, a load balancer) sits in front of the `web` container, `1` if clients reach nginx directly.

3. **Start it** (the first run builds the images):

   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
   ```

4. **Put HTTPS in front of port 8080** (`WEB_PORT`). With [Caddy](https://caddyserver.com) this is the whole configuration (untested here; Caddy gets and renews the certificate by itself):

   ```
   sweety.example.com {
     reverse_proxy localhost:8080
   }
   ```

5. **Check it:** open `https://sweety.example.com`, register, add a reading. `curl https://sweety.example.com/api/v1/health` should answer `"database":"up"`.

Day to day:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f server   # follow the API log
docker compose -f docker-compose.prod.yml --env-file .env.production ps               # status and health
git pull && docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build   # update
```

An update applies new migrations automatically when the API starts. Migrations only go forward: before a release that changes the schema, take a backup.

**Backups** (the volume is the only copy of the data):

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T postgres \
  pg_dump -U sweety sweety > backup-$(date +%F).sql
```

Restore with `psql` into a fresh database. Run the dump on a schedule (cron) and copy it off the server.

**Using a hosted Postgres (Neon, Supabase, ...) instead of the bundled one:** the API only needs a `DATABASE_URL`. Remove the `postgres` service (and the API's `depends_on` on it) from `docker-compose.prod.yml` and replace the API's `DATABASE_URL` line with your provider's connection string. The API runs the migrations on start. Untested here.

**Other container platforms** (Railway, Fly.io, ...): the root `Dockerfile` (one container, like Render) is the easiest to adapt; give it `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV=production`, `CLIENT_URL` (your public URL), and a `TRUST_PROXY` that counts the platform's proxies. Keep the browser and the API on **one origin**: putting the API on another domain would need `SameSite=None; Secure` cookies plus CSRF tokens, which this app does not implement.

---

# Known limitations (both options)

- **One API instance.** Rate limiting is kept in memory, so it is per process. Running several instances needs a shared store (for example Redis).
- **No refresh tokens, no password reset, no email verification.** Sessions last one day (`JWT_EXPIRES_IN`) and then the user logs in again.
- **Content-Security-Policy:** in option A Helmet's default policy protects the app pages; in option B nginx sets no CSP header.
- **Logs go to stdout** (Render's Logs tab, or `docker compose logs`). Request logs redact cookies and authorization headers and never contain request bodies.
- **Backups, monitoring and alerts are yours to set up.** Nothing here does it automatically.
- The single-container image is about 520 MB (a slim Debian base with the production dependencies); in option B the API image is about the same and the web image about 75 MB.

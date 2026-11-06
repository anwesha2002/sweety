# Handover

## Status update: readings and reports are now built

The foundation described below was handed over with readings as a 501 skeleton. Since then the readings and reports features have been built (the sections below still describe the foundation; where they say "skeleton" or "501" for readings, this section is the current state).

**Server** (`server/src/modules/readings/`, `server/src/modules/reports/`)

- Readings: create, list (date range + pagination), get, update (partial) and delete, behind `requireAuth`, every query filtered by `req.user.id`. Layers: routes → `validate()` → controller → service → repository (only the repository talks to the database).
- Rules and exact messages: value required ("Please enter a glucose value."), whole number 40–600 ("Value must be between 40 and 600 mg/dl."), no future dates ("Date cannot be in the future.", today UTC + 1 day), at most 4 per day, one per slot per day. Create checks in this order: validation, future date, **daily count**, **duplicate slot**, insert (a unique-violation race, Postgres `23505`, maps to the duplicate message). Update re-runs the rules ignoring the reading being edited.
- A malformed or foreign reading id is a 404 ("Reading not found."), never a 500.
- Reports: `GET /reports/daily`, `/month-to-date`, `/monthly` (previous calendar month), all with `{ highest, lowest, average (1 decimal), count }` and `null`s for an empty period. One `buildSummary` does the rounding; date helpers `addDays`, `maxAllowedDate`, `startOfMonth`, `previousMonthRange` live in `utils/date.ts`.
- Docs: [api.md](api.md) has the real contract and examples.

**Client** (`client/src/`)

- Plumbing: types, `services/readings.service.ts`, `services/reports.service.ts`, plain-React data hooks (`hooks/useAsyncData.ts` with `hooks/useReadings.ts` and `hooks/useReports.ts` on top: they load on mount, reload when their inputs change and on `refetch()`, ignore late responses and keep the previous page while paging). There is no data-fetching library and no client-side cache: each page reloads its own data after a save through `refetch()`. Local-date helpers in `utils/date.ts` (never `toISOString()`), form schema with the same messages as the server.
- UI: add/edit reading dialog (native `<dialog>`), My Readings (From/To filter, pagination, edit, delete with confirmation, table on wide screens and cards on narrow ones), Reports (date picker, daily / month-to-date / previous month with friendly empty states), dashboard with this month's summary and today's four slots.

**Tests**

- Server (Vitest + Supertest, against the test database): auth, readings (create rules, list, get, update, delete, ownership, check order), reports (calculations, rounding, month boundaries, January rollover, empty periods, isolation between users), date helpers.
- Client (Vitest + React Testing Library): login form, reading form (exact messages, server 409 and field errors), dashboard (empty, with data, error), reports page (empty, with data, cleared date), the `useAsyncData` hook (loading, errors, refetch, changing inputs, disabled, late responses), `AuthProvider` (session check, login, logout, expired session), `ProtectedRoute`, date and schema utilities.

**Not done / ideas:** charts, CSV export, refresh tokens, password reset. Not covered by automated tests: the My Readings page and the confirm dialog (checked by hand in the browser), and the narrow-screen layout of the reports.

---

This is the foundation of Sweety. Authentication, project setup, the database schema and the frontend shell are done. The readings module was handed over as a deliberate 501 skeleton (now implemented, see above).

## A. What was built, by module

| Module        | What it does                                                                                                                                                                                                                                                                                                                                     |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Monorepo      | npm workspaces (`client`, `server`), root scripts, `.nvmrc` (22), `.editorconfig`, Prettier, `docker-compose.yml` (development database), deployment files: root `Dockerfile` + `render.yaml` (Render, one container) and `docker-compose.prod.yml` + `server/Dockerfile` + `client/Dockerfile` (own server), see [deployment.md](deployment.md) |
| Server config | `config/env.ts` validates env with Zod and exits with a readable message; one shared Drizzle client; Pino logger with redaction                                                                                                                                                                                                                  |
| Express app   | `app.ts` (no port) and `server.ts` (listens, graceful shutdown); Helmet, CORS limited to `CLIENT_URL`, 100kb JSON, cookie-parser, pino-http, `trust proxy` from config                                                                                                                                                                           |
| Errors        | `ApiError`, one success/error format, central handler for Zod, unique violations (Postgres `23505`), JWT, bad JSON; no internals leaked                                                                                                                                                                                                          |
| Database      | Drizzle schema (`users`, `glucose_readings`, `reading_slot`) with the CHECK constraint declared in the schema itself, generated SQL migration, seed (one demo user)                                                                                                                                                                              |
| Auth          | register (auto-login), login, logout, me; bcrypt; JWT `{ sub }` in an HttpOnly cookie; `requireAuth`; rate limit on register/login                                                                                                                                                                                                               |
| Readings      | Implemented after the handover: create, list, get, update, delete with the business rules, plus reports (see the status update at the top)                                                                                                                                                                                                       |
| Date utils    | `utils/date.ts` (`isValidDateString`, `parseUtcDate`, `formatUtcDate`, `todayString`, `addDays`, `maxAllowedDate`, `startOfMonth`, `previousMonthRange`) with unit tests                                                                                                                                                                         |
| Constants     | `SLOT_LABELS`, `GLUCOSE_MIN` (40), `GLUCOSE_MAX` (600), `MAX_READINGS_PER_DAY` (4) on the server; `SLOT_LABELS` mirror on the client                                                                                                                                                                                                             |
| Client        | Login/register (React Hook Form + Zod, server errors mapped onto fields), axios instance and error helper, `AuthProvider`/`useAuth`, `ProtectedRoute`/`GuestRoute`, layout (sidebar drawer, navbar), dashboard with empty-state cards, "Coming soon" pages                                                                                       |
| Tests         | Server: auth, readings, reports, date helpers. Client: login, reading form, dashboard, reports page, utilities                                                                                                                                                                                                                                   |

## B. Key folders and files

```
server/src/db/schema.ts                        data model: Drizzle tables, enum, constraints; seed.ts creates the demo user
server/drizzle/                                generated SQL migrations (0000_init.sql ...)
server/drizzle.config.ts                       drizzle-kit settings (DB URL, schema path, output folder)
server/src/config/                             env.ts, db.ts, logger.ts
server/src/app.ts, server.ts, routes.ts         app, startup, route mounting
server/src/middleware/                          validate, requireAuth, errorHandler, rateLimiter
server/src/modules/auth/                        routes, controller, service, schemas, token, cookie
server/src/modules/users/                       repository + safe DTO
server/src/modules/readings/                    schemas, routes, controller, service, repository, dto
server/src/utils/                               ApiError, response, date, zod
server/src/constants/readings.ts                SLOT_LABELS, GLUCOSE_MIN/MAX, MAX_READINGS_PER_DAY
server/tests/                                   setup, helpers, auth/readings/date tests
client/src/services/                            api.ts (axios), auth.service.ts, readings.service.ts, reports.service.ts
client/src/context/, hooks/                     AuthProvider, useAuth
client/src/routes/                              router.tsx, ProtectedRoute, GuestRoute
client/src/components/{common,layout}/          StatCard, SlotCard, EmptyState, Button, TextField, Sidebar, Navbar...
client/src/pages/                               auth, dashboard, readings (placeholder), reports (placeholder)
docs/                                           architecture.md, api.md (incl. proposed readings/reports contract)
```

## C. Exact commands

```bash
# Setup
npm install                                  # installs both workspaces
cp server/.env.example server/.env           # then set JWT_SECRET and DATABASE_URL
cp server/.env.test.example server/.env.test # separate test DB: name ends in _test, or a different server than dev (e.g. a Neon branch)

# Database (pick one)
docker compose up -d                         # local Postgres on :5434 with sweety + sweety_test
#   or use a local/hosted Postgres and put its two connection strings in the env files
npm run db:migrate                           # drizzle-kit migrate (applies the SQL migrations)
npm run db:seed                              # demo@example.com / demo-password-123, no readings

# Develop
npm run dev                                  # API :4000 + client :5173 (client proxies /api)
npm run db:studio

# Quality
npm run typecheck
npm run lint
npm run test                                 # server tests (need the test DB) then client tests
npm run build
```

## D. Implemented endpoints

Auth is an HttpOnly cookie named `token`. Full details and error tables: [api.md](api.md).

| Method | Path                                         | Auth              | Success                                                              |
| ------ | -------------------------------------------- | ----------------- | -------------------------------------------------------------------- |
| GET    | `/api/v1/health`                             | no                | `200 { status: "ok", database: "up" }`, `503` if the DB is down      |
| POST   | `/api/v1/auth/register`                      | no (rate-limited) | `201` + cookie + `{ user }`; `400` validation; `409` duplicate email |
| POST   | `/api/v1/auth/login`                         | no (rate-limited) | `200` + cookie + `{ user }`; `401` "Invalid email or password."      |
| POST   | `/api/v1/auth/logout`                        | no                | `200`, cookie cleared                                                |
| GET    | `/api/v1/auth/me`                            | yes               | `200 { user }`; `401` otherwise                                      |
| any    | `/api/v1/readings...`, `/api/v1/reports/...` | yes               | implemented, see [api.md](api.md)                                    |

Example: register

```http
POST /api/v1/auth/register
{ "name": "Asha Rao", "email": "asha@example.com", "password": "password123" }

201 Created
Set-Cookie: token=<jwt>; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400
{ "success": true, "message": "Registration successful",
  "data": { "user": { "id": "…", "name": "Asha Rao", "email": "asha@example.com", "createdAt": "…" } } }
```

Example: validation failure

```http
400 Bad Request
{ "success": false, "message": "Validation failed",
  "errors": [ { "field": "email", "message": "Enter a valid email." } ] }
```

## E. Schema, constraints and the date convention

- `users`: `id` (uuid PK), `name`, `email` (unique, stored trimmed + lowercase), `password_hash`, `created_at`, `updated_at`.
- `glucose_readings`: `id` (uuid PK), `user_id` (FK → `users`, `ON DELETE CASCADE`), `date` (`DATE`), `slot` (enum `reading_slot`), `value` (`INTEGER`), `created_at`, `updated_at`.
- `UNIQUE (user_id, date, slot)`: one reading per slot per day. Its index starts with `(user_id, date)`, so it already serves date-range queries for a user; there is intentionally no second index.
- **CHECK constraint:** `glucose_readings_value_check CHECK (value BETWEEN 40 AND 600)`, declared in `src/db/schema.ts` with `check()` and created by the generated migration (no hand-edited SQL). It is built from `GLUCOSE_MIN`/`GLUCOSE_MAX`, so the constants and the constraint cannot drift apart.
- **Date convention:** API dates are `YYYY-MM-DD` strings and the Drizzle `date` columns are used in string mode, so the database layer reads and writes the same strings (no conversion). Date arithmetic in `utils/date.ts` goes through a UTC `Date`. "Today" for the future-date rule: the client sends its local date; the server allows up to today (UTC) + 1 day.

## F. Security

- **Passwords:** bcrypt with `BCRYPT_ROUNDS` (12 by default), 8–72 character limit (bcrypt ignores bytes past 72). Login compares against a dummy hash for unknown emails so response time does not reveal which emails exist. `passwordHash` is never returned or logged (users are mapped to a safe DTO).
- **JWT:** HS256, payload `{ sub: userId }` only, secret ≥ 32 chars from env, 1-day expiry. Creation and verification live in one module (`auth.token.ts`).
- **Cookie:** `httpOnly`, `SameSite=Lax`, `secure` in production, `path=/`, `maxAge` = token lifetime. The token is never in a response body or in localStorage.
- **CORS / CSRF:** CORS limited to `CLIENT_URL` with credentials. No CSRF library: same-site deployment + `SameSite=Lax` + JSON-only endpoints. A cross-site deployment would need `SameSite=None; Secure` and CSRF tokens.
- **Rate limiting:** register and login, 10 requests / 15 min / IP; off in tests. Set `TRUST_PROXY` behind a reverse proxy.
- **Protected routes:** `requireAuth` on the server (verifies the JWT and that the user still exists), `ProtectedRoute` on the client. Later queries must use `req.user.id`.
- **Other:** Helmet, 100kb body limit, Zod validation on every input, Pino redacts cookie/authorization/set-cookie and never logs bodies, generic 500 messages, env validated at startup.

## G. Checklist for you (in order) — items 1–6 are now done, see the status update at the top

1. **Reading service and validation** (`server/src/modules/readings/`)
   - Finish the Zod schemas with the exact messages: "Please enter a glucose value.", "Value must be between 40 and 600 mg/dl.", "Date cannot be in the future." (use `GLUCOSE_MIN`/`GLUCOSE_MAX`, `isValidDateString`, `todayString`).
   - Add a readings repository (the only layer that touches the database for readings), always filtered by `userId`.
   - **Order of checks in `createReading`:** (1) the daily count first → "You can add only 4 readings per day.", (2) then the duplicate slot → "You already have an After lunch reading for this date.", (3) then insert. There are only 4 slots and `(userId, date, slot)` is unique, so a 5th reading on a day is _always_ also a duplicate slot. If the duplicate check ran first, the "4 per day" message could never appear. Keep mapping the Postgres unique violation (`23505`) to the duplicate message as the race-condition safety net.
   - Use `SLOT_LABELS` for the slot name inside the duplicate message.
2. **Reading endpoints:** replace the 501 handlers with controllers: create, list (date range + pagination), get by id, update (re-run the rules, ignoring the reading being edited), delete. Return 404 for readings that are missing or belong to another user. Follow the proposed contract in [api.md](api.md).
3. **Reports:** daily, month-to-date, monthly (previous calendar month): highest, lowest, average (1 decimal), count; empty results return `count: 0` and `null`s.
4. **Readings UI:** "Add reading" form (the dashboard button is a disabled placeholder), My Readings table/list with edit and delete, wire real values into `StatCard`/`SlotCard` (they already take props).
5. **Reports UI:** date picker, three reports, friendly empty state.
6. **Tests:** reading rules (including the check order), ownership (user A cannot see/edit user B's readings), report calculations, a few UI tests.
7. **Bonus:** charts, CSV export, refresh tokens (the token module is isolated for this), password reset.

## H. Known limitations and anything not verified

- **Verified against your Neon databases (after the Drizzle switch):** both databases were reset and the Drizzle migration applied; the catalog shows the tables `users` and `glucose_readings`, the `reading_slot` enum, the unique constraint, the cascading foreign key and `glucose_readings_value_check` (a reading with value 39 is rejected by it); `npm run db:seed` creates the demo user; the full server suite (97 tests) passes against the Neon test branch.
- **Also verified:** server and client typecheck, lint, Prettier and build; the client smoke test.
- **Not verified:** a real deployment (Render, or a server with a domain and HTTPS), `render.yaml` against Render's validator, and the My Readings page and confirm dialog in automated tests (checked by hand in the browser). The Docker development database, the production compose stack and the single-container image (as Render runs it) were run locally; see [deployment.md](deployment.md).
- **Neon notes:** both URLs use the pooled host (`-pooler`) and `channel_binding=require`; migrations and tests work with that. `pg` prints a warning that `sslmode=require` is currently treated like `verify-full`; it is harmless, and can be silenced by writing `sslmode=verify-full` in the URLs. If `db:migrate` ever hangs on the pooled connection, use the direct (non-pooler) URL for migrations.
- **Test database guard:** the test setup accepts a database whose name ends in `_test`, or one on a different server than the dev database in `server/.env` (needed for a Neon branch, which keeps the name `neondb`). It refuses anything else.
- The server `dev` script uses `node --watch --import tsx` instead of `tsx watch`: under `concurrently`, `tsx watch` started silently without ever listening, while Node's built-in watch worked.
- `jsdom 30` declares Node `>=22.22.2` / `>=24.15`; the client tests passed on Node 24.11, but use a current Node 22 LTS to match the declared engines.
- No refresh tokens: users must log in again after 1 day.
- Rate limiting is in memory (per process), fine for a single instance.
- Client and server keep separate copies of the auth Zod rules and slot labels (marked with comments).
- `npm audit` reports moderate advisories in transitive dev dependencies; none were force-upgraded.
- The client bundle is about 540 kB (before gzip, about 170 kB); route-level code splitting is a possible later improvement.

## I. Walkthrough

### 1. A login request, browser → database → browser

1. The user fills the login form. React Hook Form validates it with the Zod schema (client rules match the server's). If invalid, errors appear next to the fields and nothing is sent.
2. `AuthProvider.login` calls `auth.service.login`, which does `api.post('/auth/login', { email, password })` on the shared Axios instance (`baseURL /api/v1`, `withCredentials: true`).
3. In development the request goes to the Vite dev server, which proxies `/api` to Express on port 4000 (same origin from the browser's point of view).
4. Express middleware runs: pino-http (logging, headers redacted) → Helmet → CORS → JSON parser (100kb) → cookie-parser.
5. The router matches `POST /api/v1/auth/login`: `authRateLimiter` (10 per 15 min per IP) → `validate({ body: loginSchema })` (trims and lowercases the email; failures become a 400 with `errors[]`).
6. `auth.controller.login` calls `auth.service.loginUser`, which asks `user.repository.findUserByEmail` → Drizzle → PostgreSQL (`SELECT ... FROM users WHERE email = $1`).
7. The service runs `bcrypt.compare` against the stored hash (or a dummy hash when the user is unknown). A mismatch throws `ApiError(401, "Invalid email or password.")`: the same message in both cases.
8. On success the service signs a JWT (`{ sub: userId }`, 1 day). The controller sets it as an HttpOnly, `SameSite=Lax` cookie and responds `200 { success, message, data: { user } }` (no token in the body).
9. The browser stores the cookie. Axios resolves; `AuthProvider` puts the user into its state; `GuestRoute` redirects to `/dashboard`.
10. Errors anywhere are thrown and formatted by the central error handler. The client maps `errors[]` onto form fields or shows the general message.

### 2. An authenticated request (for example `GET /api/v1/auth/me`, or later a readings request)

1. On page load `AuthProvider` runs `GET /auth/me` through Axios; the browser attaches the `token` cookie automatically (`withCredentials`).
2. The Vite proxy forwards it to Express; the same global middleware runs, and cookie-parser exposes `req.cookies.token`.
3. `requireAuth` reads the cookie (no cookie → 401) and verifies the JWT signature and expiry (invalid or expired → 401 through the error handler).
4. It loads the user by `sub` via `user.repository.findUserById` → Drizzle → PostgreSQL. If the user no longer exists → 401.
5. It sets `req.user` (safe DTO, no `passwordHash`) and calls `next()`. Every later query must use `req.user.id`, never an id from the client.
6. The controller returns `200 { success, message, data: { user } }`.
7. The client stores the user; `ProtectedRoute` lets the user into the app. A 401 from `/auth/me` just means "not logged in" (no redirect loop). A 401 from any other non-auth endpoint means the session expired: the client clears the user, sets `sessionExpired`, and `ProtectedRoute` sends the user to `/login` with a message.

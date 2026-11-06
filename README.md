# Sweety

Sweety is a blood glucose tracking app: a diabetes patient records up to 4 readings a day and reviews daily and monthly reports.

## What is implemented

- Monorepo (npm workspaces): `client` (React) and `server` (Express), each with its own dependencies.
- PostgreSQL schema with Drizzle ORM: `users`, `glucose_readings`, the `reading_slot` enum, a one-reading-per-slot-per-day unique constraint and a `CHECK (value BETWEEN 40 AND 600)`, all declared in code (`server/src/db/schema.ts`) and applied through generated SQL migrations.
- Authentication: register (logs the user in), login, logout, current user; bcrypt hashing, JWT in an HttpOnly cookie, rate limiting on register/login.
- Express foundation: central error handler with one response format, Zod validation middleware, env validation, Pino logging with redaction, Helmet, CORS, health check, graceful shutdown.
- **Readings:** create, list (date range and pagination), get, update and delete, with the business rules (value required and 40–600, one reading per slot per day, at most 4 per day, no future dates) and the exact error messages. Users only ever see their own readings.
- **Reports:** daily (with each reading and its slot), month-to-date and previous-month reports, each with highest, lowest, average (1 decimal) and count, and a friendly empty state.
- **Glucose trend chart:** a line chart on the Reports page of the average glucose per day, for a single day (each reading through the day), a month, or any date range of up to a year. It is a small hand-written SVG component, so there is no charting dependency.
- React app: login and register forms (React Hook Form + Zod), protected and guest routes, responsive layout (sidebar, navbar), a dashboard with this month's summary and today's four slots, an add/edit reading dialog, My Readings (filters, pagination, edit, delete with confirmation) and Reports (date picker, three reports).
- Tests: backend (Vitest + Supertest) for auth, readings, reports and the date helpers; frontend (Vitest + React Testing Library) for the login, reading form, dashboard, reports page and date/form utilities.

## What is NOT implemented

- Charts (a simple chart is implemented), CSV export, refresh tokens and password reset (bonus items).
- Doctor/patient roles (out of scope).

Request and response examples for every endpoint: [docs/api.md](docs/api.md).

## Tech stack

| Area    | Technology                                                                                                                                                                                            |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Client  | React 19, TypeScript, Vite, Tailwind CSS 4, React Router 8, Axios, React Hook Form, Zod 4, Lucide React                                                                                               |
| Server  | Node.js, Express 5, TypeScript (ESM, `tsx` for dev, `tsc` for builds), Drizzle ORM + `pg`, PostgreSQL, bcrypt, jsonwebtoken, Zod 4, Helmet, cors, cookie-parser, express-rate-limit, Pino + pino-http |
| Tests   | Vitest, Supertest (server); Vitest, jsdom, React Testing Library (client)                                                                                                                             |
| Tooling | ESLint (flat config), Prettier, concurrently                                                                                                                                                          |

Pinned on purpose: **TypeScript 6.0.x** (not yet supported by `typescript-eslint` on 7), **drizzle-orm 0.45.4** and **drizzle-kit 0.31.11** (Drizzle is still 0.x, so its versions are pinned exactly).

## Folder structure

```
sweety/
├── client/                 React app (components, pages, services, hooks, context, schemas, routes...)
├── server/
│   ├── drizzle/            generated SQL migrations (0000_init.sql ...)
│   ├── src/                config, db (schema, seed), modules (auth, users, readings, reports, health), middleware, utils, constants
│   └── tests/
├── docs/                   architecture.md, api.md, HANDOVER.md
├── docker/                 init script that creates the two development databases
├── docker-compose.yml      development database (PostgreSQL)
├── docker-compose.prod.yml production stack for your own server: web (nginx) + API + PostgreSQL
├── Dockerfile              one-container image (the API also serves the React app), used by Render
├── render.yaml             Render Blueprint (free web service)
└── package.json            workspaces + root scripts
```

## Prerequisites

- Node.js 22 LTS (`nvm use` reads `.nvmrc`); `>= 22.22.0` is required (React Router 8).
- PostgreSQL 14+: either Docker (see below), a local install, or a hosted database (Neon, Supabase, ...). To put the app online (free on Render, or on your own server), see [docs/deployment.md](docs/deployment.md).

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create the env files from the examples. **Never commit them.**

   ```bash
   cp server/.env.example server/.env
   cp server/.env.test.example server/.env.test
   ```

   Set a real `JWT_SECRET` (32+ characters) in `server/.env`. Generate one with
   `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.

3. Start PostgreSQL and point `DATABASE_URL` at it.

   - **Docker (recommended):** `docker compose up -d` starts Postgres on host port **5434** (5433 is often taken by other projects) and creates the `sweety` and `sweety_test` databases. The example env files already use these URLs.
   - **Local or hosted Postgres (for example Neon):** use two separate databases, one for development and one for tests, and put their connection strings in `server/.env` and `server/.env.test` (both gitignored; never put real URLs in the `*.example` files). For hosted providers add `?sslmode=require` if they ask for SSL. The tests **truncate every table**, so never point `server/.env.test` at the development database. The test setup refuses to run unless the test database's name ends in `_test`, or it is on a different server than the development database in `server/.env` (for example a separate Neon branch, whose database keeps its original name).

4. Apply the migrations and (optionally) seed a demo user:

   ```bash
   npm run db:migrate
   npm run db:seed
   ```

   The demo user is `demo@example.com` / `demo-password-123` (no readings). It is for local development only; the seed refuses to run when `NODE_ENV=production`.

## Run, test, build

```bash
npm run dev         # server (http://localhost:4000) and client (http://localhost:5173) together
npm run test        # server tests, then client tests
npm run build       # builds server (dist/) and client (client/dist/)
npm run lint
npm run typecheck
npm run db:studio   # Drizzle Studio (browse the database)
```

Open http://localhost:5173. In development the Vite dev server proxies `/api` to the Express server, so the browser only ever talks to one origin.

Server tests need the test database: before the run they apply the migrations, and before each test they truncate the tables.

## API endpoints

| Method | Path                            | Auth                 | Purpose                                           |
| ------ | ------------------------------- | -------------------- | ------------------------------------------------- |
| GET    | `/api/v1/health`                | public               | Status and database check                         |
| POST   | `/api/v1/auth/register`         | public, rate-limited | Create an account and log in                      |
| POST   | `/api/v1/auth/login`            | public, rate-limited | Log in                                            |
| POST   | `/api/v1/auth/logout`           | public               | Clear the cookie                                  |
| GET    | `/api/v1/auth/me`               | required             | Current user                                      |
| POST   | `/api/v1/readings`              | required             | Add a reading                                     |
| GET    | `/api/v1/readings`              | required             | List readings (`from`, `to`, `page`, `pageSize`)  |
| GET    | `/api/v1/readings/:id`          | required             | Get one reading                                   |
| PUT    | `/api/v1/readings/:id`          | required             | Update a reading (partial)                        |
| DELETE | `/api/v1/readings/:id`          | required             | Delete a reading                                  |
| GET    | `/api/v1/reports/daily`         | required             | Summary and readings for `date`                   |
| GET    | `/api/v1/reports/month-to-date` | required             | 1st of the month up to `date`                     |
| GET    | `/api/v1/reports/monthly`       | required             | The whole month before `date`'s month             |
| GET    | `/api/v1/reports/trend`         | required             | Daily averages from `from` to `to` (max 366 days) |

Request and response examples: [docs/api.md](docs/api.md).

## Assumptions & decisions

- **Auto-login after registration.** `POST /auth/register` creates the user, sets the auth cookie and returns the user, so people do not have to log in right after signing up.
- **Token lifetime.** There are no refresh tokens in this phase, so tokens last `1d` (`JWT_EXPIRES_IN`) and the cookie `maxAge` matches. Token code is isolated in `server/src/modules/auth/auth.token.ts` so refresh tokens can be added later.
- **Dates and time zone.** The API only sends and receives dates as `YYYY-MM-DD` strings. The database `date` columns are used in string mode too, so a date is the same `YYYY-MM-DD` string from the API down to the database, with no time-zone conversion. Date arithmetic in `server/src/utils/date.ts` goes through a UTC `Date`. For the "no future dates" rule, the client sends its local date and the server allows dates up to **today (UTC) plus one day**, which tolerates every time zone. The client builds dates from local date parts (`client/src/utils/date.ts`), never from `toISOString()`. Details: [docs/architecture.md](docs/architecture.md#date-convention).
- **CSRF / SameSite.** No CSRF token library. In development everything is same-origin through the Vite proxy; in production the client and API are expected on the same site (or behind one reverse proxy). With `SameSite=Lax`, JSON-only endpoints and strict CORS (`CLIENT_URL` only) this is sufficient for this app. A cross-site deployment would need `SameSite=None; Secure` **plus** CSRF tokens.
- **CHECK constraint.** `value BETWEEN 40 AND 600` is declared in `server/src/db/schema.ts` (Drizzle supports `check()`), built from `GLUCOSE_MIN` / `GLUCOSE_MAX`, and `npm run db:generate` puts it into the generated migration SQL. No SQL is edited by hand.
- **bcrypt vs bcryptjs.** The native `bcrypt` package installed fine, so it is used. `bcryptjs` is only a fallback if native installation fails on a machine.
- **Order of the reading rules.** When creating a reading the server checks, in this order: validation, future date, the 4-per-day limit, then the duplicate slot. The limit must come before the duplicate check: a 5th reading on a day is always also a duplicate slot (there are only 4), so otherwise "You can add only 4 readings per day." could never appear. The database unique index is the final safety net for concurrent requests.
- **Reports and dates.** Report endpoints accept any valid date (a future date gives an empty report); the UI limits the picker to today. The dashboard reuses the report endpoints (today's daily report for the slot cards, month-to-date for the stat cards).
- **Rate limiting** applies to register and login only (10 requests per 15 minutes per IP) and is off when `NODE_ENV=test`. `TRUST_PROXY` must be set when running behind a reverse proxy so client IPs and secure cookies work.
- **Client/server schema duplication.** The client and server each own a copy of the Zod auth rules (and slot labels) so the apps stay independent; comments mark the pairs that must stay in sync.


## Future scope

- Redis for caching
- Doctor's role admin dashboard

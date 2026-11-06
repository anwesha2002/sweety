# Architecture

## Request flow

```
Browser ──► Vite dev proxy (/api) ──► Express app
                                        │
   pino-http → helmet → cors → json(100kb) → cookie-parser
                                        │
                              /api/v1 router
                                        │
        route ─► [rateLimiter] ─► [validate()] ─► [requireAuth] ─► controller
                                                                      │
                                                                   service
                                                                      │
                                                                 repository ─► Drizzle ─► PostgreSQL
                                        │
                        404 handler ─► central error handler ─► JSON response
```

In production the client and API are expected on one site (or behind one reverse proxy), so the same `/api` paths work without CORS.

## Layers (server)

| Layer        | Folder / file               | Responsibility                                                                    |
| ------------ | --------------------------- | --------------------------------------------------------------------------------- |
| Routes       | `modules/*/*.routes.ts`     | Paths and middleware only                                                         |
| Validation   | `middleware/validate.ts`    | Zod validation of `body`, `query`, `params`; replaces them with the parsed values |
| Controllers  | `modules/*/*.controller.ts` | Read the request, call the service, send the response. Thin                       |
| Services     | `modules/*/*.service.ts`    | Business logic. No `req`/`res`                                                    |
| Repositories | `modules/*/*.repository.ts` | The only layer that talks to the database                                         |
| Config       | `config/`                   | Validated env, the single shared Drizzle client, logger                           |

The shared database client (a `pg` pool wrapped by Drizzle) lives in `config/db.ts`; no other file creates one. Errors are thrown anywhere and formatted in one place. Express 5 forwards rejected promises from async handlers to the error handler, so no `asyncHandler` wrapper exists.

## Authentication flow

1. **Register / login** (`/auth/register`, `/auth/login`): input is validated and normalized (email trimmed and lowercased). The service hashes (`bcrypt`, `BCRYPT_ROUNDS`) or verifies the password, then signs a JWT with payload `{ sub: userId }` (HS256, lifetime `JWT_EXPIRES_IN`, default `1d`). The controller stores it in a cookie: `httpOnly`, `sameSite=lax`, `secure` in production, `path=/`, `maxAge` equal to the token lifetime. The token is never returned in a response body.
2. **Registration logs the user in** automatically (same cookie), which saves a step after sign-up.
3. **Protected requests:** `requireAuth` reads the cookie, verifies the JWT, loads the user from the database (401 if the user no longer exists) and sets `req.user` (typed via `types/express.d.ts`). Queries must use `req.user.id`, never an id sent by the client.
4. **Logout** clears the cookie and works even when nobody is logged in.
5. **Client:** `AuthProvider` keeps the user in plain React state and asks `GET /auth/me` once on load. A 401 from `/auth/me` just means "not logged in". A 401 from any other non-auth endpoint means the session expired: the user is cleared, `sessionExpired` is set, and `ProtectedRoute` sends them to `/login` with a message. Data lives only in the pages that show it (loaded with the small `useAsyncData` hook and loaded again after a save), so logging out leaves nothing behind for the next person on the same browser.

CSRF: no token library. The cookie is `SameSite=Lax`, endpoints accept JSON only, and CORS allows only `CLIENT_URL`. This relies on the client and API sharing a site; a cross-site deployment would need `SameSite=None; Secure` and CSRF tokens.

## Date convention

- The API sends and receives calendar dates **only as `YYYY-MM-DD` strings**.
- A date is a `YYYY-MM-DD` string everywhere: the Drizzle `date` columns are declared in string mode, so the database layer reads and writes the same string the API sends and no time-zone conversion happens. `server/src/utils/date.ts` holds the date helpers: `parseUtcDate("2026-11-04")` → a `Date` at `2026-11-04T00:00:00.000Z` (used only for date arithmetic), `formatUtcDate(date)` → `"2026-11-04"`, `todayString()` → today's date in UTC, `isValidDateString()` rejects impossible dates like `2026-02-30`, plus `addDays`, `maxAllowedDate`, `startOfMonth` and `previousMonthRange`. Always work in UTC to avoid off-by-one-day bugs.
- **Which time zone defines "today"** for the future-date rule (to implement later): the client sends its **local** date, and the server accepts dates up to **today in UTC plus one day**. The extra day covers users ahead of UTC (up to UTC+14) without ever accepting a date that is two days away.

## Database notes

- Tables are snake_case (`users`, `glucose_readings`); `src/db/schema.ts` maps them to camelCase fields in code (for example `password_hash` ↔ `passwordHash`).
- `@@unique([userId, date, slot])` enforces one reading per slot per day. Its index starts with `(user_id, date)`, so it already serves "a user's readings for a date range" queries. A second index on `(user_id, date)` would be redundant, so none exists.
- `CHECK (value BETWEEN 40 AND 600)` is declared in the schema with `check()` (built from `GLUCOSE_MIN` / `GLUCOSE_MAX` in `src/constants/readings.ts`), so the generated migration contains it and the two cannot drift apart.
- Deleting a user cascades to their readings.

## Error format

Every response uses one of two shapes.

```json
{ "success": true, "message": "Login successful", "data": {} }
```

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [{ "field": "email", "message": "Enter a valid email." }]
}
```

`errors` is only present for validation-style problems, so the client can show each message next to its field. The central error handler (`middleware/errorHandler.ts`) turns these into that format:

| Source                                         | Status                                        |
| ---------------------------------------------- | --------------------------------------------- |
| `ApiError` (thrown by our code)                | its own status, message and optional `errors` |
| Zod validation error                           | 400, one `{field, message}` per issue         |
| Unique-constraint violation (Postgres `23505`) | 409                                           |
| JWT invalid / expired                          | 401                                           |
| Malformed JSON / body over 100kb               | 400 / 413                                     |
| Anything else                                  | 500, generic message                          |

Unexpected errors are logged on the server with their details; the client only ever gets a generic message, never a stack trace or internal detail (in any environment).

## Logging

Pino with `pino-http`. The `cookie`, `authorization` and `set-cookie` headers are redacted and request bodies are never logged, so passwords, tokens and (later) glucose values stay out of the logs.

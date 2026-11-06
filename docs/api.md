# API reference

Base path: `/api/v1`. All bodies are JSON. Dates are always `YYYY-MM-DD` strings (see [architecture.md](architecture.md#date-convention)).

Response formats:

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

Authentication uses an HttpOnly cookie named `token` set by register/login. Browsers send it automatically (`withCredentials: true` with Axios); with curl use `-c`/`-b`.

All `/readings` and `/reports` endpoints require the cookie (`401` otherwise) and only ever see the logged-in user's data.

---

# Health and auth

## GET /health

Public. Checks that the API is running and the database answers.

`200`

```json
{ "success": true, "message": "OK", "data": { "status": "ok", "database": "up" } }
```

`503` `{ "success": false, "message": "Database is not reachable." }`

## POST /auth/register

Public, rate-limited (10 requests / 15 min / IP). Creates the account **and logs the user in** (sets the cookie).

Request

```json
{ "name": "Asha Rao", "email": "Asha@Example.com", "password": "password123" }
```

Rules: `name` trimmed, 1–100 characters; `email` valid, trimmed and lowercased; `password` 8–72 characters.

`201` (cookie set; the token is not in the body)

```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": {
      "id": "0b6c...",
      "name": "Asha Rao",
      "email": "asha@example.com",
      "createdAt": "2026-11-04T09:00:00.000Z"
    }
  }
}
```

| Status | When                                                  |
| ------ | ----------------------------------------------------- |
| 400    | Validation failed (`errors` lists `{field, message}`) |
| 409    | Email already registered (letter case ignored)        |
| 429    | Too many attempts                                     |

## POST /auth/login

Public, rate-limited.

Request `{ "email": "asha@example.com", "password": "password123" }`

`200` (cookie set) `{ "success": true, "message": "Login successful", "data": { "user": { ... } } }`

| Status | When                                                                                       |
| ------ | ------------------------------------------------------------------------------------------ |
| 400    | Missing or malformed fields                                                                |
| 401    | `"Invalid email or password."`, the same message for a wrong password and an unknown email |
| 429    | Too many attempts                                                                          |

## POST /auth/logout

Public. Clears the cookie; works even if nobody is logged in.

`200` `{ "success": true, "message": "Logout successful", "data": null }`

## GET /auth/me

Requires the cookie.

`200` `{ "success": true, "message": "Current user", "data": { "user": { "id": "...", "name": "...", "email": "...", "createdAt": "..." } } }`

`401` `{ "success": false, "message": "Please log in to continue." }` (no cookie, invalid or expired token, or the user was deleted)

The user object never contains `passwordHash`.

---

# Readings

Shared types

```ts
type ReadingSlot = 'MORNING' | 'AFTER_BREAKFAST' | 'AFTER_LUNCH' | 'AFTER_DINNER';

interface Reading {
  id: string;
  date: string; // YYYY-MM-DD
  slot: ReadingSlot;
  value: number; // mg/dl, whole number 40-600
  createdAt: string; // ISO timestamp
}
```

Slot labels: `MORNING` = "Morning (fasting)", `AFTER_BREAKFAST` = "After breakfast", `AFTER_LUNCH` = "After lunch", `AFTER_DINNER` = "After dinner".

## POST /readings

Request

```json
{ "date": "2026-11-04", "slot": "AFTER_LUNCH", "value": 142 }
```

`201`

```json
{
  "success": true,
  "message": "Reading added",
  "data": {
    "reading": {
      "id": "1ca581a6-ed17-4b77-9830-0514d7acbbd2",
      "date": "2026-11-04",
      "slot": "AFTER_LUNCH",
      "value": 142,
      "createdAt": "2026-11-04T09:42:13.019Z"
    }
  }
}
```

Any `userId` in the body is ignored; the reading always belongs to the logged-in user.

| Status | Message                                                  | Rule                                                                       |
| ------ | -------------------------------------------------------- | -------------------------------------------------------------------------- |
| 400    | `value`: "Please enter a glucose value."                 | Value is required (missing or `null`)                                      |
| 400    | `value`: "Value must be between 40 and 600 mg/dl."       | Whole number 40–600 (also for decimals and non-numbers)                    |
| 400    | `slot`: "Choose a reading time."                         | Slot must be one of the four                                               |
| 400    | `date`: "Enter a valid date."                            | Real `YYYY-MM-DD` date                                                     |
| 400    | `date`: "Date cannot be in the future."                  | Later than today (UTC) + 1 day, see the [date convention](architecture.md) |
| 409    | "You can add only 4 readings per day."                   | Daily limit                                                                |
| 409    | "You already have an After lunch reading for this date." | One reading per slot per day ("a" before Morning, "an" otherwise)          |

Validation errors (400) look like `{ "success": false, "message": "Validation failed", "errors": [{ "field": "value", "message": "..." }] }`. The future-date error uses the same shape with its own text as `message`. The 409 errors have a plain `{ "success": false, "message": "..." }` body.

**Order of the checks:** validation, then the future-date rule, then the daily count (409), then the duplicate slot (409). The daily count must come before the duplicate check: a 5th reading on a day is always also a duplicate slot (there are only 4), so otherwise "You can add only 4 readings per day." could never appear. The unique index `(userId, date, slot)` remains the final safety net: if two identical requests race, the loser also gets the duplicate-slot message.

## GET /readings

Query (all optional): `from` and `to` (`YYYY-MM-DD`, both inclusive), `page` (default 1), `pageSize` (default 20, max 100). Sorted by `date` descending, then by slot order (Morning first).

`200`

```json
{
  "success": true,
  "message": "Readings",
  "data": {
    "items": [
      {
        "id": "…",
        "date": "2026-11-04",
        "slot": "MORNING",
        "value": 96,
        "createdAt": "2026-11-04T07:30:00.000Z"
      }
    ],
    "pagination": { "page": 1, "pageSize": 20, "total": 37, "totalPages": 2 }
  }
}
```

With no readings: `items: []` and `totalPages: 0`. A page past the end returns an empty `items` with the real `total`.

`400` with field errors for an invalid date, `from` after `to` (`to`: "End date must be on or after the start date."), `page` below 1, or `pageSize` outside 1–100.

## GET /readings/:id

`200` `{ "success": true, "message": "Reading", "data": { "reading": Reading } }`

`404` `{ "success": false, "message": "Reading not found." }` when the id does not exist, belongs to someone else (so ids cannot be probed), or is not a valid UUID.

## PUT /readings/:id

Partial update: send any of `date`, `slot`, `value` (at least one, otherwise `400` "At least one field must be provided for update."). The same rules apply to the resulting reading, with the reading being edited ignored when counting and when looking for a duplicate. So:

- updating a reading to its own current slot works;
- moving it to a day that already has 4 readings gives the daily-limit `409`;
- moving it to a slot already taken on that day gives the duplicate-slot `409`;
- changing only the value never triggers the count or duplicate checks.

`200` `{ "success": true, "message": "Reading updated", "data": { "reading": Reading } }` · `400`, `404` and `409` as for create and get.

## DELETE /readings/:id

`200` `{ "success": true, "message": "Reading deleted", "data": null }` · `404` "Reading not found." (missing, someone else's, already deleted, or malformed id). Deleting frees the slot and the day's count.

---

# Reports

The daily, month-to-date and monthly reports take the selected date as `date=YYYY-MM-DD` (required); the trend report takes `from` and `to` instead. The client sends its local date. There is no future-date restriction (a future date just gives an empty report).

```ts
interface ReportSummary {
  highest: number | null;
  lowest: number | null;
  average: number | null; // rounded to 1 decimal
  count: number; // 0 => highest, lowest and average are null
}
```

Common errors: `400` with `{ "field": "date", "message": "Enter a valid date." }` for a missing or invalid date, `401` when not logged in.

## GET /reports/daily?date=2026-11-04

`200`

```json
{
  "success": true,
  "message": "Daily report",
  "data": {
    "date": "2026-11-04",
    "summary": { "highest": 142, "lowest": 96, "average": 118.7, "count": 3 },
    "readings": [
      { "slot": "MORNING", "label": "Morning (fasting)", "value": 96 },
      { "slot": "AFTER_BREAKFAST", "label": "After breakfast", "value": 118 },
      { "slot": "AFTER_LUNCH", "label": "After lunch", "value": 142 }
    ]
  }
}
```

`readings` are in slot order. With no readings: `summary` is `{ "highest": null, "lowest": null, "average": null, "count": 0 }` and `readings` is `[]`.

## GET /reports/month-to-date?date=2026-11-04

From the 1st of the month to `date`, both inclusive.

`200`

```json
{
  "success": true,
  "message": "Month-to-date report",
  "data": {
    "from": "2026-11-01",
    "to": "2026-11-04",
    "summary": { "highest": 142, "lowest": 96, "average": 115.6, "count": 5 }
  }
}
```

On the 1st of a month the range is that single day.

## GET /reports/trend?from=2026-11-01&to=2026-11-30

The average of each day's readings between `from` and `to` (both required, both inclusive), for the line chart. One request serves any span: the client sends a single day, a month or a free range as `from`/`to`.

`200`

```json
{
  "success": true,
  "message": "Trend report",
  "data": {
    "from": "2026-11-01",
    "to": "2026-11-30",
    "points": [
      { "date": "2026-11-01", "average": 130, "count": 1 },
      { "date": "2026-11-02", "average": 95, "count": 1 },
      { "date": "2026-11-06", "average": 127.7, "count": 3 }
    ]
  }
}
```

- `points` are oldest first. A day without readings has **no** point (the chart leaves a gap rather than inventing a zero), so an empty range gives `"points": []`.
- `average` is rounded to 1 decimal, `count` is the number of readings that day.
- The range may span at most **366 days** (counting both end dates).

Errors, all `400`:

| Field  | Message                                        | When                        |
| ------ | ---------------------------------------------- | --------------------------- |
| `from` | `Enter a valid date.`                          | missing or not a real date  |
| `to`   | `Enter a valid date.`                          | missing or not a real date  |
| `to`   | `End date must be on or after the start date.` | `to` is before `from`       |
| `to`   | `Choose a range of one year or less.`          | more than 366 days from..to |

## GET /reports/monthly?date=2026-11-04

The whole **previous** calendar month relative to `date`, however far into the current month the date is. For a January date it is the previous December.

`200`

```json
{
  "success": true,
  "message": "Monthly report",
  "data": {
    "month": "2026-10",
    "from": "2026-10-01",
    "to": "2026-10-31",
    "summary": { "highest": 150, "lowest": 90, "average": 120, "count": 2 }
  }
}
```

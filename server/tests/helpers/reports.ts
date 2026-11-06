import request from 'supertest';
import { app } from '../../src/app.js';

export type ReportKind = 'daily' | 'month-to-date' | 'monthly';

/** GET /reports/:kind?date=... as the user who owns `cookie` (omit `date` to test validation). */
export function getReport(cookie: string[], kind: ReportKind, date?: string): request.Test {
  const query = date === undefined ? '' : `?date=${date}`;
  return request(app).get(`/api/v1/reports/${kind}${query}`).set('Cookie', cookie);
}

/** GET /reports/trend?from=...&to=... (leave a date out to test validation). */
export function getTrend(cookie: string[], from?: string, to?: string): request.Test {
  const params = new URLSearchParams();
  if (from !== undefined) params.set('from', from);
  if (to !== undefined) params.set('to', to);
  return request(app).get(`/api/v1/reports/trend?${params.toString()}`).set('Cookie', cookie);
}

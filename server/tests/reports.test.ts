import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../src/app.js';
import { registerAndGetCookie } from './helpers/auth.js';
import { postReading } from './helpers/readings.js';
import { getReport, getTrend, type ReportKind } from './helpers/reports.js';

type Slot = 'MORNING' | 'AFTER_BREAKFAST' | 'AFTER_LUNCH' | 'AFTER_DINNER';

const EMPTY_SUMMARY = { highest: null, lowest: null, average: null, count: 0 };
const KINDS: ReportKind[] = ['daily', 'month-to-date', 'monthly'];

// All dates are in the past so the "no future dates" rule never gets in the way.

/** Saves readings through the API: [date, slot, value] triples. */
async function seed(cookie: string[], readings: [string, Slot, number][]): Promise<void> {
  for (const [date, slot, value] of readings) {
    const response = await postReading(cookie, { date, slot, value });
    expect(response.status).toBe(201);
  }
}

describe('reports authentication and validation', () => {
  it.each(KINDS)('GET /reports/%s returns 401 without authentication', async (kind) => {
    const response = await request(app).get(`/api/v1/reports/${kind}?date=2025-11-04`);

    expect(response.status).toBe(401);
  });

  it.each(KINDS)('GET /reports/%s rejects a missing or invalid date', async (kind) => {
    const cookie = await registerAndGetCookie();

    const missing = await getReport(cookie, kind);
    const impossible = await getReport(cookie, kind, '2025-02-30');
    const wrongFormat = await getReport(cookie, kind, '04-11-2025');

    for (const response of [missing, impossible, wrongFormat]) {
      expect(response.status).toBe(400);
      expect(response.body.errors).toEqual([{ field: 'date', message: 'Enter a valid date.' }]);
    }
  });
});

describe('GET /api/v1/reports/daily', () => {
  it('summarizes the day and lists the readings in slot order with labels', async () => {
    const cookie = await registerAndGetCookie();
    // Saved out of order on purpose.
    await seed(cookie, [
      ['2025-11-04', 'AFTER_LUNCH', 142],
      ['2025-11-04', 'MORNING', 96],
      ['2025-11-04', 'AFTER_BREAKFAST', 118],
    ]);

    const response = await getReport(cookie, 'daily', '2025-11-04');

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({
      date: '2025-11-04',
      summary: { highest: 142, lowest: 96, average: 118.7, count: 3 },
      readings: [
        { slot: 'MORNING', label: 'Morning (fasting)', value: 96 },
        { slot: 'AFTER_BREAKFAST', label: 'After breakfast', value: 118 },
        { slot: 'AFTER_LUNCH', label: 'After lunch', value: 142 },
      ],
    });
  });

  it.each([
    [[100, 101], 100.5],
    [[100, 101, 102], 101],
    [[100, 100, 101], 100.3],
    [[150], 150],
  ])('rounds the average of %j to 1 decimal (%d)', async (values, average) => {
    const cookie = await registerAndGetCookie();
    const slots: Slot[] = ['MORNING', 'AFTER_BREAKFAST', 'AFTER_LUNCH', 'AFTER_DINNER'];
    await seed(
      cookie,
      values.map((value, index) => ['2025-11-04', slots[index] as Slot, value]),
    );

    const response = await getReport(cookie, 'daily', '2025-11-04');

    expect(response.body.data.summary.average).toBe(average);
  });

  it('returns an empty summary when the day has no readings', async () => {
    const cookie = await registerAndGetCookie();
    await seed(cookie, [['2025-11-03', 'MORNING', 100]]);

    const response = await getReport(cookie, 'daily', '2025-11-04');

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({
      date: '2025-11-04',
      summary: EMPTY_SUMMARY,
      readings: [],
    });
  });

  it('never includes another user’s readings', async () => {
    const first = await registerAndGetCookie();
    const second = await registerAndGetCookie({ email: 'other@example.com' });
    await seed(first, [['2025-11-04', 'MORNING', 100]]);
    await seed(second, [['2025-11-04', 'AFTER_LUNCH', 500]]);

    const response = await getReport(first, 'daily', '2025-11-04');

    expect(response.body.data.summary).toEqual({
      highest: 100,
      lowest: 100,
      average: 100,
      count: 1,
    });
    expect(response.body.data.readings).toHaveLength(1);
  });
});

describe('GET /api/v1/reports/month-to-date', () => {
  it('covers the 1st of the month up to the selected date, inclusive', async () => {
    const cookie = await registerAndGetCookie();
    await seed(cookie, [
      ['2025-10-31', 'MORNING', 300], // previous month: excluded
      ['2025-11-01', 'MORNING', 100], // first day: included
      ['2025-11-03', 'MORNING', 110],
      ['2025-11-04', 'MORNING', 120], // selected date: included
      ['2025-11-05', 'MORNING', 400], // after the selected date: excluded
    ]);

    const response = await getReport(cookie, 'month-to-date', '2025-11-04');

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({
      from: '2025-11-01',
      to: '2025-11-04',
      summary: { highest: 120, lowest: 100, average: 110, count: 3 },
    });
  });

  it('works on the 1st of the month (a one-day range)', async () => {
    const cookie = await registerAndGetCookie();
    await seed(cookie, [
      ['2025-10-31', 'MORNING', 300],
      ['2025-11-01', 'MORNING', 100],
      ['2025-11-02', 'MORNING', 400],
    ]);

    const response = await getReport(cookie, 'month-to-date', '2025-11-01');

    expect(response.body.data.from).toBe('2025-11-01');
    expect(response.body.data.to).toBe('2025-11-01');
    expect(response.body.data.summary).toEqual({
      highest: 100,
      lowest: 100,
      average: 100,
      count: 1,
    });
  });

  it('returns an empty summary and ignores other users', async () => {
    const first = await registerAndGetCookie();
    const second = await registerAndGetCookie({ email: 'other@example.com' });
    await seed(second, [['2025-11-02', 'MORNING', 100]]);

    const response = await getReport(first, 'month-to-date', '2025-11-04');

    expect(response.body.data.summary).toEqual(EMPTY_SUMMARY);
  });
});

describe('GET /api/v1/reports/monthly', () => {
  it('covers the whole previous calendar month', async () => {
    const cookie = await registerAndGetCookie();
    await seed(cookie, [
      ['2025-09-30', 'MORNING', 300], // two months back: excluded
      ['2025-10-01', 'MORNING', 90], // first day of October: included
      ['2025-10-15', 'MORNING', 110],
      ['2025-10-31', 'MORNING', 130], // last day of October: included
      ['2025-11-01', 'MORNING', 400], // current month: excluded
    ]);

    const response = await getReport(cookie, 'monthly', '2025-11-04');

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({
      month: '2025-10',
      from: '2025-10-01',
      to: '2025-10-31',
      summary: { highest: 130, lowest: 90, average: 110, count: 3 },
    });
  });

  it('uses the previous December for a January date', async () => {
    const cookie = await registerAndGetCookie();
    await seed(cookie, [
      ['2025-11-30', 'MORNING', 300],
      ['2025-12-01', 'MORNING', 100],
      ['2025-12-31', 'MORNING', 120],
      ['2026-01-02', 'MORNING', 400],
    ]);

    const response = await getReport(cookie, 'monthly', '2026-01-15');

    expect(response.body.data).toMatchObject({
      month: '2025-12',
      from: '2025-12-01',
      to: '2025-12-31',
      summary: { highest: 120, lowest: 100, average: 110, count: 2 },
    });
  });

  it('returns an empty summary for a month without readings', async () => {
    const cookie = await registerAndGetCookie();
    await seed(cookie, [['2025-11-02', 'MORNING', 100]]);

    const response = await getReport(cookie, 'monthly', '2025-11-04');

    expect(response.body.data.summary).toEqual(EMPTY_SUMMARY);
  });

  it('never includes another user’s readings', async () => {
    const first = await registerAndGetCookie();
    const second = await registerAndGetCookie({ email: 'other@example.com' });
    await seed(first, [['2025-10-10', 'MORNING', 100]]);
    await seed(second, [['2025-10-10', 'AFTER_LUNCH', 500]]);

    const response = await getReport(first, 'monthly', '2025-11-04');

    expect(response.body.data.summary).toEqual({
      highest: 100,
      lowest: 100,
      average: 100,
      count: 1,
    });
  });
});

describe('GET /api/v1/reports/trend', () => {
  it('returns 401 without authentication', async () => {
    const response = await request(app).get('/api/v1/reports/trend?from=2025-11-01&to=2025-11-30');

    expect(response.status).toBe(401);
  });

  it('rejects missing and invalid dates', async () => {
    const cookie = await registerAndGetCookie();

    const missing = await getTrend(cookie);
    const impossible = await getTrend(cookie, '2025-02-30', '2025-03-05');

    expect(missing.status).toBe(400);
    expect(missing.body.errors).toEqual([
      { field: 'from', message: 'Enter a valid date.' },
      { field: 'to', message: 'Enter a valid date.' },
    ]);
    expect(impossible.status).toBe(400);
    expect(impossible.body.errors).toEqual([{ field: 'from', message: 'Enter a valid date.' }]);
  });

  it('rejects an end date before the start date', async () => {
    const cookie = await registerAndGetCookie();

    const response = await getTrend(cookie, '2025-11-10', '2025-11-01');

    expect(response.status).toBe(400);
    expect(response.body.errors).toEqual([
      { field: 'to', message: 'End date must be on or after the start date.' },
    ]);
  });

  it('allows a range of 366 days but not more', async () => {
    const cookie = await registerAndGetCookie();

    const allowed = await getTrend(cookie, '2024-01-01', '2024-12-31'); // 366 days (leap year)
    const tooLong = await getTrend(cookie, '2024-01-01', '2025-01-01'); // 367 days

    expect(allowed.status).toBe(200);
    expect(tooLong.status).toBe(400);
    expect(tooLong.body.errors).toEqual([
      { field: 'to', message: 'Choose a range of one year or less.' },
    ]);
  });

  it('returns the average of each day, oldest first, leaving out days without readings', async () => {
    const cookie = await registerAndGetCookie();
    await seed(cookie, [
      ['2025-11-04', 'MORNING', 100],
      ['2025-11-04', 'AFTER_LUNCH', 100],
      ['2025-11-04', 'AFTER_DINNER', 101], // 100.33.. -> 100.3
      ['2025-11-01', 'AFTER_LUNCH', 101],
      ['2025-11-01', 'MORNING', 100], // 100.5
      ['2025-11-03', 'MORNING', 120],
    ]);

    const response = await getTrend(cookie, '2025-11-01', '2025-11-05');

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({
      from: '2025-11-01',
      to: '2025-11-05',
      points: [
        { date: '2025-11-01', average: 100.5, count: 2 },
        { date: '2025-11-03', average: 120, count: 1 },
        { date: '2025-11-04', average: 100.3, count: 3 },
      ],
    });
  });

  it('includes both end dates and nothing outside the range', async () => {
    const cookie = await registerAndGetCookie();
    await seed(cookie, [
      ['2025-10-31', 'MORNING', 300], // before
      ['2025-11-01', 'MORNING', 110], // first day
      ['2025-11-30', 'MORNING', 130], // last day
      ['2025-12-01', 'MORNING', 400], // after
    ]);

    const response = await getTrend(cookie, '2025-11-01', '2025-11-30');

    expect(response.body.data.points).toEqual([
      { date: '2025-11-01', average: 110, count: 1 },
      { date: '2025-11-30', average: 130, count: 1 },
    ]);
  });

  it('works for a single day', async () => {
    const cookie = await registerAndGetCookie();
    await seed(cookie, [
      ['2025-11-04', 'MORNING', 90],
      ['2025-11-04', 'AFTER_LUNCH', 110],
    ]);

    const response = await getTrend(cookie, '2025-11-04', '2025-11-04');

    expect(response.body.data.points).toEqual([{ date: '2025-11-04', average: 100, count: 2 }]);
  });

  it('returns no points when the range has no readings, and ignores other users', async () => {
    const first = await registerAndGetCookie();
    const second = await registerAndGetCookie({ email: 'other@example.com' });
    await seed(second, [['2025-11-04', 'MORNING', 500]]);

    const response = await getTrend(first, '2025-11-01', '2025-11-30');

    expect(response.status).toBe(200);
    expect(response.body.data.points).toEqual([]);
  });
});

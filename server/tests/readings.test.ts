import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../src/app.js';
import { addDays, todayString } from '../src/utils/date.js';
import { registerAndGetCookie } from './helpers/auth.js';
import {
  getReadingById,
  getReadings,
  postReading,
  putReading,
  removeReading,
} from './helpers/readings.js';

const VALUE_REQUIRED = 'Please enter a glucose value.';
const VALUE_RANGE = 'Value must be between 40 and 600 mg/dl.';
const SLOTS = ['MORNING', 'AFTER_BREAKFAST', 'AFTER_LUNCH', 'AFTER_DINNER'] as const;

const validReading = { date: '2026-11-04', slot: 'AFTER_LUNCH', value: 120 };

interface FieldError {
  field: string;
  message: string;
}

function errorFields(body: { errors?: FieldError[] }): string[] {
  return (body.errors ?? []).map((error) => `${error.field}: ${error.message}`);
}

describe('/api/v1/readings authentication', () => {
  it('returns 401 without authentication', async () => {
    const response = await request(app).get('/api/v1/readings');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('returns 401 when creating without authentication', async () => {
    const response = await request(app).post('/api/v1/readings').send(validReading);

    expect(response.status).toBe(401);
  });
});

describe('/api/v1/readings/:id authentication', () => {
  it.each(['get', 'put', 'delete'] as const)(
    'returns 401 for %s without authentication',
    async (method) => {
      const id = '00000000-0000-4000-8000-000000000000';

      const response = await request(app)[method](`/api/v1/readings/${id}`);

      expect(response.status).toBe(401);
    },
  );
});

describe('POST /api/v1/readings', () => {
  it('creates a reading and returns it with a YYYY-MM-DD date', async () => {
    const cookie = await registerAndGetCookie();

    const response = await postReading(cookie, validReading);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.reading).toMatchObject(validReading);
    expect(response.body.data.reading.id).toEqual(expect.any(String));
    expect(response.body.data.reading.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('ignores a userId sent by the client and uses the logged-in user', async () => {
    const cookie = await registerAndGetCookie();

    const response = await postReading(cookie, {
      ...validReading,
      userId: '00000000-0000-0000-0000-000000000000',
    });

    expect(response.status).toBe(201);
    expect(response.body.data.reading.userId).toBeUndefined();
  });

  describe('validation', () => {
    it('asks for a value when it is missing', async () => {
      const cookie = await registerAndGetCookie();

      const response = await postReading(cookie, { date: '2026-11-04', slot: 'MORNING' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Validation failed');
      expect(errorFields(response.body)).toEqual([`value: ${VALUE_REQUIRED}`]);
    });

    it.each([39, 601, 120.5, '120', 'abc'])(
      'rejects the value %j with the range message',
      async (value) => {
        const cookie = await registerAndGetCookie();

        const response = await postReading(cookie, { ...validReading, value });

        expect(response.status).toBe(400);
        expect(errorFields(response.body)).toEqual([`value: ${VALUE_RANGE}`]);
      },
    );

    it.each([40, 600])('accepts the boundary value %i', async (value) => {
      const cookie = await registerAndGetCookie();

      const response = await postReading(cookie, { ...validReading, value });

      expect(response.status).toBe(201);
    });

    it('rejects an unknown slot and an invalid date', async () => {
      const cookie = await registerAndGetCookie();

      const badSlot = await postReading(cookie, { ...validReading, slot: 'LUNCH' });
      const badDate = await postReading(cookie, { ...validReading, date: '2026-02-30' });

      expect(errorFields(badSlot.body)).toEqual(['slot: Choose a reading time.']);
      expect(errorFields(badDate.body)).toEqual(['date: Enter a valid date.']);
    });
  });

  describe('future date rule', () => {
    it('accepts today and tomorrow (UTC) but rejects two days ahead', async () => {
      const cookie = await registerAndGetCookie();
      const today = todayString();

      const todayResponse = await postReading(cookie, { ...validReading, date: today });
      const tomorrowResponse = await postReading(cookie, {
        ...validReading,
        slot: 'MORNING',
        date: addDays(today, 1),
      });
      const tooFar = await postReading(cookie, { ...validReading, date: addDays(today, 2) });

      expect(todayResponse.status).toBe(201);
      expect(tomorrowResponse.status).toBe(201);
      expect(tooFar.status).toBe(400);
      expect(errorFields(tooFar.body)).toEqual(['date: Date cannot be in the future.']);
    });
  });

  describe('one reading per slot per day', () => {
    it.each([
      ['MORNING', 'You already have a Morning (fasting) reading for this date.'],
      ['AFTER_BREAKFAST', 'You already have an After breakfast reading for this date.'],
      ['AFTER_LUNCH', 'You already have an After lunch reading for this date.'],
      ['AFTER_DINNER', 'You already have an After dinner reading for this date.'],
    ])('rejects a second %s reading on the same day', async (slot, message) => {
      const cookie = await registerAndGetCookie();
      await postReading(cookie, { ...validReading, slot });

      const response = await postReading(cookie, { ...validReading, slot, value: 130 });

      expect(response.status).toBe(409);
      expect(response.body).toEqual({ success: false, message });
    });

    it('allows the same slot on a different day', async () => {
      const cookie = await registerAndGetCookie();
      await postReading(cookie, validReading);

      const response = await postReading(cookie, { ...validReading, date: '2026-11-05' });

      expect(response.status).toBe(201);
    });

    it('lets two users each record the same slot on the same day', async () => {
      const first = await registerAndGetCookie();
      const second = await registerAndGetCookie({ email: 'other@example.com' });

      const firstResponse = await postReading(first, validReading);
      const secondResponse = await postReading(second, validReading);

      expect(firstResponse.status).toBe(201);
      expect(secondResponse.status).toBe(201);
    });
  });

  describe('maximum 4 readings per day', () => {
    it('rejects a 5th reading with the daily-limit message (not the duplicate one)', async () => {
      const cookie = await registerAndGetCookie();
      for (const slot of SLOTS) {
        const created = await postReading(cookie, { ...validReading, slot });
        expect(created.status).toBe(201);
      }

      // All four slots are taken, so this is also a duplicate slot. The daily-count check
      // runs first, so the limit message must win.
      const response = await postReading(cookie, { ...validReading, slot: 'MORNING' });

      expect(response.status).toBe(409);
      expect(response.body).toEqual({
        success: false,
        message: 'You can add only 4 readings per day.',
      });
    });
  });
});

describe('GET /api/v1/readings', () => {
  it('returns an empty page when there are no readings', async () => {
    const cookie = await registerAndGetCookie();

    const response = await getReadings(cookie);

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({
      items: [],
      pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    });
  });

  it('returns only the logged-in user’s readings', async () => {
    const first = await registerAndGetCookie();
    const second = await registerAndGetCookie({ email: 'other@example.com' });
    await postReading(first, { ...validReading, value: 111 });
    await postReading(second, { ...validReading, value: 222 });

    const response = await getReadings(first);

    expect(response.body.data.items).toHaveLength(1);
    expect(response.body.data.items[0].value).toBe(111);
    expect(response.body.data.pagination.total).toBe(1);
  });

  it('sorts newest date first, then by slot order within a day', async () => {
    const cookie = await registerAndGetCookie();
    await postReading(cookie, { date: '2026-11-01', slot: 'MORNING', value: 100 });
    await postReading(cookie, { date: '2026-11-03', slot: 'AFTER_DINNER', value: 100 });
    await postReading(cookie, { date: '2026-11-03', slot: 'MORNING', value: 100 });
    await postReading(cookie, { date: '2026-11-02', slot: 'AFTER_LUNCH', value: 100 });

    const response = await getReadings(cookie);

    const order = response.body.data.items.map(
      (item: { date: string; slot: string }) => `${item.date} ${item.slot}`,
    );
    expect(order).toEqual([
      '2026-11-03 MORNING',
      '2026-11-03 AFTER_DINNER',
      '2026-11-02 AFTER_LUNCH',
      '2026-11-01 MORNING',
    ]);
  });

  it('filters by from and to, inclusive on both ends', async () => {
    const cookie = await registerAndGetCookie();
    for (const date of ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04']) {
      await postReading(cookie, { ...validReading, date });
    }

    const range = await getReadings(cookie, 'from=2026-11-02&to=2026-11-03');
    const fromOnly = await getReadings(cookie, 'from=2026-11-03');
    const toOnly = await getReadings(cookie, 'to=2026-11-01');

    const dates = (response: request.Response) =>
      response.body.data.items.map((item: { date: string }) => item.date);
    expect(dates(range)).toEqual(['2026-11-03', '2026-11-02']);
    expect(dates(fromOnly)).toEqual(['2026-11-04', '2026-11-03']);
    expect(dates(toOnly)).toEqual(['2026-11-01']);
  });

  it('paginates and reports the totals', async () => {
    const cookie = await registerAndGetCookie();
    for (const day of ['01', '02', '03', '04', '05']) {
      await postReading(cookie, { ...validReading, date: `2026-11-${day}` });
    }

    const pageOne = await getReadings(cookie, 'pageSize=2');
    const pageThree = await getReadings(cookie, 'page=3&pageSize=2');
    const beyond = await getReadings(cookie, 'page=4&pageSize=2');

    expect(pageOne.body.data.items).toHaveLength(2);
    expect(pageOne.body.data.pagination).toEqual({ page: 1, pageSize: 2, total: 5, totalPages: 3 });
    expect(pageThree.body.data.items).toHaveLength(1);
    expect(beyond.body.data.items).toHaveLength(0);
    expect(beyond.body.data.pagination.total).toBe(5);
  });

  it('rejects invalid query parameters with field errors', async () => {
    const cookie = await registerAndGetCookie();

    const reversed = await getReadings(cookie, 'from=2026-11-10&to=2026-11-01');
    const badPage = await getReadings(cookie, 'page=0');
    const hugePageSize = await getReadings(cookie, 'pageSize=101');
    const badDate = await getReadings(cookie, 'from=2026-13-01');

    expect(reversed.status).toBe(400);
    expect(errorFields(reversed.body)).toEqual([
      'to: End date must be on or after the start date.',
    ]);
    expect(badPage.status).toBe(400);
    expect(hugePageSize.status).toBe(400);
    expect(badDate.status).toBe(400);
    expect(errorFields(badDate.body)).toEqual(['from: Enter a valid date.']);
  });
});

describe('GET /api/v1/readings/:id', () => {
  it('returns the reading', async () => {
    const cookie = await registerAndGetCookie();
    const created = await postReading(cookie, validReading);
    const id = created.body.data.reading.id as string;

    const response = await getReadingById(cookie, id);

    expect(response.status).toBe(200);
    expect(response.body.data.reading).toMatchObject({ id, ...validReading });
  });

  it('returns 404 for another user’s reading', async () => {
    const owner = await registerAndGetCookie();
    const other = await registerAndGetCookie({ email: 'other@example.com' });
    const created = await postReading(owner, validReading);

    const response = await getReadingById(other, created.body.data.reading.id as string);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ success: false, message: 'Reading not found.' });
  });

  it('returns 404 for an id that does not exist', async () => {
    const cookie = await registerAndGetCookie();

    const response = await getReadingById(cookie, 'f47ac10b-58cc-4372-a567-0e02b2c3d479');

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Reading not found.');
  });

  it('returns 404, not 500, for a malformed id', async () => {
    const cookie = await registerAndGetCookie();

    const response = await getReadingById(cookie, 'abc');

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Reading not found.');
  });
});

/** Creates a reading and returns its id. */
async function createdId(cookie: string[], body: object = validReading): Promise<string> {
  const response = await postReading(cookie, body);
  expect(response.status).toBe(201);
  return response.body.data.reading.id as string;
}

describe('PUT /api/v1/readings/:id', () => {
  it('changes only the value and leaves the rest alone', async () => {
    const cookie = await registerAndGetCookie();
    const id = await createdId(cookie);

    const response = await putReading(cookie, id, { value: 150 });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Reading updated');
    expect(response.body.data.reading).toMatchObject({ id, ...validReading, value: 150 });
  });

  it('changes only the slot', async () => {
    const cookie = await registerAndGetCookie();
    const id = await createdId(cookie);

    const response = await putReading(cookie, id, { slot: 'MORNING' });

    expect(response.status).toBe(200);
    expect(response.body.data.reading).toMatchObject({ ...validReading, slot: 'MORNING' });
  });

  it('moves a reading to another date, and a later GET shows it', async () => {
    const cookie = await registerAndGetCookie();
    const id = await createdId(cookie);

    const response = await putReading(cookie, id, { date: '2026-11-06' });
    const fetched = await getReadingById(cookie, id);

    expect(response.status).toBe(200);
    expect(response.body.data.reading.date).toBe('2026-11-06');
    expect(fetched.body.data.reading).toMatchObject({ date: '2026-11-06', value: 120 });
  });

  it('accepts updating a reading to its own current slot', async () => {
    const cookie = await registerAndGetCookie();
    const id = await createdId(cookie);

    const response = await putReading(cookie, id, { slot: validReading.slot, value: 99 });

    expect(response.status).toBe(200);
    expect(response.body.data.reading.value).toBe(99);
  });

  it('rejects a slot that is already taken on that day', async () => {
    const cookie = await registerAndGetCookie();
    await createdId(cookie, { ...validReading, slot: 'MORNING' });
    const id = await createdId(cookie);

    const response = await putReading(cookie, id, { slot: 'MORNING' });

    expect(response.status).toBe(409);
    expect(response.body.message).toBe(
      'You already have a Morning (fasting) reading for this date.',
    );
  });

  it('rejects moving onto a day where that slot is already taken', async () => {
    const cookie = await registerAndGetCookie();
    await createdId(cookie, { ...validReading, date: '2026-11-06' });
    const id = await createdId(cookie);

    const response = await putReading(cookie, id, { date: '2026-11-06' });

    expect(response.status).toBe(409);
    expect(response.body.message).toBe('You already have an After lunch reading for this date.');
  });

  it('rejects moving onto a day that already has 4 readings', async () => {
    const cookie = await registerAndGetCookie();
    for (const slot of SLOTS) {
      await createdId(cookie, { ...validReading, date: '2026-11-06', slot });
    }
    const id = await createdId(cookie);

    const response = await putReading(cookie, id, { date: '2026-11-06' });

    expect(response.status).toBe(409);
    expect(response.body.message).toBe('You can add only 4 readings per day.');
  });

  it('allows editing a reading on a day that already has 4 readings', async () => {
    const cookie = await registerAndGetCookie();
    let id = '';
    for (const slot of SLOTS) {
      id = await createdId(cookie, { ...validReading, slot });
    }

    const response = await putReading(cookie, id, { value: 101 });

    expect(response.status).toBe(200);
  });

  it('rejects a date too far in the future', async () => {
    const cookie = await registerAndGetCookie();
    const id = await createdId(cookie);

    const response = await putReading(cookie, id, { date: addDays(todayString(), 2) });

    expect(response.status).toBe(400);
    expect(errorFields(response.body)).toEqual(['date: Date cannot be in the future.']);
  });

  it('rejects an empty body and an out-of-range value', async () => {
    const cookie = await registerAndGetCookie();
    const id = await createdId(cookie);

    const empty = await putReading(cookie, id, {});
    const tooLow = await putReading(cookie, id, { value: 39 });

    expect(empty.status).toBe(400);
    expect(tooLow.status).toBe(400);
    expect(errorFields(tooLow.body)).toEqual([`value: ${VALUE_RANGE}`]);
  });

  it('returns 404 for another user’s reading and leaves it unchanged', async () => {
    const owner = await registerAndGetCookie();
    const other = await registerAndGetCookie({ email: 'other@example.com' });
    const id = await createdId(owner);

    const response = await putReading(other, id, { value: 500 });
    const stillThere = await getReadingById(owner, id);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ success: false, message: 'Reading not found.' });
    expect(stillThere.body.data.reading.value).toBe(120);
  });

  it('returns 404 for a missing or malformed id', async () => {
    const cookie = await registerAndGetCookie();

    const missing = await putReading(cookie, 'f47ac10b-58cc-4372-a567-0e02b2c3d479', {
      value: 100,
    });
    const malformed = await putReading(cookie, 'abc', { value: 100 });

    expect(missing.status).toBe(404);
    expect(malformed.status).toBe(404);
  });
});

describe('DELETE /api/v1/readings/:id', () => {
  it('deletes the reading', async () => {
    const cookie = await registerAndGetCookie();
    const id = await createdId(cookie);

    const response = await removeReading(cookie, id);
    const fetched = await getReadingById(cookie, id);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, message: 'Reading deleted', data: null });
    expect(fetched.status).toBe(404);
  });

  it('frees the slot and the daily count', async () => {
    const cookie = await registerAndGetCookie();
    let id = '';
    for (const slot of SLOTS) {
      id = await createdId(cookie, { ...validReading, slot });
    }

    await removeReading(cookie, id);
    const recreated = await postReading(cookie, { ...validReading, slot: 'AFTER_DINNER' });

    expect(recreated.status).toBe(201);
  });

  it('returns 404 for another user’s reading and does not delete it', async () => {
    const owner = await registerAndGetCookie();
    const other = await registerAndGetCookie({ email: 'other@example.com' });
    const id = await createdId(owner);

    const response = await removeReading(other, id);
    const stillThere = await getReadingById(owner, id);

    expect(response.status).toBe(404);
    expect(stillThere.status).toBe(200);
  });

  it('returns 404 for a missing, already deleted or malformed id', async () => {
    const cookie = await registerAndGetCookie();
    const id = await createdId(cookie);
    await removeReading(cookie, id);

    const again = await removeReading(cookie, id);
    const missing = await removeReading(cookie, 'f47ac10b-58cc-4372-a567-0e02b2c3d479');
    const malformed = await removeReading(cookie, 'abc');

    expect(again.status).toBe(404);
    expect(missing.status).toBe(404);
    expect(malformed.status).toBe(404);
  });
});

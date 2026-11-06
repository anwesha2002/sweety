import { z } from 'zod';
import { MAX_READINGS_PER_DAY, SLOT_LABELS, type ReadingSlot } from '../../constants/readings.js';
import { ApiError } from '../../utils/ApiError.js';
import { maxAllowedDate } from '../../utils/date.js';
import { isUniqueViolation } from '../../utils/dbErrors.js';
import { toReadingDto } from './reading.dto.js';
import * as readingsRepository from './readings.repository.js';
import type {
  CreateReadingInput,
  ListReadingsPages,
  ListReadingsQueryInput,
  ReadingDto,
  UpdateReadingInput,
} from './readings.schemas.js';

// All functions take `userId` (from req.user.id, never from the client) and must only touch
// that user's readings.

const FUTURE_DATE_MESSAGE = 'Date cannot be in the future.';

/** Rejects dates later than "today in UTC + 1 day" (see docs/architecture.md, date convention). */
function assertDateNotInFuture(date: string): void {
  if (date > maxAllowedDate()) {
    throw new ApiError(400, FUTURE_DATE_MESSAGE, [{ field: 'date', message: FUTURE_DATE_MESSAGE }]);
  }
}

function dailyLimitError(): ApiError {
  return new ApiError(409, `You can add only ${MAX_READINGS_PER_DAY} readings per day.`);
}

/** "You already have an After lunch reading for this date." ("a" before Morning, "an" otherwise.) */
function duplicateSlotError(slot: ReadingSlot): ApiError {
  const label = SLOT_LABELS[slot];
  const article = /^[aeiou]/i.test(label) ? 'an' : 'a';
  return new ApiError(409, `You already have ${article} ${label} reading for this date.`);
}

export async function createReading(
  userId: string,
  input: CreateReadingInput,
): Promise<ReadingDto> {
  // The order matters. A 5th reading on a day is always also a duplicate slot (there are only
  // 4 slots), so the daily count must be checked first or its message could never appear.
  assertDateNotInFuture(input.date);

  const readingsOnDate = await readingsRepository.countReadingsOnDate(userId, input.date);
  if (readingsOnDate >= MAX_READINGS_PER_DAY) {
    throw dailyLimitError();
  }

  const sameSlot = await readingsRepository.findReadingByDateAndSlot(
    userId,
    input.date,
    input.slot,
  );
  if (sameSlot) {
    throw duplicateSlotError(input.slot);
  }

  try {
    const reading = await readingsRepository.createReading(userId, input);
    return toReadingDto(reading);
  } catch (error) {
    // Two identical requests can both pass the check above at the same moment; the unique
    // index (userId, date, slot) stops the second one.
    if (isUniqueViolation(error)) {
      throw duplicateSlotError(input.slot);
    }
    throw error;
  }
}

function readingNotFoundError(): ApiError {
  return new ApiError(404, 'Reading not found.');
}

/**
 * A malformed id (e.g. /readings/abc) is answered like a missing reading. Without this check
 * the database would reject the invalid UUID and the client would get a 500.
 */
function assertValidId(readingId: string): void {
  if (!z.uuid().safeParse(readingId).success) {
    throw readingNotFoundError();
  }
}

/** `query` has already been validated and has its defaults applied (page 1, pageSize 20). */
export async function listReadings(
  userId: string,
  query: ListReadingsQueryInput,
): Promise<ListReadingsPages> {
  const { rows, total } = await readingsRepository.listReadings(userId, {
    from: query.from,
    to: query.to,
    skip: (query.page - 1) * query.pageSize,
    take: query.pageSize,
  });

  return {
    items: rows.map(toReadingDto),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize), // 0 when there are no readings
    },
  };
}

export async function getReading(userId: string, readingId: string): Promise<ReadingDto> {
  assertValidId(readingId);

  // The repository filters by userId, so another user's reading looks exactly like a missing one.
  const reading = await readingsRepository.findReadingById(userId, readingId);
  if (!reading) {
    throw readingNotFoundError();
  }
  return toReadingDto(reading);
}

/**
 * Applies a partial update. The same rules as creating apply to the resulting reading, but the
 * reading being edited is ignored when counting and when looking for a duplicate slot, so
 * updating a reading to its own current slot works.
 */
export async function updateReading(
  userId: string,
  readingId: string,
  input: UpdateReadingInput,
): Promise<ReadingDto> {
  assertValidId(readingId);

  const existing = await readingsRepository.findReadingById(userId, readingId);
  if (!existing) {
    throw readingNotFoundError();
  }

  // The reading as it will look after the update.
  const currentDate = existing.date;
  const next = {
    date: input.date ?? currentDate,
    slot: input.slot ?? existing.slot,
    value: input.value ?? existing.value,
  };
  const dateChanged = next.date !== currentDate;
  const slotChanged = next.slot !== existing.slot;

  if (dateChanged) {
    // Only a moved reading can push a day over the limit (changing just the slot keeps the day's count).
    assertDateNotInFuture(next.date);
    const otherReadingsOnDate = await readingsRepository.countReadingsOnDate(
      userId,
      next.date,
      readingId,
    );
    if (otherReadingsOnDate >= MAX_READINGS_PER_DAY) {
      throw dailyLimitError();
    }
  }

  if (dateChanged || slotChanged) {
    const sameSlot = await readingsRepository.findReadingByDateAndSlot(
      userId,
      next.date,
      next.slot,
      readingId,
    );
    if (sameSlot) {
      throw duplicateSlotError(next.slot);
    }
  }

  try {
    const updated = await readingsRepository.updateReading(userId, readingId, next);
    if (!updated) {
      throw readingNotFoundError(); // deleted by another request in the meantime
    }
    return toReadingDto(updated);
  } catch (error) {
    // Same race as in createReading: the unique index has the last word.
    if (isUniqueViolation(error)) {
      throw duplicateSlotError(next.slot);
    }
    throw error;
  }
}

export async function deleteReading(userId: string, readingId: string): Promise<void> {
  assertValidId(readingId);

  // The repository only deletes the user's own reading and reports whether anything was deleted.
  const deleted = await readingsRepository.deleteReading(userId, readingId);
  if (!deleted) {
    throw readingNotFoundError();
  }
}

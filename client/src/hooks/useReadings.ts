import { useCallback } from 'react';
import { listReadings } from '../services/readings.service';
import type { ReadingsQuery } from '../types/reading';
import { useAsyncData } from './useAsyncData';

/**
 * The user's readings for a page / date range. Changing the query loads the new page while the
 * old one stays on screen. Call `refetch()` after a reading was added, changed or deleted.
 * Pass `{ enabled: false }` to skip the request, e.g. while the date filter is invalid.
 */
export function useReadings(query: ReadingsQuery, options: { enabled?: boolean } = {}) {
  const { from, to, page, pageSize } = query;
  const load = useCallback(
    () => listReadings({ from, to, page, pageSize }),
    [from, to, page, pageSize],
  );
  return useAsyncData(load, { enabled: options.enabled, keepPreviousData: true });
}

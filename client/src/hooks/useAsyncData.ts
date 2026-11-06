import { useCallback, useEffect, useState } from 'react';

interface Settled<T> {
  /** The loader this result belongs to, so a result is never shown for other parameters. */
  source: () => Promise<T>;
  /** The refetch counter when the request was made. */
  version: number;
  failed: boolean;
  data?: T;
  error?: unknown;
}

export interface AsyncData<T> {
  /** The loaded data, or undefined while loading, after an error, or while disabled. */
  data: T | undefined;
  error: unknown;
  isError: boolean;
  /** A request is running and there is nothing to show yet. */
  isLoading: boolean;
  /** A request is running (also true while refreshing data that is already on screen). */
  isFetching: boolean;
  /** Request the data again, e.g. after something was saved. */
  refetch: () => void;
}

interface Options {
  /** Pass `false` to skip the request, e.g. while a filter is invalid. Default: true. */
  enabled?: boolean;
  /** While new parameters load, keep showing the previous result (smooth paging). */
  keepPreviousData?: boolean;
}

/**
 * Loads data with plain React state: runs `load` when the component mounts and whenever
 * `load` changes, and again on `refetch()`.
 *
 * `load` must keep the same identity until its inputs change, so wrap it in `useCallback`
 * with those inputs as dependencies. A new `load` means "different parameters, fetch again".
 * A response that arrives after the parameters have changed (or the component has gone) is
 * ignored.
 */
export function useAsyncData<T>(load: () => Promise<T>, options: Options = {}): AsyncData<T> {
  const { enabled = true, keepPreviousData = false } = options;
  const [settled, setSettled] = useState<Settled<T> | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!enabled) return;

    let ignore = false;
    load().then(
      (data) => {
        if (!ignore) setSettled({ source: load, version, failed: false, data });
      },
      (error: unknown) => {
        if (!ignore) setSettled({ source: load, version, failed: true, error });
      },
    );
    return () => {
      ignore = true;
    };
  }, [load, enabled, version]);

  const refetch = useCallback(() => setVersion((current) => current + 1), []);

  // The settled result, but only if it was produced by the current loader.
  const forThisLoader = enabled && settled !== null && settled.source === load ? settled : null;
  const isUpToDate = forThisLoader !== null && forThisLoader.version === version;
  const isFetching = enabled && !isUpToDate;
  const isError = isUpToDate && forThisLoader.failed;

  let data: T | undefined;
  if (forThisLoader) {
    data = forThisLoader.failed ? undefined : forThisLoader.data;
  } else if (enabled && keepPreviousData && settled !== null && !settled.failed) {
    data = settled.data;
  }

  return {
    data,
    error: isError ? forThisLoader.error : undefined,
    isError,
    isLoading: isFetching && data === undefined,
    isFetching,
    refetch,
  };
}

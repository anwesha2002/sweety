import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useAsyncData } from './useAsyncData';

/** A promise you resolve or reject yourself, to control when a "request" finishes. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('useAsyncData', () => {
  it('loads the data on mount', async () => {
    const load = vi.fn(async () => 'hello');

    const { result } = renderHook(() => useAsyncData(load));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();

    await waitFor(() => expect(result.current.data).toBe('hello'));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isFetching).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('reports an error, and refetch can recover from it', async () => {
    const load = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce('back again');

    const { result } = renderHook(() => useAsyncData(load));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(new Error('network down'));
    expect(result.current.data).toBeUndefined();

    act(() => result.current.refetch());

    await waitFor(() => expect(result.current.data).toBe('back again'));
    expect(result.current.isError).toBe(false);
  });

  it('keeps showing the data while a refetch is running', async () => {
    const second = deferred<string>();
    const load = vi
      .fn<() => Promise<string>>()
      .mockResolvedValueOnce('first')
      .mockReturnValueOnce(second.promise);

    const { result } = renderHook(() => useAsyncData(load));
    await waitFor(() => expect(result.current.data).toBe('first'));

    act(() => result.current.refetch());

    expect(result.current.data).toBe('first');
    expect(result.current.isFetching).toBe(true);
    expect(result.current.isLoading).toBe(false); // there is data to show, so not "loading"

    await act(async () => second.resolve('second'));
    await waitFor(() => expect(result.current.data).toBe('second'));
    expect(result.current.isFetching).toBe(false);
  });

  it('fetches again, and hides the old data, when the loader changes', async () => {
    const slow = deferred<string>();
    const first = vi.fn(async () => 'for page 1');
    const second = vi.fn(() => slow.promise);

    const { result, rerender } = renderHook(({ load }) => useAsyncData(load), {
      initialProps: { load: first as () => Promise<string> },
    });
    await waitFor(() => expect(result.current.data).toBe('for page 1'));

    rerender({ load: second });

    // Data of other parameters must not be shown under the new ones.
    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(true);

    await act(async () => slow.resolve('for page 2'));
    await waitFor(() => expect(result.current.data).toBe('for page 2'));
  });

  it('can keep the previous data while new parameters load (keepPreviousData)', async () => {
    const slow = deferred<string>();
    const first = vi.fn(async () => 'page 1');
    const second = vi.fn(() => slow.promise);

    const { result, rerender } = renderHook(
      ({ load }) => useAsyncData(load, { keepPreviousData: true }),
      { initialProps: { load: first as () => Promise<string> } },
    );
    await waitFor(() => expect(result.current.data).toBe('page 1'));

    rerender({ load: second });

    expect(result.current.data).toBe('page 1');
    expect(result.current.isFetching).toBe(true);
    expect(result.current.isLoading).toBe(false);

    await act(async () => slow.resolve('page 2'));
    await waitFor(() => expect(result.current.data).toBe('page 2'));
  });

  it('does not run when disabled, and loads once it is enabled', async () => {
    const load = vi.fn(async () => 'data');

    const { result, rerender } = renderHook(({ enabled }) => useAsyncData(load, { enabled }), {
      initialProps: { enabled: false },
    });

    expect(load).not.toHaveBeenCalled();
    expect(result.current.data).toBeUndefined();
    expect(result.current.isFetching).toBe(false);
    expect(result.current.isLoading).toBe(false);

    rerender({ enabled: true });

    await waitFor(() => expect(result.current.data).toBe('data'));
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('ignores a late response for parameters that are no longer current', async () => {
    const oldRequest = deferred<string>();
    const newRequest = deferred<string>();
    const oldLoad = vi.fn(() => oldRequest.promise);
    const newLoad = vi.fn(() => newRequest.promise);

    const { result, rerender } = renderHook(({ load }) => useAsyncData(load), {
      initialProps: { load: oldLoad as () => Promise<string> },
    });
    rerender({ load: newLoad });

    await act(async () => newRequest.resolve('new'));
    await waitFor(() => expect(result.current.data).toBe('new'));

    // The slow old request finishes last and must not overwrite the newer result.
    await act(async () => oldRequest.resolve('old'));
    expect(result.current.data).toBe('new');
  });
});

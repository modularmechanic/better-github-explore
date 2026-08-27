// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useAsync } from './use-async'

/** A promise whose settlement the test controls. */
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('useAsync', () => {
  it('resolves to data', async () => {
    const { result } = renderHook(() => useAsync(async () => 'ok', []))

    expect(result.current).toEqual({ data: null, error: null, loading: true })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current).toEqual({ data: 'ok', error: null, loading: false })
  })

  it('reports a rejection as an error message', async () => {
    const { result } = renderHook(() =>
      useAsync(() => Promise.reject(new Error('rate limited')), []),
    )

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current).toEqual({ data: null, error: 'rate limited', loading: false })
  })

  it('discards a result superseded by a dep change', async () => {
    const first = deferred<string>()
    const second = deferred<string>()
    const { result, rerender } = renderHook(
      ({ dep }) => useAsync(() => (dep === 1 ? first.promise : second.promise), [dep]),
      { initialProps: { dep: 1 } },
    )

    rerender({ dep: 2 }) // The first run is now stale.

    await act(async () => {
      first.resolve('stale')
      await first.promise
    })
    expect(result.current.data).toBeNull()
    expect(result.current.loading).toBe(true)

    await act(async () => {
      second.resolve('fresh')
      await second.promise
    })
    expect(result.current).toEqual({ data: 'fresh', error: null, loading: false })
  })

  it('discards a rejection superseded by a dep change', async () => {
    const first = deferred<string>()
    const second = deferred<string>()
    const { result, rerender } = renderHook(
      ({ dep }) => useAsync(() => (dep === 1 ? first.promise : second.promise), [dep]),
      { initialProps: { dep: 1 } },
    )

    rerender({ dep: 2 })

    await act(async () => {
      first.reject(new Error('stale failure'))
      await first.promise.catch(() => {})
    })
    expect(result.current.error).toBeNull()

    await act(async () => {
      second.resolve('fresh')
      await second.promise
    })
    expect(result.current.data).toBe('fresh')
  })
})

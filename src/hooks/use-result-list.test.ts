// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useResultList } from '@/hooks/use-result-list'
import type { AsyncState } from '@/hooks/use-async'

const loaded = <T,>(data: T[]): AsyncState<T[]> => ({ data, loading: false, error: null })
const loading: AsyncState<number[]> = { data: null, loading: true, error: null }
const failed: AsyncState<number[]> = { data: null, loading: false, error: 'boom' }

const range = (n: number) => Array.from({ length: n }, (_, i) => i + 1)

describe('the derived state', () => {
  it('carries the source loading flag through, with a null page', () => {
    const { result } = renderHook(() => useResultList(loading))

    expect(result.current.state).toEqual({ data: null, loading: true, error: null })
    expect(result.current.total).toBe(0)
  })

  it('carries the source error through', () => {
    const { result } = renderHook(() => useResultList(failed))

    expect(result.current.state.error).toBe('boom')
  })

  it('exposes only the current page as data, but the full list as items', () => {
    const { result } = renderHook(() => useResultList(loaded(range(60)), { pageSize: 25 }))

    expect(result.current.state.data).toHaveLength(25)
    expect(result.current.items).toHaveLength(60)
    expect(result.current.total).toBe(60)
    expect(result.current.totalPages).toBe(3)
  })
})

describe('select', () => {
  it('narrows and orders in one pass', () => {
    const { result } = renderHook(() =>
      useResultList(loaded([3, 1, 4, 1, 5]), {
        select: (items) => items.filter((n) => n > 1).sort((a, b) => a - b),
      }),
    )

    expect(result.current.items).toEqual([3, 4, 5])
  })

  it('never lets an in-place sort reach the source array', () => {
    // The hook hands `select` a copy, which is what makes `items.sort(...)`
    // safe to write at a call site.
    const source = [3, 1, 2]
    renderHook(() => useResultList(loaded(source), { select: (items) => items.sort() }))

    expect(source).toEqual([3, 1, 2])
  })

  it('keeps everything when no select is given', () => {
    const { result } = renderHook(() => useResultList(loaded([2, 1])))

    expect(result.current.items).toEqual([2, 1])
  })

  it('re-runs when a declared dependency changes', () => {
    const { result, rerender } = renderHook(
      ({ min }: { min: number }) =>
        useResultList(loaded(range(5)), {
          select: (items) => items.filter((n) => n >= min),
          deps: [min],
        }),
      { initialProps: { min: 1 } },
    )

    expect(result.current.total).toBe(5)

    rerender({ min: 4 })

    expect(result.current.items).toEqual([4, 5])
  })
})

describe('paging', () => {
  it('slices the requested page', () => {
    const { result } = renderHook(() => useResultList(loaded(range(10)), { pageSize: 4 }))

    act(() => result.current.setPage(2))

    expect(result.current.state.data).toEqual([5, 6, 7, 8])
  })

  it('pulls the page back in range when a filter shortens the list', () => {
    // The invariant seven views used to each own a copy of: paging to the end
    // and then narrowing must not leave you past it.
    const { result, rerender } = renderHook(
      ({ max }: { max: number }) =>
        useResultList(loaded(range(20)), {
          select: (items) => items.filter((n) => n <= max),
          deps: [max],
          pageSize: 5,
        }),
      { initialProps: { max: 20 } },
    )

    act(() => result.current.setPage(4))
    expect(result.current.page).toBe(4)

    rerender({ max: 5 })

    expect(result.current.page).toBe(1)
    expect(result.current.state.data).toEqual([1, 2, 3, 4, 5])
  })

  it('repages when the page size changes', () => {
    const { result } = renderHook(() => useResultList(loaded(range(10)), { pageSize: 5 }))
    expect(result.current.totalPages).toBe(2)

    act(() => result.current.setPageSize(10))

    expect(result.current.totalPages).toBe(1)
    expect(result.current.state.data).toHaveLength(10)
  })

  it('reports one page for an empty list rather than zero', () => {
    const { result } = renderHook(() => useResultList(loaded<number>([])))

    expect(result.current.totalPages).toBe(1)
    expect(result.current.state.data).toEqual([])
  })
})

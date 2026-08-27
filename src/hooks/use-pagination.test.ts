// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { usePagination } from './use-pagination'

const items = (n: number) => Array.from({ length: n }, (_, i) => i + 1)

describe('usePagination', () => {
  it('slices the current page', () => {
    const { result } = renderHook(() => usePagination(items(10), 3))

    expect(result.current.pageItems).toEqual([1, 2, 3])

    act(() => result.current.setPage(2))
    expect(result.current.page).toBe(2)
    expect(result.current.pageItems).toEqual([4, 5, 6])
  })

  it('returns a short final page', () => {
    const { result } = renderHook(() => usePagination(items(10), 3))

    act(() => result.current.setPage(4))
    expect(result.current.pageItems).toEqual([10])
  })

  it('counts pages, rounding up and never below one', () => {
    expect(renderHook(() => usePagination(items(10), 3)).result.current.totalPages).toBe(4)
    expect(renderHook(() => usePagination(items(9), 3)).result.current.totalPages).toBe(3)
    expect(renderHook(() => usePagination([], 3)).result.current.totalPages).toBe(1)
  })

  it('has no page items before the list loads', () => {
    const { result } = renderHook(() => usePagination(null, 3))

    expect(result.current.pageItems).toBeNull()
    expect(result.current.totalPages).toBe(1)
  })

  it('clamps the page when the list shrinks under it', () => {
    const { result, rerender } = renderHook(({ list }) => usePagination(list, 3), {
      initialProps: { list: items(10) },
    })

    act(() => result.current.setPage(4))
    expect(result.current.page).toBe(4)

    // A filter narrows the list to a single page.
    rerender({ list: items(2) })
    expect(result.current.page).toBe(1)
    expect(result.current.pageItems).toEqual([1, 2])
  })
})

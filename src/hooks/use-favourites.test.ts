// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useFavourites } from './use-favourites'

const stored = (kind = 'topics') => localStorage.getItem(`bx-favourites:${kind}`)

describe('useFavourites', () => {
  it('starts empty', () => {
    const { result } = renderHook(() => useFavourites('topics'))

    expect(result.current.ids).toEqual([])
    expect(result.current.count).toBe(0)
    expect(result.current.isFavourite('react')).toBe(false)
  })

  it('toggles an id on and then off', () => {
    const { result } = renderHook(() => useFavourites('topics'))

    act(() => result.current.toggle('react'))
    expect(result.current.ids).toEqual(['react'])
    expect(result.current.isFavourite('react')).toBe(true)
    expect(result.current.count).toBe(1)

    act(() => result.current.toggle('react'))
    expect(result.current.ids).toEqual([])
    expect(result.current.isFavourite('react')).toBe(false)
  })

  it('persists under a key scoped to the kind', () => {
    const { result } = renderHook(() => useFavourites('collections'))

    act(() => result.current.toggle('open-source-organizations'))

    expect(stored('collections')).toBe('["open-source-organizations"]')
    expect(stored('topics')).toBeNull()
  })

  it('reads what a previous session stored', () => {
    localStorage.setItem('bx-favourites:topics', '["vue"]')

    const { result } = renderHook(() => useFavourites('topics'))

    expect(result.current.ids).toEqual(['vue'])
  })

  it('keeps two instances in sync', () => {
    const a = renderHook(() => useFavourites('topics'))
    const b = renderHook(() => useFavourites('topics'))

    act(() => a.result.current.toggle('react'))

    expect(b.result.current.ids).toEqual(['react'])
    expect(b.result.current.isFavourite('react')).toBe(true)

    act(() => b.result.current.toggle('react'))

    expect(a.result.current.ids).toEqual([])
  })

  it('ignores a stored value that is not an array', () => {
    // Valid JSON, wrong shape: it survives JSON.parse and used to make
    // ids.includes(...) throw on the next render.
    localStorage.setItem('bx-favourites:topics', '{"a":1}')

    const { result } = renderHook(() => useFavourites('topics'))

    expect(result.current.ids).toEqual([])
    expect(result.current.isFavourite('react')).toBe(false)

    act(() => result.current.toggle('react'))
    expect(result.current.ids).toEqual(['react'])
  })

  it('ignores unparseable storage', () => {
    localStorage.setItem('bx-favourites:topics', 'not json')

    const { result } = renderHook(() => useFavourites('topics'))

    expect(result.current.ids).toEqual([])
  })
})

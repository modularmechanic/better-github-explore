// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useToken } from '@/hooks/use-token'
import { writeToken as setToken } from '@/lib/token'

/** A storage event as another tab would raise it. */
const fromOtherTab = (key: string | null) => dispatchEvent(new StorageEvent('storage', { key }))

describe('useToken', () => {
  it('reports no token when none is stored', () => {
    const { result } = renderHook(() => useToken())

    expect(result.current).toEqual({ has: false, version: 0 })
  })

  it('reads a token stored by a previous session', () => {
    localStorage.setItem('bx-token', 'ghp_x')

    expect(renderHook(() => useToken()).result.current.has).toBe(true)
  })

  it('follows setToken in this tab, bumping version each time', () => {
    const { result } = renderHook(() => useToken())

    act(() => setToken('ghp_x'))
    expect(result.current).toEqual({ has: true, version: 1 })

    act(() => setToken(''))
    expect(result.current).toEqual({ has: false, version: 2 })
  })

  it('ignores another tab writing a cache entry', () => {
    // Without the key filter every cached response in any tab would remount
    // this one's view.
    const { result } = renderHook(() => useToken())

    act(() => void fromOtherTab('bx:/repos/a/b'))

    expect(result.current.version).toBe(0)
  })

  it('reacts to another tab clearing storage', () => {
    localStorage.setItem('bx-token', 'ghp_x')
    const { result } = renderHook(() => useToken())

    act(() => {
      localStorage.clear()
      fromOtherTab(null) // key === null: that tab called clear()
    })

    expect(result.current).toEqual({ has: false, version: 1 })
  })
})

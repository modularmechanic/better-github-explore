// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { navigate, parseHash, TABS, useHashRoute, visibleTabs } from './use-hash-route'

afterEach(() => {
  location.hash = ''
})

const setHash = (hash: string) =>
  act(() => {
    location.hash = hash
    dispatchEvent(new Event('hashchange'))
  })

describe('parseHash', () => {
  it('falls back to the explore tab', () => {
    expect(parseHash('')).toEqual({ tab: 'explore', param: null })
    expect(parseHash('#/')).toEqual({ tab: 'explore', param: null })
    expect(parseHash('#/nope')).toEqual({ tab: 'explore', param: null })
  })

  it('reads a known tab', () => {
    expect(parseHash('#/trending')).toEqual({ tab: 'trending', param: null })
  })

  it('reads a tab and its detail param', () => {
    expect(parseHash('#/topics/react')).toEqual({ tab: 'topics', param: 'react' })
  })

  it('reads the you tab regardless of token state', () => {
    // Deciding whether to render it is App.tsx's job, not the parser's.
    expect(parseHash('#/you')).toEqual({ tab: 'you', param: null })
  })

  it('decodes an encoded param', () => {
    expect(parseHash('#/topics/machine%20learning').param).toBe('machine learning')
    expect(parseHash('#/topics/c%2B%2B').param).toBe('c++')
  })

  it('keeps the raw segment when the escape is malformed', () => {
    // decodeURIComponent throws URIError here, which used to blank the page.
    expect(parseHash('#/topics/%E0%A4%A')).toEqual({ tab: 'topics', param: '%E0%A4%A' })
  })
})

describe('useHashRoute', () => {
  it('starts from the current hash', () => {
    location.hash = '#/collections/dev-tools'

    const { result } = renderHook(() => useHashRoute())

    expect(result.current).toEqual({ tab: 'collections', param: 'dev-tools' })
  })

  it('updates on hashchange', () => {
    const { result } = renderHook(() => useHashRoute())
    expect(result.current.tab).toBe('explore')

    setHash('#/topics/react')

    expect(result.current).toEqual({ tab: 'topics', param: 'react' })
  })
})

describe('visibleTabs', () => {
  it('includes you when a token is stored', () => {
    expect(visibleTabs(true)).toEqual([
      'explore', 'you', 'trending', 'topics', 'collections', 'events', 'sponsors',
    ])
  })

  it('omits you and keeps the rest in order without one', () => {
    expect(visibleTabs(false)).toEqual([
      'explore', 'trending', 'topics', 'collections', 'events', 'sponsors',
    ])
  })

  it('allocates a new array when filtering, so callers cannot mutate the tuple', () => {
    expect(visibleTabs(false)).not.toBe(TABS)
  })
})

describe('navigate', () => {
  it('writes a bare tab hash', () => {
    navigate('trending')
    expect(location.hash).toBe('#/trending')
  })

  it('encodes a detail param so it survives the round trip through parseHash', () => {
    navigate('topics', 'machine learning')
    expect(location.hash).toBe('#/topics/machine%20learning')
    expect(parseHash(location.hash)).toEqual({ tab: 'topics', param: 'machine learning' })
  })

  it('encodes characters the hash would otherwise swallow', () => {
    navigate('topics', 'c++')
    expect(location.hash).toBe('#/topics/c%2B%2B')
    expect(parseHash(location.hash).param).toBe('c++')
  })
})

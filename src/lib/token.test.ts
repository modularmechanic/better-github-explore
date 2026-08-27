// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { hasToken, onTokenChange, onTokenSweep, readToken, writeToken } from './token'

/** A storage event as another tab would raise it. */
const fromOtherTab = (key: string | null) => dispatchEvent(new StorageEvent('storage', { key }))

describe('reading', () => {
  it('reports an empty string and no token when nothing is stored', () => {
    expect(readToken()).toBe('')
    expect(hasToken()).toBe(false)
  })

  it('reads a token stored by a previous session', () => {
    localStorage.setItem('bx-token', 'ghp_x')

    expect(readToken()).toBe('ghp_x')
    expect(hasToken()).toBe(true)
  })
})

describe('writing', () => {
  it('trims the value before storing it', () => {
    writeToken('  ghp_x  ')

    expect(readToken()).toBe('ghp_x')
  })

  it('removes the key entirely for a blank value', () => {
    writeToken('ghp_x')
    writeToken('   ')

    expect(localStorage.getItem('bx-token')).toBeNull()
    expect(hasToken()).toBe(false)
  })
})

describe('notification order', () => {
  it('runs every sweeper before any reader', () => {
    // The whole reason for two rings: a reader that refetches must not see
    // state the sweepers are about to discard.
    const order: string[] = []
    const offReader = onTokenChange(() => order.push('reader'))
    const offSweeper = onTokenSweep(() => order.push('sweeper'))

    writeToken('ghp_x')

    expect(order).toEqual(['sweeper', 'reader'])
    offReader()
    offSweeper()
  })

  it('stops notifying after the returned unsubscribe runs', () => {
    let calls = 0
    onTokenChange(() => calls++)()

    writeToken('ghp_x')

    expect(calls).toBe(0)
  })
})

describe('other tabs', () => {
  it('notifies when another tab writes the token key', () => {
    let calls = 0
    const off = onTokenChange(() => calls++)

    fromOtherTab('bx-token')

    expect(calls).toBe(1)
    off()
  })

  it('ignores another tab writing a cached response', () => {
    // Without the key filter every cached response in any tab would remount
    // this one's views.
    let calls = 0
    const off = onTokenChange(() => calls++)

    fromOtherTab('bx:/repos/a/b')

    expect(calls).toBe(0)
    off()
  })

  it('notifies when another tab clears storage', () => {
    // A null key means that tab called localStorage.clear(), which does take
    // the token with it.
    let calls = 0
    const off = onTokenChange(() => calls++)

    fromOtherTab(null)

    expect(calls).toBe(1)
    off()
  })
})

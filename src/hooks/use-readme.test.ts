// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchReadme, type Readme } from '@/lib/readme'
import { useReadme } from './use-readme'
import type { Repo } from '@/types/github'

vi.mock('@/lib/readme', () => ({ fetchReadme: vi.fn() }))

const load = vi.mocked(fetchReadme)

const repo = (fullName: string) =>
  ({ id: 1, full_name: fullName, owner: { login: fullName.split('/')[0] } }) as Repo

const REPO = repo('acme/tool')
const README: Readme = { markdown: '# Tool', media: null }

/** A promise the test resolves by hand, to hold the fetch open mid-assertion. */
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

beforeEach(() => {
  load.mockReset()
})

describe('useReadme', () => {
  it('fetches nothing while disabled', () => {
    const { result } = renderHook(() => useReadme(REPO, false))

    expect(load).not.toHaveBeenCalled()
    expect(result.current).toEqual({ readme: null, loading: false, settled: false })
  })

  it('loads once enabled, reporting loading until the README lands', async () => {
    const pending = deferred<Readme | null>()
    load.mockReturnValue(pending.promise)

    const { result } = renderHook(() => useReadme(REPO, true))

    expect(load).toHaveBeenCalledExactlyOnceWith(REPO)
    expect(result.current).toEqual({ readme: null, loading: true, settled: false })

    await act(async () => {
      pending.resolve(README)
    })

    expect(result.current).toEqual({ readme: README, loading: false, settled: true })
  })

  it('starts fetching when enabled flips from false to true', async () => {
    load.mockResolvedValue(README)

    const { rerender, result } = renderHook(({ on }) => useReadme(REPO, on), {
      initialProps: { on: false },
    })
    expect(load).not.toHaveBeenCalled()

    rerender({ on: true })

    await waitFor(() => expect(result.current.readme).toEqual(README))
    expect(load).toHaveBeenCalledOnce()
  })

  it('keeps a repository with no README as null without retrying', async () => {
    load.mockResolvedValue(null)

    const { rerender, result } = renderHook(() => useReadme(REPO, true))
    await waitFor(() => expect(result.current.loading).toBe(false))

    rerender()

    expect(result.current.readme).toBeNull()
    // Still one call: a null result is an answer, not a reason to try again.
    expect(load).toHaveBeenCalledOnce()
  })

  // The gap this hook exists to close: `loading` is raised by an effect, which
  // runs after the first paint, so on the render that decides the layout it is
  // still false and readme is still null — indistinguishable from "no README".
  // `settled` is false throughout, which is the answer a caller needs.
  it('reports unsettled from the very first render, before the effect runs', () => {
    const pending = deferred<Readme | null>()
    load.mockReturnValue(pending.promise)

    const { result } = renderHook(() => useReadme(REPO, true))
    expect(result.current.settled).toBe(false)
  })

  it('settles a repository with no README, so held space can be released', async () => {
    load.mockResolvedValue(null)

    const { result } = renderHook(() => useReadme(REPO, true))
    await waitFor(() => expect(result.current.settled).toBe(true))

    // Settled and empty is a real answer, and a different one from "not asked".
    expect(result.current.readme).toBeNull()
    expect(result.current.loading).toBe(false)
  })

  it('discards a slow result for a repository the hook has already moved off', async () => {
    const first = deferred<Readme | null>()
    const second = deferred<Readme | null>()
    load.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const SECOND: Readme = { markdown: '# Other', media: null }

    const { rerender, result } = renderHook(({ r }) => useReadme(r, true), {
      initialProps: { r: REPO },
    })
    rerender({ r: repo('acme/other') })

    await act(async () => {
      second.resolve(SECOND)
      first.resolve(README) // Lands late, for a repository nobody is showing.
    })

    expect(result.current.readme).toEqual(SECOND)
  })
})

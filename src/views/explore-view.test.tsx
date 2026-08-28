// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { ExploreView } from './explore-view'
import { LENSES } from '@/lib/discover-lenses'
import { queryFor } from '@/lib/discover-search'
import { DEFAULT_YEAR } from '@/lib/discover-selection'
import type { Repo } from '@/types/github'

/**
 * The front page fires several unrelated requests on mount. Only the lens
 * teaser is under test here, so every search resolves to the same one
 * repository and everything else fails — the other bands render their own
 * error or empty state and stay out of the way.
 */
const gem: Repo = {
  id: 1,
  name: 'zellij',
  full_name: 'zellij-org/zellij',
  html_url: 'https://github.com/zellij-org/zellij',
  description: 'A terminal workspace',
  owner: { login: 'zellij-org', avatar_url: '', html_url: '' },
  stargazers_count: 900,
  forks_count: 40,
  open_issues_count: 3,
  language: 'Rust',
  license: null,
  created_at: '2024-01-01T00:00:00Z',
  pushed_at: '2026-08-20T00:00:00Z',
}

beforeEach(() => {
  globalThis.fetch = vi.fn((url: string) =>
    url.includes('/search/repositories')
      ? Promise.resolve({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({ items: [gem], total_count: 1 }),
      })
      : Promise.reject(new Error('offline'))) as unknown as typeof fetch
})

/** The teaser's own band. Every stubbed search returns the same repository, so
 *  assertions have to be scoped to this section rather than the whole page. */
const teaser = async () => {
  const heading = await screen.findByRole('heading', { name: 'Hidden Gems' })
  return within(heading.closest('section')!)
}

it('shows the lens teaser once a token is stored', async () => {
  localStorage.setItem('bx-token', 'ghp_test')

  render(<ExploreView search="" />)

  expect((await teaser()).getByTitle('zellij-org/zellij')).toBeTruthy()
})

it('sends the teaser through to the Discover tab', async () => {
  localStorage.setItem('bx-token', 'ghp_test')

  render(<ExploreView search="" />)

  fireEvent.click((await teaser()).getByRole('button', { name: /All lenses/ }))

  expect(location.hash).toBe('#/discover')
})

it('hides the teaser entirely without a token, rather than teasing a gated tab', async () => {
  render(<ExploreView search="" />)

  // A trending band still renders, so this is not just an empty page.
  expect(await screen.findByRole('heading', { name: 'Trending this week' })).toBeTruthy()
  expect(screen.queryByRole('heading', { name: 'Hidden Gems' })).toBeNull()
})

it('teases the same lens the Discover tab lands on, so the request is shared', async () => {
  // The teaser's whole justification is that its search is the one the tab
  // will make. Pointed at any other lens it silently costs an extra request
  // and the tab no longer opens free.
  localStorage.setItem('bx-token', 'ghp_test')

  render(<ExploreView search="" />)

  await teaser()
  const searches = (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls
    .map((c) => decodeURIComponent(String(c[0])))
    .filter((url) => url.includes('/search/repositories'))
  const landing = queryFor({
    lens: LENSES.gems, year: DEFAULT_YEAR, maintained: false, category: null, topic: null,
  })

  expect(searches.some((url) => url.includes(landing))).toBe(true)
})

it('answers the search box', async () => {
  localStorage.setItem('bx-token', 'ghp_test')

  render(<ExploreView search="nothing-matches-this" />)

  await screen.findByRole('heading', { name: 'Trending this week' })
  expect(screen.queryByRole('heading', { name: 'Hidden Gems' })).toBeNull()
})

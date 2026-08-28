// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { DiscoverView } from './discover-view'
import type { Repo } from '@/types/github'

const repo = (id: number, full_name: string, over: Partial<Repo> = {}): Repo => ({
  id,
  name: full_name.split('/')[1],
  full_name,
  html_url: `https://github.com/${full_name}`,
  description: null,
  owner: { login: full_name.split('/')[0], avatar_url: '', html_url: '' },
  stargazers_count: 400,
  forks_count: 20,
  open_issues_count: 0,
  language: 'Rust',
  license: null,
  created_at: '2025-01-01T00:00:00Z',
  pushed_at: '2026-08-01T00:00:00Z',
  ...over,
})

/**
 * Search paths only. The spotlight above the results reads the Explore feed
 * from a CDN, which costs no API budget, so counting it here would make every
 * request-count assertion wrong by one.
 */
let paths: string[] = []

function stubSearch(items: Repo[]) {
  paths = []
  globalThis.fetch = vi.fn((url: string) => {
    const isSearch = url.includes('/search/repositories')
    if (isSearch) paths.push(url.replace('https://api.github.com', ''))
    return Promise.resolve({
      ok: true,
      status: 200,
      headers: new Headers(),
      // The feed shape for the spotlight, the search shape for everything else.
      json: async () => (isSearch
        ? { items, total_count: items.length }
        : { topics: [], collections: [] }),
    })
  }) as unknown as typeof fetch
}

beforeEach(() => {
  localStorage.clear()
  stubSearch([repo(1, 'zellij-org/zellij'), repo(2, 'sharkdp/fd')])
})

it('renders the default lens when the route names none', async () => {
  render(<DiscoverView lens={null} search="" />)

  expect(await screen.findByTitle('zellij-org/zellij')).toBeTruthy()
  // Hidden Gems is the landing lens, and it sorts by push date.
  expect(paths[0]).toContain('sort=updated')
})

it('runs the lens the route names', async () => {
  render(<DiscoverView lens="gold" search="" />)

  await screen.findByTitle('zellij-org/zellij')
  expect(paths[0]).toContain(encodeURIComponent('created:<2018-01-01'))
})

it('falls back to the default lens rather than blanking on an unknown slug', async () => {
  render(<DiscoverView lens="nonsense" search="" />)

  expect(await screen.findByTitle('zellij-org/zellij')).toBeTruthy()
})

it('spends exactly one search request per lens view', async () => {
  render(<DiscoverView lens="fresh" search="" />)

  await screen.findByTitle('zellij-org/zellij')
  expect(paths).toHaveLength(1)
})


it('filters in memory, without spending another request', async () => {
  render(<DiscoverView lens="gems" search="zellij" />)

  expect(await screen.findByTitle('zellij-org/zellij')).toBeTruthy()
  expect(screen.queryByTitle('sharkdp/fd')).toBeNull()
  expect(paths).toHaveLength(1)
})

it('drops reading lists the lens is meant to exclude', async () => {
  stubSearch([repo(1, 'sindresorhus/awesome-nodejs', { language: null }), repo(2, 'sharkdp/fd')])

  render(<DiscoverView lens="gems" search="" />)

  expect(await screen.findByTitle('sharkdp/fd')).toBeTruthy()
  expect(screen.queryByTitle('sindresorhus/awesome-nodejs')).toBeNull()
})

it('fans a category out to one search per topic in the bundle', async () => {
  render(<DiscoverView lens="gems:science" search="" />)

  await screen.findByTitle('zellij-org/zellij')
  // Seven topics in the Science bundle; qualifiers cannot be OR-ed into one.
  expect(paths).toHaveLength(7)
  expect(paths.every((p) => p.includes('topic%3A'))).toBe(true)
})

it('narrows a category to one request when a topic is chosen', async () => {
  render(<DiscoverView lens="gems:science:physics" search="" />)

  await screen.findByTitle('zellij-org/zellij')
  expect(paths).toHaveLength(1)
  expect(paths[0]).toContain(encodeURIComponent('topic:physics'))
})

it('offers the topic select only once a category is chosen', async () => {
  const { unmount } = render(<DiscoverView lens="gems" search="" />)
  await screen.findByTitle('zellij-org/zellij')
  expect(screen.queryByText(/All 7 topics/)).toBeNull()
  unmount()

  render(<DiscoverView lens="gems:science" search="" />)

  expect(await screen.findByText(/All 7 topics/)).toBeTruthy()
})


it('offers the year select only on the Class lens, and searches that year', async () => {
  render(<DiscoverView lens="class-2016" search="" />)

  await screen.findByTitle('zellij-org/zellij')
  expect(paths[0]).toContain(encodeURIComponent('created:2016-01-01..2016-12-31'))
  expect(screen.getByText('Class of 2016')).toBeTruthy()
  expect(screen.getByText('Any maintenance state')).toBeTruthy()
})

it('reads the maintained Class mode from the route and adds its query clause', async () => {
  render(<DiscoverView lens="class-2016-maintained" search="" />)

  await screen.findByTitle('zellij-org/zellij')
  expect(paths[0]).toMatch(/pushed%3A%3E\d{4}-\d{2}-\d{2}/)
  expect(screen.getByText('Still maintained')).toBeTruthy()
})


it('badges an archived repository, which nothing else on the card says', async () => {
  stubSearch([repo(1, 'vuejs/vue', { archived: true })])

  render(<DiscoverView lens="giants" search="" />)

  expect(await screen.findByText('Archived')).toBeTruthy()
})

it('opens a random result without spending a request', async () => {
  render(<DiscoverView lens="gems" search="" />)
  await screen.findByTitle('zellij-org/zellij')
  const before = paths.length

  fireEvent.click(screen.getByRole('button', { name: /Surprise me/ }))

  // The quickview renders the chosen repository's name as a heading.
  expect(await screen.findByRole('dialog')).toBeTruthy()
  expect(paths).toHaveLength(before)
})

it('refetches when only the year changes, though the lens slug does not', async () => {
  // Class is the one lens whose parameter rides inside its own slug, so the
  // fetch has to depend on the resolved query. Keyed on the slug alone this
  // stays on 2018's results under a 2016 heading.
  const { rerender } = render(<DiscoverView lens="class-2018" search="" />)
  await screen.findByTitle('zellij-org/zellij')

  rerender(<DiscoverView lens="class-2016" search="" />)

  await vi.waitFor(() =>
    expect(paths.some((p) => p.includes(encodeURIComponent('created:2016-01-01')))).toBe(true))
})

it('closes a surprise pick when the results behind it change', async () => {
  const { rerender } = render(<DiscoverView lens="gems" search="" />)
  await screen.findByTitle('zellij-org/zellij')
  fireEvent.click(screen.getByRole('button', { name: /Surprise me/ }))
  expect(await screen.findByRole('dialog')).toBeTruthy()

  rerender(<DiscoverView lens="fresh" search="" />)

  // Otherwise a repository from the old lens floats over the new results.
  await vi.waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
})

it('says so when part of a category could not be fetched', async () => {
  globalThis.fetch = vi.fn((url: string) => {
    const q = decodeURIComponent(new URL(url).searchParams.get('q') ?? '')
    if (q.includes('topic:physics')) return Promise.reject(new Error('Rate limit reached'))
    const isSearch = url.includes('/search/repositories')
    return Promise.resolve({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => (isSearch
        ? { items: [repo(1, 'zellij-org/zellij')], total_count: 1 }
        : { topics: [], collections: [] }),
    })
  }) as unknown as typeof fetch

  render(<DiscoverView lens="gems:science" search="" />)

  expect(await screen.findByText(/1 of 7 topic searches failed/)).toBeTruthy()
  // And the six that worked are still on screen.
  expect(screen.getByTitle('zellij-org/zellij')).toBeTruthy()
})

describe('when a combination genuinely has nothing in it', () => {
  // "Born this week" crossed with a niche topic is empty most weeks. That is
  // arithmetic, not a mistake the reader made, so the notice has to offer a
  // way out rather than telling them their filters matched nothing.
  beforeEach(() => stubSearch([]))

  it('names the lens and the category instead of blaming the filters', async () => {
    render(<DiscoverView lens="fresh:music" search="" />)

    expect(await screen.findByText(/No fresh finds to show in Music & Audio/)).toBeTruthy()
  })

  it('offers to drop the topic, the category, and the lens', async () => {
    render(<DiscoverView lens="fresh:music:midi" search="" />)

    expect(await screen.findByRole('button', { name: /Search all of Music & Audio/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Drop the category/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Try Hidden Gems/ })).toBeTruthy()
  })

  it('actually widens the selection when the way out is taken', async () => {
    render(<DiscoverView lens="fresh:music" search="" />)
    await screen.findByRole('button', { name: /Drop the category/ })

    fireEvent.click(screen.getByRole('button', { name: /Drop the category/ }))

    expect(location.hash).toBe('#/discover/fresh')
  })

  it('does not offer to drop a category that is not set', async () => {
    render(<DiscoverView lens="fresh" search="" />)

    await screen.findByText(/No fresh finds to show/)
    expect(screen.queryByRole('button', { name: /Drop the category/ })).toBeNull()
  })

  it('does not offer the landing lens when it is already the landing lens', async () => {
    render(<DiscoverView lens="gems" search="" />)

    await screen.findByText(/No hidden gems to show/)
    expect(screen.queryByRole('button', { name: /Try Hidden Gems/ })).toBeNull()
  })
})

it('surfaces a failed search instead of rendering an empty grid', async () => {
  globalThis.fetch = vi.fn(() => Promise.reject(new Error('offline'))) as unknown as typeof fetch

  render(<DiscoverView lens="gems" search="" />)

  expect(await screen.findByText('Something went wrong')).toBeTruthy()
})

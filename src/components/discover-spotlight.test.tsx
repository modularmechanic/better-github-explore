// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { DiscoverSpotlight } from './discover-spotlight'
import { AREAS, AREAS_SHOWN } from '@/lib/discover-spotlight'

/** Every collection the areas name, so any period can be filled. */
const collections = AREAS.flatMap((area) => area.collections).map((name) => ({
  name,
  display_name: name,
  content: 'A curated list.',
  image: null,
  created_by: null,
  items: ['a/b', 'c/d', 'e/f', 'g/h'],
}))

let calls: string[] = []

function stubFeed(body: unknown = { topics: [], collections }) {
  calls = []
  globalThis.fetch = vi.fn((url: string) => {
    calls.push(url)
    return Promise.resolve({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => body,
    })
  }) as unknown as typeof fetch
}

beforeEach(() => {
  localStorage.clear()
  stubFeed()
})

/** The area labels currently on screen, deduped. CollectionCard titles are
 *  paragraphs rather than headings, so the area kicker is the stable handle. */
const shownAreas = async () => {
  const els = await screen.findAllByText(
    (_, el) => AREAS.some((a) => a.label === el?.textContent),
  )
  return [...new Set(els.map((el) => el.textContent!))]
}

it('shows one collection for each of several areas, not one subject', async () => {
  render(<DiscoverSpotlight />)

  // The bug this replaced: one global pick meant a whole period of Minecraft.
  expect(await shownAreas()).toHaveLength(AREAS_SHOWN)
})

it('spends no API budget — the feed is a CDN read, not a search', async () => {
  render(<DiscoverSpotlight />)

  await shownAreas()
  expect(calls.every((url) => !url.includes('api.github.com'))).toBe(true)
})

it('still shows a full set of areas after switching cadence', async () => {
  render(<DiscoverSpotlight />)
  await shownAreas()

  fireEvent.click(screen.getByRole('button', { name: 'Monthly' }))

  expect(await shownAreas()).toHaveLength(AREAS_SHOWN)
  expect(localStorage.getItem('bx-spotlight-period')).toBe('monthly')
})

it('remembers the cadence for the next visit', async () => {
  localStorage.setItem('bx-spotlight-period', 'monthly')

  render(<DiscoverSpotlight />)

  expect(await screen.findByText(/different set every month/)).toBeTruthy()
})

it('says which cadence is in force', async () => {
  render(<DiscoverSpotlight />)

  expect(await screen.findByText(/different set every week/)).toBeTruthy()

  fireEvent.click(screen.getByRole('button', { name: 'Monthly' }))

  expect(screen.getByText(/different set every month/)).toBeTruthy()
})

it('renders nothing rather than an error panel when the feed fails', async () => {
  globalThis.fetch = vi.fn(() => Promise.reject(new Error('offline'))) as unknown as typeof fetch

  const { container } = render(<DiscoverSpotlight />)

  await vi.waitFor(() => expect(container.textContent).toBe(''))
})

it('renders nothing when the feed carries no collection it knows', async () => {
  stubFeed({ topics: [], collections: [] })

  const { container } = render(<DiscoverSpotlight />)

  await vi.waitFor(() => expect(container.textContent).toBe(''))
})

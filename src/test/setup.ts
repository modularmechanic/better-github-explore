import { afterEach, vi } from 'vitest'

// Hard stop: any test that reaches for the network fails loudly instead of
// silently hitting api.github.com and flaking on rate limits.
const unmockedNetwork = () =>
  vi.fn(() => {
    throw new Error('unmocked network call in test')
  }) as unknown as typeof fetch

globalThis.fetch = unmockedNetwork()

const isDom = typeof window !== 'undefined'

if (isDom) {
  // Never fires, so useInView stays false and no README fetch is triggered.
  class NoopObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return []
    }
  }
  // jsdom ships neither observer; Base UI's Select needs ResizeObserver.
  window.IntersectionObserver = NoopObserver as unknown as typeof IntersectionObserver
  window.ResizeObserver = NoopObserver as unknown as typeof ResizeObserver
  window.scrollTo = vi.fn() // Pagination calls it; jsdom throws "not implemented".
  // Segmented keeps the active pill in view; jsdom defines no scrollIntoView.
  Element.prototype.scrollIntoView = vi.fn()
}

afterEach(async () => {
  // Restore the guard: tests replace globalThis.fetch, and without this the
  // next test inherits the previous one's mock instead of failing loudly, so a
  // test that forgot to stub would pass on someone else's fixture.
  globalThis.fetch = unmockedNetwork()
  if (typeof localStorage !== 'undefined') localStorage.clear()
  if (isDom) (await import('@testing-library/react')).cleanup()
})

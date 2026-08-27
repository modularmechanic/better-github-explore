// @vitest-environment jsdom
import { act, render, renderHook, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useInView } from './use-in-view'

/** Records every observer the hook creates so tests can drive the callback. */
class StubObserver {
  static instances: StubObserver[] = []
  callback: IntersectionObserverCallback
  options: IntersectionObserverInit | undefined
  observed: Element[] = []
  disconnected = false

  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.callback = callback
    this.options = options
    StubObserver.instances.push(this)
  }

  observe(element: Element) {
    this.observed.push(element)
  }
  unobserve() {}
  disconnect() {
    this.disconnected = true
  }
  takeRecords() {
    return []
  }
}

const latest = () => StubObserver.instances.at(-1)!

const intersect = (isIntersecting: boolean) =>
  act(() => {
    const observer = latest()
    observer.callback(
      [{ isIntersecting } as IntersectionObserverEntry],
      observer as unknown as IntersectionObserver,
    )
  })

function Probe() {
  const { ref, inView } = useInView<HTMLDivElement>()
  return <div ref={ref}>{String(inView)}</div>
}

const shown = () => screen.getByText(/^(true|false)$/).textContent

beforeEach(() => {
  StubObserver.instances = []
  window.IntersectionObserver = StubObserver as unknown as typeof IntersectionObserver
})

describe('useInView', () => {
  it('observes the element with a 200px margin so work starts just before it is visible', () => {
    render(<Probe />)

    expect(shown()).toBe('false')
    expect(latest().observed).toEqual([screen.getByText('false')])
    expect(latest().options).toEqual({ rootMargin: '200px' })
  })

  it('flips to true once the element intersects', () => {
    render(<Probe />)

    intersect(true)

    expect(shown()).toBe('true')
  })

  it('stops observing after the first sighting, so it never flips back', () => {
    render(<Probe />)

    intersect(true)

    expect(StubObserver.instances).toHaveLength(1)
    expect(latest().disconnected).toBe(true)
  })

  it('stays false while the element is out of view', () => {
    render(<Probe />)

    intersect(false)

    expect(shown()).toBe('false')
    expect(latest().disconnected).toBe(false)
  })

  it('disconnects on unmount', () => {
    const { unmount } = render(<Probe />)

    unmount()

    expect(latest().disconnected).toBe(true)
  })

  it('observes nothing when the ref was never attached to an element', () => {
    renderHook(() => useInView())

    expect(StubObserver.instances).toEqual([])
  })
})

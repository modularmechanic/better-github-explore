// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AsyncGrid } from './async-grid'
import type { AsyncState } from '@/hooks/use-async'

const state = (over: Partial<AsyncState<string[]>>): AsyncState<string[]> => ({
  data: null, error: null, loading: false, ...over,
})

const list = (items: string[]) => items.map((item) => <span key={item}>{item}</span>)

describe('AsyncGrid', () => {
  it('shows placeholder skeletons while loading', () => {
    const { container } = render(
      <AsyncGrid state={state({ loading: true })} skeletonCount={4}>{list}</AsyncGrid>,
    )
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBe(4)
  })

  it('shows the failure notice with the message', () => {
    render(<AsyncGrid state={state({ error: 'API rate limit exceeded' })}>{list}</AsyncGrid>)
    expect(screen.getByText('Something went wrong')).toBeTruthy()
    expect(screen.getByText('API rate limit exceeded')).toBeTruthy()
  })

  it('shows the empty message for no results', () => {
    const { unmount } = render(<AsyncGrid state={state({ data: [] })}>{list}</AsyncGrid>)
    expect(screen.getByText('Nothing matched.')).toBeTruthy()
    unmount()

    render(<AsyncGrid state={state({ data: [] })} emptyMessage="No topics yet">{list}</AsyncGrid>)
    expect(screen.getByText('No topics yet')).toBeTruthy()
  })

  it('renders the children for data', () => {
    const { container } = render(
      <AsyncGrid state={state({ data: ['react', 'vite'] })}>{list}</AsyncGrid>,
    )
    expect(screen.getByText('react')).toBeTruthy()
    expect(screen.getByText('vite')).toBeTruthy()
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBe(0)
  })

  // Error wins over data so a stale list is never passed off as fresh.
  it('prefers the error over leftover data', () => {
    render(<AsyncGrid state={state({ data: ['react'], error: 'boom' })}>{list}</AsyncGrid>)
    expect(screen.queryByText('react')).toBe(null)
    expect(screen.getByText('boom')).toBeTruthy()
  })
})

// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ErrorBoundary } from './error-boundary'

function Boom({ throws }: { throws: boolean }): React.ReactNode {
  if (throws) throw new Error('language is not defined')
  return <p>the view</p>
}

describe('ErrorBoundary', () => {
  // React logs every caught error itself, on top of our componentDidCatch, so
  // the suite would otherwise print two stacks per assertion.
  beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}))
  afterEach(() => vi.restoreAllMocks())

  it('renders its children when nothing throws', () => {
    render(<ErrorBoundary><Boom throws={false} /></ErrorBoundary>)
    expect(screen.getByText('the view')).toBeTruthy()
  })

  // The whole point: a throw must not take the tree down to a blank page.
  it('shows the failure instead of unmounting the tree', () => {
    render(<ErrorBoundary><Boom throws /></ErrorBoundary>)
    expect(screen.getByText('This section could not be displayed')).toBeTruthy()
    expect(screen.queryByText('the view')).toBe(null)
  })

  // A missing field usually names itself, so the message is the useful half.
  it('surfaces the error message, not just a generic notice', () => {
    render(<ErrorBoundary><Boom throws /></ErrorBoundary>)
    expect(screen.getByText('language is not defined')).toBeTruthy()
  })

  it('leaves the error in the console for whoever debugs it', () => {
    render(<ErrorBoundary><Boom throws /></ErrorBoundary>)
    expect(vi.mocked(console.error).mock.calls.some(
      ([first]) => typeof first === 'string' && first.includes('Render error caught by boundary'),
    )).toBe(true)
  })

  it('recovers when Try again is pressed and the child no longer throws', () => {
    // Same element identity across renders, so only the boundary's own state
    // decides what is shown — this is a retry, not a remount.
    const { rerender } = render(<ErrorBoundary><Boom throws /></ErrorBoundary>)
    expect(screen.getByText('This section could not be displayed')).toBeTruthy()

    rerender(<ErrorBoundary><Boom throws={false} /></ErrorBoundary>)
    fireEvent.click(screen.getByText('Try again'))
    expect(screen.getByText('the view')).toBeTruthy()
  })

  // App gives the boundary a key of the current route. Changing it remounts,
  // which is what stops a caught error bleeding into the next tab.
  it('drops a caught error when its key changes', () => {
    const { rerender } = render(
      <ErrorBoundary key="topics"><Boom throws /></ErrorBoundary>,
    )
    expect(screen.getByText('This section could not be displayed')).toBeTruthy()

    rerender(<ErrorBoundary key="events"><Boom throws={false} /></ErrorBoundary>)
    expect(screen.getByText('the view')).toBeTruthy()
    expect(screen.queryByText('This section could not be displayed')).toBe(null)
  })
})

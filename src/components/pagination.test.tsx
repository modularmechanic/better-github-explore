// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { Pagination } from './pagination'

const prev = () => screen.getByRole('button', { name: 'Previous page' })
const next = () => screen.getByRole('button', { name: 'Next page' })
const scrollTo = () => vi.mocked(window.scrollTo)

beforeEach(() => scrollTo().mockClear())

describe('Pagination', () => {
  it('renders nothing for a single page with no page-size control', () => {
    const { container } = render(<Pagination page={1} totalPages={1} onPage={vi.fn()} />)
    expect(container.innerHTML).toBe('')
  })

  it('still renders on a single page when a page-size control is offered', () => {
    render(
      <Pagination page={1} totalPages={1} onPage={vi.fn()} pageSize={25} onPageSize={vi.fn()} />,
    )
    expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeTruthy()
    expect(screen.getByText('25 per page')).toBeTruthy()
  })

  it('disables Previous on the first page and Next on the last', () => {
    const { rerender } = render(<Pagination page={1} totalPages={3} onPage={vi.fn()} />)
    expect(prev().hasAttribute('disabled')).toBe(true)
    expect(next().hasAttribute('disabled')).toBe(false)

    rerender(<Pagination page={3} totalPages={3} onPage={vi.fn()} />)
    expect(prev().hasAttribute('disabled')).toBe(false)
    expect(next().hasAttribute('disabled')).toBe(true)
  })

  it('steps the page and shows the position', () => {
    const onPage = vi.fn()
    render(<Pagination page={2} totalPages={5} onPage={onPage} />)
    expect(screen.getByText('Page 2 of 5')).toBeTruthy()

    fireEvent.click(next())
    expect(onPage).toHaveBeenCalledWith(3)

    fireEvent.click(prev())
    expect(onPage).toHaveBeenCalledWith(1)
  })

  it('scrolls to the top by default and not when opted out', () => {
    const { unmount } = render(<Pagination page={1} totalPages={5} onPage={vi.fn()} />)
    fireEvent.click(next())
    expect(scrollTo()).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
    unmount()

    scrollTo().mockClear()
    render(<Pagination page={1} totalPages={5} onPage={vi.fn()} scrollToTop={false} />)
    fireEvent.click(next())
    expect(scrollTo()).not.toHaveBeenCalled()
  })

  it('changing the page size reports it and returns to page 1', () => {
    const onPage = vi.fn()
    const onPageSize = vi.fn()
    render(
      <Pagination page={4} totalPages={9} onPage={onPage} pageSize={25} onPageSize={onPageSize} />,
    )

    fireEvent.click(screen.getByRole('combobox'))
    // Base UI commits a selection on Enter; a bare click needs the full
    // pointerdown/up dance that jsdom does not synthesise.
    fireEvent.keyDown(screen.getByRole('option', { name: '50 per page' }), { key: 'Enter' })

    expect(onPageSize).toHaveBeenCalledWith(50)
    expect(onPage).toHaveBeenCalledWith(1)
  })
})

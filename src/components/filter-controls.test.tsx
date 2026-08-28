// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { Segmented, type Option } from './filter-controls'

const LENSES: Option<string>[] = [
  { value: 'gems', label: 'Hidden Gems' },
  { value: 'rising', label: 'Rising Stars' },
  { value: 'class', label: 'Class of…' },
]

beforeEach(() => vi.clearAllMocks())

it('brings the active option into view, so a deep link is not scrolled past it', () => {
  // The rail scrolls rather than wrapping, so a lens selected by URL could sit
  // hundreds of pixels off-screen with nothing else on the page naming it.
  render(<Segmented value="class" options={LENSES} onChange={() => {}} />)

  expect(Element.prototype.scrollIntoView).toHaveBeenCalled()
})

it('scrolls again when the selection changes', () => {
  const { rerender } = render(<Segmented value="gems" options={LENSES} onChange={() => {}} />)
  vi.mocked(Element.prototype.scrollIntoView).mockClear()

  rerender(<Segmented value="class" options={LENSES} onChange={() => {}} />)

  expect(Element.prototype.scrollIntoView).toHaveBeenCalledTimes(1)
})

it('still reports the chosen option to its caller', () => {
  const onChange = vi.fn()
  render(<Segmented value="gems" options={LENSES} onChange={onChange} />)

  fireEvent.click(screen.getByRole('button', { name: 'Rising Stars' }))

  expect(onChange).toHaveBeenCalledWith('rising')
})

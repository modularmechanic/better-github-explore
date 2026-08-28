// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { AppHeader } from './app-header'

beforeEach(() => {
  localStorage.clear()
  globalThis.fetch = vi.fn(() => Promise.reject(new Error('offline'))) as unknown as typeof fetch
})
afterEach(() => { location.hash = '' })

const burger = () => screen.getByRole('button', { name: 'Sections' })

const openMenu = () => fireEvent.click(burger())

it('names the current section on the burger, so the phone header says where you are', () => {
  render(<AppHeader tab="discover" search="" onSearchChange={() => {}} />)

  expect(burger().textContent).toContain('Discover')
})

it('lists every visible section once opened', () => {
  render(<AppHeader tab="explore" search="" onSearchChange={() => {}} />)

  openMenu()

  const items = screen.getAllByRole('menuitem')
  // No token: You and Discover are gated out, six remain.
  expect(items.map((i) => i.textContent?.trim())).toEqual([
    'Explore', 'Trending', 'Topics', 'Collections', 'Events', 'Sponsors',
  ])
})

it('offers the token-only sections once a token is stored', () => {
  localStorage.setItem('bx-token', 'ghp_test')

  render(<AppHeader tab="explore" search="" onSearchChange={() => {}} />)
  openMenu()

  const labels = screen.getAllByRole('menuitem').map((i) => i.textContent?.trim())
  expect(labels).toContain('You')
  expect(labels).toContain('Discover')
})

it('navigates when a section is chosen', () => {
  render(<AppHeader tab="explore" search="" onSearchChange={() => {}} />)
  openMenu()

  fireEvent.click(screen.getByRole('menuitem', { name: 'Topics' }))

  expect(location.hash).toBe('#/topics')
})

it('closes after choosing, so the list is not left over the page', () => {
  render(<AppHeader tab="explore" search="" onSearchChange={() => {}} />)
  openMenu()

  fireEvent.click(screen.getByRole('menuitem', { name: 'Events' }))

  expect(screen.queryByRole('menu')).toBeNull()
})

it('closes when the page behind it is tapped', () => {
  render(<AppHeader tab="explore" search="" onSearchChange={() => {}} />)
  openMenu()

  // By slot, not by [aria-hidden]: every lucide icon carries that attribute,
  // and the burger's own icon comes first in the document — clicking it closed
  // the menu through the trigger and made this test pass without a backdrop.
  const backdrop = document.querySelector('[data-slot="nav-backdrop"]')
  expect(backdrop).not.toBeNull()
  fireEvent.click(backdrop!)

  expect(screen.queryByRole('menu')).toBeNull()
})

it('covers the viewport with the backdrop, not just the blurred header', () => {
  // A backdrop-filter ancestor becomes the containing block for fixed children,
  // so an in-place backdrop shrank to the header and left the menu untappable.
  render(<AppHeader tab="explore" search="" onSearchChange={() => {}} />)
  openMenu()

  expect(document.querySelector('[data-slot="nav-backdrop"]')?.parentElement).toBe(document.body)
})

it('keeps the desktop tab strip in the markup for wider viewports', () => {
  // The burger replaces it below `sm` by CSS, not by unmounting — one render
  // tree serves both, so a resize needs no remount.
  render(<AppHeader tab="explore" search="" onSearchChange={() => {}} />)

  expect(screen.getByRole('tab', { name: /Explore/ })).toBeTruthy()
})

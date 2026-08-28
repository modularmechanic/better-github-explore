// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'

// Every view fetches on mount. Rejecting is the harshest boot: if a bad import,
// a hook-order slip or an unguarded deref ships, this render throws.
beforeEach(() => {
  globalThis.fetch = vi.fn(() => Promise.reject(new Error('offline'))) as unknown as typeof fetch
  location.hash = ''
})

it('boots with the shell rendered even when every request fails', () => {
  render(<App />)

  expect(screen.getByRole('link', { name: /Better GitHub Explore/ })).toBeTruthy()
  expect(screen.getByRole('tab', { name: 'Explore' })).toBeTruthy()
})

it('renders the routed view named by the hash', () => {
  location.hash = '#/topics'
  render(<App />)

  expect(screen.getByRole('tab', { name: 'Topics', selected: true })).toBeTruthy()
})

it('hides the You tab when no token is stored', () => {
  render(<App />)

  expect(screen.queryByRole('tab', { name: 'You' })).toBeNull()
})

it('shows the You tab when a token is stored', () => {
  localStorage.setItem('bx-token', 'ghp_test')

  render(<App />)

  expect(screen.getByRole('tab', { name: 'You' })).toBeTruthy()
})

it('falls back to Explore for #/you without a token', () => {
  location.hash = '#/you'
  render(<App />)

  expect(screen.getByRole('tab', { name: 'Explore', selected: true })).toBeTruthy()
})

// Discover is gated for a different reason than You — a product decision
// rather than an account read — so it gets the same three checks rather than
// riding on the You tab's.
it('hides the Discover tab when no token is stored', () => {
  render(<App />)

  expect(screen.queryByRole('tab', { name: 'Discover' })).toBeNull()
})

it('shows the Discover tab when a token is stored', () => {
  localStorage.setItem('bx-token', 'ghp_test')

  render(<App />)

  expect(screen.getByRole('tab', { name: 'Discover' })).toBeTruthy()
})

it('falls back to Explore for a bookmarked #/discover without a token', () => {
  location.hash = '#/discover'
  render(<App />)

  expect(screen.getByRole('tab', { name: 'Explore', selected: true })).toBeTruthy()
})

it('routes #/discover to the Discover view once a token is stored', () => {
  // Guards the App.tsx branch itself: without it the tab renders empty.
  localStorage.setItem('bx-token', 'ghp_test')
  location.hash = '#/discover'

  render(<App />)

  expect(screen.getByRole('tab', { name: 'Discover', selected: true })).toBeTruthy()
  expect(screen.getByRole('heading', { name: 'Discover' })).toBeTruthy()
})

it('hands a lens slug through to the Discover view rather than dropping the param', () => {
  localStorage.setItem('bx-token', 'ghp_test')
  location.hash = '#/discover/gold'

  render(<App />)

  // App's job is routing the param to the view; which lens that names is the
  // view's own test, where the issued query can be read off the request.
  expect(screen.getByRole('tab', { name: 'Discover', selected: true })).toBeTruthy()
  expect(screen.getByRole('heading', { name: 'Discover' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Old But Gold' })).toBeTruthy()
})

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

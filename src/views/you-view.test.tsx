// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { YouView } from './you-view'
import type { Owner, Repo, Viewer } from '@/types/github'

const you: Viewer = {
  login: 'octo',
  name: 'Octo',
  avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4',
  html_url: 'https://github.com/octo',
  bio: 'Builds things',
  company: null,
  location: null,
  public_repos: 12,
  followers: 34,
  following: 56,
}

const repo = (id: number, full_name: string): Repo => ({
  id,
  name: full_name.split('/')[1],
  full_name,
  html_url: `https://github.com/${full_name}`,
  description: null,
  owner: { login: full_name.split('/')[0], avatar_url: '', html_url: '' },
  stargazers_count: 1,
  forks_count: 0,
  open_issues_count: 0,
  language: null,
  license: null,
  created_at: '2024-01-01T00:00:00Z',
  pushed_at: '2024-06-01T00:00:00Z',
})

const person: Owner = { login: 'mona', avatar_url: '', html_url: 'https://github.com/mona' }

/**
 * The four `/user/*` reads resolve independently, so the stub routes by path
 * rather than by call order — `useAsync` fires them in one commit and the order
 * they settle in is not something this view controls.
 */
function stubRoutes(routes: Record<string, unknown>) {
  globalThis.fetch = vi.fn((url: string) => {
    const path = url.replace('https://api.github.com', '')
    const body = routes[path]
    return Promise.resolve({
      ok: body !== undefined,
      status: body === undefined ? 404 : 200,
      headers: new Headers(),
      json: async () => body ?? { message: 'Not Found' },
    })
  }) as unknown as typeof fetch
}

const ALL = {
  '/user': you,
  '/user/subscriptions?per_page=100': [repo(1, 'octo/watched-thing')],
  '/user/starred?per_page=100': [repo(2, 'octo/starred-thing')],
  '/user/following?per_page=100': [person],
}

beforeEach(() => stubRoutes(ALL))

it('renders the profile hero and all three sections', async () => {
  render(<YouView search="" />)

  expect(await screen.findByText('Octo')).toBeTruthy()
  expect(screen.getByText('Builds things')).toBeTruthy()

  // RepoCard renders a title-cased headline; the raw name is the link's title.
  expect(await screen.findByTitle('octo/watched-thing')).toBeTruthy()
  expect(await screen.findByTitle('octo/starred-thing')).toBeTruthy()
  expect(await screen.findByText('mona')).toBeTruthy()
})

it('narrows every section with the search prop', async () => {
  render(<YouView search="watched" />)

  expect(await screen.findByTitle('octo/watched-thing')).toBeTruthy()
  // The starred repo and the followed user both fail the filter, so their
  // sections fall through to AsyncGrid's empty notice rather than disappearing.
  expect(screen.queryByTitle('octo/starred-thing')).toBeNull()
  expect(screen.queryByText('mona')).toBeNull()
})

it('surfaces a failed profile read without hiding the lists', async () => {
  stubRoutes({ ...ALL, '/user': undefined })
  render(<YouView search="" />)

  expect(await screen.findByText('Could not load your profile')).toBeTruthy()
  expect(await screen.findByTitle('octo/watched-thing')).toBeTruthy()
})

it('renders error notices instead of throwing when every request fails', async () => {
  globalThis.fetch = vi.fn(() => Promise.reject(new Error('offline'))) as unknown as typeof fetch

  render(<YouView search="" />)

  expect(await screen.findByText('Could not load your profile')).toBeTruthy()
  expect(await screen.findAllByText('Something went wrong')).toHaveLength(3)
})

it('shows a plain-words empty message for a viewer who watches nothing', async () => {
  stubRoutes({ ...ALL, '/user/subscriptions?per_page=100': [] })
  render(<YouView search="" />)

  expect(await screen.findByText('You are not watching any public repositories.')).toBeTruthy()
})

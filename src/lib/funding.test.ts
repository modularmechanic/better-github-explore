import { beforeEach, describe, expect, it, vi } from 'vitest'
import { rawFile } from '@/lib/github-api'
import { fetchFunding } from '@/lib/funding'
import type { Repo } from '@/types/github'

vi.mock('@/lib/github-api', () => ({ rawFile: vi.fn() }))

const raw = vi.mocked(rawFile)

const REPO = {
  id: 1,
  name: 'tool',
  full_name: 'acme/tool',
  html_url: 'https://github.com/acme/tool',
  description: null,
  owner: { login: 'acme', avatar_url: '', html_url: '' },
  stargazers_count: 0,
  forks_count: 0,
  open_issues_count: 0,
  language: null,
  license: null,
  created_at: '2024-01-01T00:00:00Z',
  pushed_at: '2024-01-01T00:00:00Z',
} satisfies Repo

const REPO_PATH = 'acme/tool/HEAD/.github/FUNDING.yml'
const ORG_PATH = 'acme/.github/HEAD/FUNDING.yml'

beforeEach(() => {
  raw.mockReset()
})

describe('fetchFunding', () => {
  it('reads the repository-level FUNDING.yml', async () => {
    raw.mockResolvedValueOnce('github: [octocat]\npatreon: octo')

    expect(await fetchFunding(REPO)).toEqual({
      repo: REPO,
      githubLogins: ['octocat'],
      external: [{ platform: 'patreon', url: 'https://patreon.com/octo' }],
    })
    expect(raw).toHaveBeenCalledExactlyOnceWith(REPO_PATH)
  })

  it("falls back to the owner's org-wide .github default", async () => {
    raw.mockResolvedValueOnce(null).mockResolvedValueOnce('github: octocat')

    const funding = await fetchFunding(REPO)

    expect(funding?.githubLogins).toEqual(['octocat'])
    expect(raw.mock.calls).toEqual([[REPO_PATH], [ORG_PATH]])
  })

  it('returns null when neither file exists', async () => {
    raw.mockResolvedValue(null)
    expect(await fetchFunding(REPO)).toBeNull()
  })

  it('returns null when the file parses to nothing fundable', async () => {
    // GitHub's untouched template: every entry is a commented-out placeholder.
    raw.mockResolvedValueOnce('github: # Replace with up to 4 GitHub Sponsors usernames\npatreon:')

    expect(await fetchFunding(REPO)).toBeNull()
  })
})

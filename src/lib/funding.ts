/**
 * Sponsorship data is read from each repository's FUNDING.yml on
 * raw.githubusercontent.com, so scanning many repositories costs nothing
 * against the API rate limit.
 */
import { rawFile } from '@/lib/github-api'
import { parseFunding } from '@/lib/funding-yml'
import type { Funding, Repo } from '@/types/github'

/** Repo-level file first, then the owner's org-wide `.github` default. */
export async function fetchFunding(repo: Repo): Promise<Funding | null> {
  const yaml =
    (await rawFile(`${repo.full_name}/HEAD/.github/FUNDING.yml`)) ??
    (await rawFile(`${repo.owner.login}/.github/HEAD/FUNDING.yml`))
  if (!yaml) return null

  const parsed = parseFunding(yaml)
  if (!parsed.githubLogins.length && !parsed.external.length) return null
  return { repo, ...parsed }
}

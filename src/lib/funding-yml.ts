/**
 * Parser for FUNDING.yml — the file GitHub reads to render a repository's
 * Sponsor button. The format is flat `key: value` / `key: [a, b]`, so a full
 * YAML parser is overkill; the real work is rejecting the commented-out
 * placeholders that GitHub's own template ships with.
 */

export interface FundingLink {
  platform: string
  url: string
}

export interface ParsedFunding {
  githubLogins: string[]
  external: FundingLink[]
}

const PLATFORM_URLS: Record<string, (handle: string) => string> = {
  open_collective: (h) => `https://opencollective.com/${h}`,
  patreon: (h) => `https://patreon.com/${h}`,
  ko_fi: (h) => `https://ko-fi.com/${h}`,
  liberapay: (h) => `https://liberapay.com/${h}`,
  tidelift: (h) => `https://tidelift.com/funding/github/${h}`,
  issuehunt: (h) => `https://issuehunt.io/r/${h}`,
  buy_me_a_coffee: (h) => `https://buymeacoffee.com/${h}`,
  polar: (h) => `https://polar.sh/${h}`,
  thanks_dev: (h) => `https://thanks.dev/${h}`,
  community_bridge: (h) => `https://funding.communitybridge.org/projects/${h}`,
  // No `custom` entry: a custom value is already a URL, so it is used verbatim
  // below rather than run through a builder.
}

/** GitHub's template leaves these behind when a maintainer edits it carelessly. */
const PLACEHOLDERS = /^(user\d|username|your-?username|e\.?g\.?|replace)$/i
const GITHUB_LOGIN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/

export function parseFunding(yaml: string): ParsedFunding {
  const githubLogins = new Set<string>()
  const external = new Map<string, FundingLink>()

  for (const line of yaml.split('\n')) {
    const match = /^\s{0,4}([a-z_]+)\s*:\s*(.*)$/.exec(line)
    if (!match) continue

    const [, key, rawValue] = match
    // Own properties only: a key like __proto__ or constructor would otherwise
    // resolve through the prototype chain and be called as a URL builder.
    const known = Object.hasOwn(PLATFORM_URLS, key)
    if (key !== 'custom' && !known && key !== 'github') continue

    // Drop trailing comments, but only when they follow whitespace so that
    // fragment URLs such as https://example.com/#donate survive.
    const value = rawValue.replace(/\s+#.*$/, '').trim()
    if (!value || value.startsWith('#')) continue

    const handles = value
      .replace(/^\[|\]$/g, '')
      .split(',')
      .map((v) => v.trim().replace(/^['"]|['"]$/g, ''))
      .filter((v) => v && !PLACEHOLDERS.test(v))

    for (const handle of handles) {
      if (key === 'github') {
        if (GITHUB_LOGIN.test(handle)) githubLogins.add(handle)
      } else if (key === 'custom') {
        if (/^https?:\/\/\S+$/.test(handle)) external.set(handle, { platform: 'custom', url: handle })
      } else if (known && !handle.includes(' ')) {
        const url = PLATFORM_URLS[key](handle)
        external.set(url, { platform: key, url })
      }
    }
  }

  return { githubLogins: [...githubLogins], external: [...external.values()] }
}

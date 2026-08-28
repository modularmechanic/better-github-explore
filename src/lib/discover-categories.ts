/**
 * The purpose bundles behind Discover's category filter.
 *
 * A category is ours, not GitHub's: a hand-picked set of GitHub topics that
 * together cover an interest domain. It exists because search qualifiers cannot
 * be OR-ed — `topic:physics OR topic:astronomy` is a 422 — so "Science" has to
 * be assembled from one query per topic and merged in the browser.
 *
 * Every bundle ships its own label. The Explore feed decorates only about half
 * of these topics, so reading names off the feed would leave the rest blank.
 *
 * A bundle carries no star thresholds. Those belong to the lens: Hidden Gems
 * *is* 100–1500 stars, and a category that moved that band would no longer be
 * the lens it claims to be. Categories choose the subject; lenses choose the
 * shape.
 */
import type { Option } from '@/components/filter-controls'

export interface Category {
  slug: string
  label: string
  /**
   * Leads the topic select, and is the one topic a union always includes.
   * Chosen for volume: `design-tools` had barely a hundred repositories above
   * the Hidden Gems floor, where `design` has thousands.
   */
  topics: string[]
  /**
   * Hidden Gems needs a domain-aware floor: AI lists swamp the default band,
   * while useful scientific tools often live below it. Other lenses keep
   * their own thresholds so a category cannot turn Rock Solid into a 20-star
   * search.
   */
  hiddenGemsFloor?: number
}

/** Topic names are GitHub's own, verified to exist and carry real volume. */
export const CATEGORIES: Category[] = [
  {
    slug: 'design',
    label: 'Design & Creative',
    topics: ['design', 'ui-design', 'design-systems', 'icons', 'fonts', 'color-palette', 'svg', 'figma'],
  },
  {
    slug: 'ai',
    label: 'AI & ML',
    topics: ['machine-learning', 'llm', 'deep-learning', 'generative-ai', 'ai-agents', 'nlp', 'computer-vision', 'rag', 'mlops'],
    hiddenGemsFloor: 200,
  },
  {
    slug: 'science',
    label: 'Science',
    topics: ['science', 'bioinformatics', 'physics', 'astronomy', 'chemistry', 'scientific-computing', 'neuroscience'],
    hiddenGemsFloor: 20,
  },
  {
    slug: 'data',
    label: 'Data',
    topics: ['data-science', 'data-visualization', 'data-engineering', 'analytics', 'database', 'sql', 'etl', 'duckdb'],
  },
  {
    slug: 'writing',
    label: 'Writing & Notes',
    topics: ['note-taking', 'markdown', 'static-site-generator', 'blog', 'documentation', 'knowledge-base', 'latex'],
  },
  {
    slug: 'music',
    label: 'Music & Audio',
    topics: ['music', 'audio', 'midi', 'synthesizer', 'music-production', 'dsp', 'music-player'],
  },
  {
    slug: 'gamedev',
    label: 'Game Dev',
    topics: ['game-engine', 'game-development', 'godot', 'pixel-art', 'roguelike', 'shaders', 'procedural-generation'],
  },
  {
    slug: 'selfhosted',
    label: 'Self-Hosted',
    topics: ['self-hosted', 'selfhosted', 'homelab', 'home-automation', 'home-assistant', 'media-server', 'nas'],
  },
  {
    slug: 'devtools',
    label: 'Dev Tools',
    topics: ['developer-tools', 'cli', 'terminal', 'productivity', 'neovim', 'vscode-extension', 'tui'],
  },
  {
    slug: 'education',
    label: 'Education',
    topics: ['education', 'learning', 'language-learning', 'flashcards', 'computer-science', 'typing'],
  },
  {
    slug: 'hardware',
    label: 'Hardware & Making',
    topics: ['embedded', 'arduino', 'raspberry-pi', 'esp32', 'iot', 'robotics', 'firmware', '3d-printing', 'fpga'],
  },
  {
    slug: 'cybersecurity',
    label: 'Cybersecurity',
    topics: ['security', 'cybersecurity', 'penetration-testing', 'cryptography', 'privacy', 'osint', 'reverse-engineering'],
  },
  {
    slug: 'creative-coding',
    label: 'Creative Coding',
    topics: ['creative-coding', 'generative-art', 'webgl', 'threejs', 'shaders', 'p5js', 'rendering'],
  },
  {
    slug: 'finance',
    label: 'Finance',
    topics: ['finance', 'fintech', 'trading', 'algorithmic-trading', 'quantitative-finance', 'accounting', 'invoicing', 'payments'],
  },
  {
    slug: 'crypto',
    label: 'Crypto',
    topics: ['cryptocurrency', 'blockchain', 'bitcoin', 'ethereum', 'defi', 'web3', 'solidity', 'smart-contracts'],
  },
]

const BY_SLUG = new Map(CATEGORIES.map((category) => [category.slug, category]))

/** The category a route segment names, or null for "every subject". */
export const findCategory = (slug: string | null): Category | null =>
  (slug ? BY_SLUG.get(slug) ?? null : null)

export const CATEGORY_OPTIONS: Option<string>[] = [
  { value: 'all', label: 'All categories' },
  ...CATEGORIES.map((category) => ({ value: category.slug, label: category.label })),
]

/**
 * The topic select for one category: every topic in the bundle, plus the
 * "all" entry that unions them. Topic names are shown as GitHub writes them —
 * they are the literal query terms, so dressing them up would misrepresent the
 * search actually being run.
 */
export const topicOptions = (category: Category): Option<string>[] => [
  { value: 'all', label: `All ${category.topics.length} topics` },
  ...category.topics.map((topic) => ({ value: topic, label: topic })),
]

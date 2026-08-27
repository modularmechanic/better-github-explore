/**
 * Shapes for the parts of github.com/topics and github.com/collections that
 * live only in those pages' HTML.
 *
 * The bulk of both sections already comes from explore-feed.github.com — every
 * topic and collection with its description and image. What the feed does NOT
 * carry is GitHub's editorial layer: which topics are *featured*, which are
 * *popular*, and the hero copy at the top of each page. That is what these
 * snapshots add.
 */

/** A topic GitHub features on /topics, with the write-up it shows there. */
export interface FeaturedTopic {
  slug: string
  /** Display name as GitHub writes it, e.g. "Awesome Lists" for `awesome`. */
  name: string
  description: string | null
  /** Absolute image URL, already resolved. */
  image: string | null
}

/** The hero at the top of an Explore page. */
export interface PageHero {
  title: string
  blurb: string
}

/** Snapshot of github.com/topics. */
export interface TopicsPage {
  capturedAt: string
  hero: PageHero
  featured: FeaturedTopic[]
  /** Slugs GitHub lists under "Popular topics", in its order. */
  popular: string[]
}

/** Snapshot of github.com/collections. */
export interface CollectionsPage {
  capturedAt: string
  hero: PageHero
  /** Collection slugs in the order GitHub presents them. */
  order: string[]
}

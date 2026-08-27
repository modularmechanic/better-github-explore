/**
 * "Topics you're into" — a self-contained section mounted on both the Topics
 * and Explore tabs.
 *
 * GitHub exposes no followed-topics API (research/researcher-02-github-topics-graphql.md),
 * so this ranks the topics carried on the repositories the viewer starred or
 * watches (`viewerTopics`) and matches the names against the Explore feed's own
 * `Topic` objects for a logo and a blurb — a bare chip with no description
 * would look broken next to a `TopicCard`. It costs no extra requests: `topics`
 * already rides along in the starred/watched payloads, and `api()` dedupes the
 * `exploreFeed()` call against whatever the host view already fetched.
 *
 * Silent on both loading and failure: the watchlist above it and the charts
 * already report a rejected token, and a third copy of that message is noise.
 */
import { TopicCard } from '@/components/topic-card'
import { ViewerSection } from '@/components/viewer-section'
import { exploreFeed } from '@/lib/github-api'
import { viewerRepos } from '@/lib/github-viewer'
import { matches } from '@/lib/format'
import { viewerTopics } from '@/lib/viewer-topics'
import type { Topic } from '@/types/github'

/**
 * Unmatched names are dropped rather than rendered as bare chips — a card
 * needs a logo and a blurb, and with 1255 feed topics the common ones match.
 */
async function topicsTheViewerIsInto(): Promise<Topic[]> {
  const [repos, feed] = await Promise.all([viewerRepos(), exploreFeed()])
  const known = new Map(feed.topics.map((t) => [t.topic_name, t]))
  return viewerTopics(repos)
    .map((ranked) => known.get(ranked.name))
    .filter((topic): topic is Topic => Boolean(topic))
}

export function ViewerTopicsSection({ search = '', limit = 12 }: { search?: string; limit?: number }) {
  return (
    <ViewerSection
      title="Topics you're into"
      blurb="Derived from the topics on the repositories you star and watch."
      load={topicsTheViewerIsInto}
      // The section answers the search box like every other list on its host
      // page. `limit` is applied AFTER the match, or a few names the feed
      // happens not to carry would eat slots and render a short section.
      select={(topics) =>
        topics
          .filter((t) => matches(search, t.topic_name, t.display_name, t.short_description))
          .slice(0, limit)
      }
      whileLoading="hide"
      onError="hide"
      className="grid-cols-[repeat(auto-fill,minmax(18rem,1fr))]"
    >
      {(topics) => topics.map((t) => <TopicCard key={t.topic_name} topic={t} />)}
    </ViewerSection>
  )
}

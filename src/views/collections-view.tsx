import { useState } from 'react'
import { CollectionCard } from '@/components/collection-card'
import { PageHero } from '@/components/page-hero'
import { ResultList } from '@/components/result-list'
import { ViewerSection } from '@/components/viewer-section'
import { Segmented } from '@/components/filter-controls'
import { Button } from '@/components/ui/button'
import { useAsync } from '@/hooks/use-async'
import { useFavourites } from '@/hooks/use-favourites'
import { useResultList } from '@/hooks/use-result-list'
import { exploreFeed } from '@/lib/github-api'
import { viewerRepos } from '@/lib/github-viewer'
import {
  collectionMatches, collectionOrder, collectionsForViewer, largestIn, rankCollections,
} from '@/lib/collections'
import snapshot from '@/data/collections-page.json'
import type { CollectionsPage } from '@/types/explore-pages'
import type { Collection } from '@/types/github'

/** Hero copy and page order, scraped from github.com/collections at build time. */
const page: CollectionsPage = snapshot

/**
 * Where a new collection actually comes from. github.com/collections has no
 * "create" button of its own — collections are pull requests against
 * github/explore — and the repository README has no `#contributing` heading to
 * anchor to, so this points at the CONTRIBUTING file that does explain it.
 */
const CONTRIBUTE_URL = 'https://github.com/github/explore/blob/main/CONTRIBUTING.md'

const rank = collectionOrder(page.order)

/** Both feeds are cached by `api`, so the overlap section costs no extra request. */
async function collectionsBuiltOnYourStars(): Promise<Collection[]> {
  const [{ collections }, mine] = await Promise.all([exploreFeed(), viewerRepos()])
  return collectionsForViewer(collections, mine)
}

/** How many personalised collections the section shows. */
const FOR_YOU = 4

/**
 * The Collections tab, shaped like github.com/collections: hero and page order
 * from the snapshot, everything else from the Explore feed.
 *
 * The snapshot is a static import, so a *missing* file is a build error rather
 * than something to handle at runtime. An *empty* one degrades cleanly: with no
 * order to apply, `rank` is a constant and the grid falls back to the size
 * ordering this view used before.
 */
export function CollectionsView({ search }: { search: string }) {
  const [favouritesOnly, setFavouritesOnly] = useState(false)
  const { ids: favourites } = useFavourites('collections')
  const state = useAsync(() => exploreFeed().then((f) => f.collections), [])

  const list = useResultList(state, {
    select: (collections) =>
      rankCollections(collections, { search, favourites, favouritesOnly, rank }),
    deps: [search, favouritesOnly, favourites],
  })

  const repoCount = list.items?.reduce((n, c) => n + c.items.length, 0) ?? 0
  // Favourites float to the top of the sort, so the first entry is not the biggest.
  const largest = largestIn(list.items ?? [])

  return (
    <div className="space-y-6">
      <PageHero {...page.hero}>
        <Button
          variant="outline"
          nativeButton={false}
          render={<a href={CONTRIBUTE_URL} target="_blank" rel="noopener noreferrer" />}
        >
          Create collection
        </Button>
      </PageHero>

      {/*
        GitHub has no collections API to personalise against, but the feed
        already gives each collection its repository names and the viewer's
        starred and watched repos are already in hand — so the overlap is free.
      */}
      <ViewerSection
        title="Built on what you star"
        blurb="Collections that already contain repositories you follow."
        load={collectionsBuiltOnYourStars}
        // Search then cap, in that order and in `select` rather than `load`:
        // capping first would hide a match that ranks fifth by overlap, and
        // re-ranking here would discard the overlap order the section is for.
        select={(found) => found.filter((c) => collectionMatches(c, search)).slice(0, FOR_YOU)}
        deps={[search]}
        whileLoading="hide"
        onError="hide"
        className="grid-cols-[repeat(auto-fill,minmax(18rem,1fr))]"
      >
        {(found) => found.map((c) => (
          <CollectionCard key={c.name} collection={c} largest={largestIn(found)} />
        ))}
      </ViewerSection>

      {/* Kept at space-y-4 so the hero is the only wider gap on the page. */}
      <ResultList
        list={list}
        emptyMessage={favouritesOnly
          ? 'No favourite collections yet — star one to pin it here.'
          : 'No collections match.'}
        summary={`${list.total} collections · ${repoCount} curated repositories`}
        controls={
          <Segmented
            value={favouritesOnly ? 'favourites' : 'all'}
            options={[
              { value: 'all', label: 'All' },
              { value: 'favourites', label: `★ Favourites${favourites.length ? ` (${favourites.length})` : ''}` },
            ]}
            onChange={(v) => setFavouritesOnly(v === 'favourites')}
          />
        }
      >
        {(collections) =>
          collections.map((c) => <CollectionCard key={c.name} collection={c} largest={largest} />)}
      </ResultList>
    </div>
  )
}

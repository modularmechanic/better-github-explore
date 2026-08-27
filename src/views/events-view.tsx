import { useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { FilterSelect, Segmented, type Option } from '@/components/filter-controls'
import { ResourceEventCard } from '@/components/resource-event-card'
import { ResultList } from '@/components/result-list'
import { useResultList } from '@/hooks/use-result-list'
import { timeAgo } from '@/lib/format'
import { eventOptions, filterEvents, type EventWhen } from '@/lib/events'
import feed from '@/data/github-events.json'
import type { ResourceEvent } from '@/types/github'

/**
 * GitHub's events, webinars and workshops — the content behind
 * github.com/resources/events. That page has no API and github.com sends no
 * CORS headers, so the listing is snapshotted at build time by
 * `npm run sync:events` and shipped with the app.
 */
const EVENTS = feed.events as ResourceEvent[]

/** Static data, so there is nothing to load — the list is ready on first render. */
const READY = { data: EVENTS, loading: false, error: null }

const WHEN: Option<EventWhen>[] = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' },
  { value: 'all', label: 'All' },
]

const TYPES = eventOptions(EVENTS, 'type', 'Anywhere')
const REGIONS = eventOptions(EVENTS, 'region', 'Any region')
const TOPICS = eventOptions(EVENTS, 'topic', 'Any topic')

export function EventsView({ search }: { search: string }) {
  const [when, setWhen] = useState<EventWhen>('upcoming')
  const [type, setType] = useState('any')
  const [region, setRegion] = useState('any')
  const [topic, setTopic] = useState('any')

  const list = useResultList(READY, {
    select: (events) => filterEvents(events, { when, type, region, topic, search }),
    deps: [when, type, region, topic, search],
  })

  return (
    <ResultList
      list={list}
      emptyMessage="No events match these filters."
      controls={
        <>
          <Segmented value={when} options={WHEN} onChange={setWhen} />
          <FilterSelect value={type} options={TYPES} onChange={setType} />
          <FilterSelect value={region} options={REGIONS} onChange={setRegion} />
          <FilterSelect value={topic} options={TOPICS} onChange={setTopic} />
        </>
      }
      summary={
        <>
          <CalendarDays className="mr-1 inline size-3" />
          {list.total} of {EVENTS.length} events · snapshotted from
          github.com/resources/events {timeAgo(feed.syncedAt)}
        </>
      }
    >
      {(events) => events.map((event) => <ResourceEventCard key={event.url} event={event} />)}
    </ResultList>
  )
}

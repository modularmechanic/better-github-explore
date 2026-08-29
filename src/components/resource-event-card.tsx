import { useState } from 'react'
import { CalendarDays, ExternalLink, Globe, MapPin, Radio } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { ResourceEvent } from '@/types/github'

/**
 * One clock reading for the whole list, taken when the module loads rather than
 * inside render. `Date.now()` in a render body makes the component impure — two
 * renders of the same event can disagree — and a card reading its own instant
 * can disagree with the card beside it across a date boundary.
 *
 * Deliberately not live. Nothing here re-renders on a timer, the events are a
 * snapshot refreshed every few hours, and an event quietly reclassifying itself
 * mid-session would be stranger than one that waits for a reload.
 */
const LOADED_AT = Date.now()

const formatDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    : 'Available on demand'

/** An event, webinar or workshop from github.com/resources/events. */
export function ResourceEventCard({ event }: { event: ResourceEvent }) {
  const past = event.date ? new Date(event.date).getTime() < LOADED_AT : false
  const InPerson = event.type === 'In Person'
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)

  return (
    <Card className="group flex flex-col gap-0 overflow-hidden p-0 transition-colors hover:border-primary/40">
      {event.image && !failed && (
        // The banner is sized from the snapshot, so nothing moves when it
        // arrives — it only needs to stop appearing all at once. `bg-muted`
        // holds the space visibly and the picture fades over it on decode.
        // Left unwrapped on purpose: Card rounds a direct `img:first-child`.
        //
        // onError drops the banner rather than leaving it: the picture only
        // becomes visible once `loaded` flips, so an image that 404s would
        // otherwise sit there at opacity-0 forever — a blank 160px band with a
        // border under the title, which reads as a broken card.
        <img
          src={`${event.image}?w=720&fm=webp`}
          alt=""
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={cn(
            'h-40 w-full border-b bg-muted object-cover transition duration-300 group-hover:scale-[1.02]',
            loaded ? 'opacity-100' : 'opacity-0',
          )}
        />
      )}

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center gap-2 kicker">
          <span className="flex items-center gap-1.5">
            {InPerson ? <MapPin className="size-3.5" /> : <Globe className="size-3.5" />}
            {event.type ?? 'Event'}
          </span>
          {event.region && <><span aria-hidden>·</span><span>{event.region}</span></>}
          {event.availability === 'On demand' && (
            <Badge variant="secondary" className="ml-auto tracking-normal">On demand</Badge>
          )}
          {event.availability === 'Live' && !past && (
            <Badge className="ml-auto gap-1 tracking-normal">
              <Radio className="size-3" /> Live
            </Badge>
          )}
        </div>

        <a
          href={event.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xl leading-tight font-semibold tracking-tight text-balance text-link underline-offset-4 hover:underline"
        >
          {event.title}
        </a>

        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarDays className="size-3.5" />
          <span className={past ? 'line-through' : undefined}>{formatDate(event.date)}</span>
        </p>

        {event.description && (
          <p className="line-clamp-3 text-base leading-relaxed text-muted-foreground">
            {event.description}
          </p>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-2 border-t pt-3">
          {event.topic && <Badge variant="outline">{event.topic}</Badge>}
          <Button size="sm" variant="secondary" className="ml-auto" nativeButton={false} render={
            <a href={event.url} target="_blank" rel="noopener noreferrer" />
          }>
            {event.cta} <ExternalLink />
          </Button>
        </div>
      </div>
    </Card>
  )
}

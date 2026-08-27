import { CalendarDays, ExternalLink, Globe, MapPin, Radio } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { ResourceEvent } from '@/types/github'

const formatDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    : 'Available on demand'

/** An event, webinar or workshop from github.com/resources/events. */
export function ResourceEventCard({ event }: { event: ResourceEvent }) {
  const past = event.date ? new Date(event.date).getTime() < Date.now() : false
  const InPerson = event.type === 'In Person'

  return (
    <Card className="group flex flex-col gap-0 overflow-hidden p-0 transition-colors hover:border-primary/40">
      {event.image && (
        <img
          src={`${event.image}?w=720&fm=webp`}
          alt=""
          loading="lazy"
          className="h-40 w-full border-b object-cover transition-transform duration-300 group-hover:scale-[1.02]"
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

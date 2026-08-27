import { Hash } from 'lucide-react'
import { FavouriteButton } from '@/components/favourite-button'
import { useFavourites } from '@/hooks/use-favourites'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { exploreAsset, stripHtml } from '@/lib/format'
import { navigate } from '@/hooks/use-hash-route'
import type { Topic } from '@/types/github'

export function TopicCard({ topic }: { topic: Topic }) {
  const { isFavourite, toggle } = useFavourites('topics')
  const description = topic.short_description || stripHtml(topic.content).slice(0, 150)

  return (
    <Card
      className="group flex cursor-pointer flex-col gap-3 p-4 transition-colors hover:border-primary/40"
      onClick={() => navigate('topics', topic.topic_name)}
    >
      <div className="flex items-start gap-3">
        {topic.logo ? (
          <img
            src={exploreAsset('topics', topic.topic_name, topic.logo)}
            alt=""
            loading="lazy"
            className="size-9 shrink-0 rounded-lg bg-white/90 object-contain p-1"
          />
        ) : (
          <div className="grid size-9 shrink-0 place-items-center rounded-lg border text-muted-foreground">
            <Hash className="size-4" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold tracking-tight group-hover:text-primary">
            {topic.display_name || topic.topic_name}
          </p>
          {topic.released && (
            <p className="text-xs text-muted-foreground">released {topic.released}</p>
          )}
        </div>
        <FavouriteButton
          active={isFavourite(topic.topic_name)}
          onToggle={() => toggle(topic.topic_name)}
          label={topic.display_name || topic.topic_name}
        />
      </div>

      {description && <p className="line-clamp-3 text-sm text-muted-foreground">{description}</p>}

      {!!topic.related?.length && (
        <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
          {topic.related.slice(0, 3).map((r) => (
            <Badge key={r} variant="outline" className="text-muted-foreground">{r}</Badge>
          ))}
        </div>
      )}
    </Card>
  )
}

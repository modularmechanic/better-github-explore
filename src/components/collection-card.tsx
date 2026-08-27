import { Layers } from 'lucide-react'
import { FavouriteButton } from '@/components/favourite-button'
import { useFavourites } from '@/hooks/use-favourites'
import { Card } from '@/components/ui/card'
import { exploreAsset, stripHtml } from '@/lib/format'
import { navigate } from '@/hooks/use-hash-route'
import type { Collection } from '@/types/github'

export function CollectionCard({ collection, largest }: { collection: Collection; largest: number }) {
  const { isFavourite, toggle } = useFavourites('collections')

  return (
    <Card
      className="group flex cursor-pointer flex-col gap-3 p-4 transition-colors hover:border-primary/40"
      onClick={() => navigate('collections', collection.name)}
    >
      <div className="flex items-start gap-3">
        {collection.image ? (
          <img
            src={exploreAsset('collections', collection.name, collection.image)}
            alt=""
            loading="lazy"
            className="size-9 shrink-0 rounded-lg bg-white/90 object-contain p-1"
          />
        ) : (
          <div className="grid size-9 shrink-0 place-items-center rounded-lg border text-muted-foreground">
            <Layers className="size-4" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold tracking-tight group-hover:text-primary">
            {collection.display_name || collection.name}
          </p>
          <p className="text-xs text-muted-foreground">
            {collection.items.length} repositories
            {collection.created_by && ` · by ${collection.created_by}`}
          </p>
        </div>
        <FavouriteButton
          active={isFavourite(collection.name)}
          onToggle={() => toggle(collection.name)}
          label={collection.display_name || collection.name}
        />
      </div>

      <p className="line-clamp-3 text-sm text-muted-foreground">{stripHtml(collection.content)}</p>

      {/* Size relative to the largest collection, so the bars compare meaningfully. */}
      <div className="mt-auto h-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-gradient-to-r from-primary to-primary/40"
          style={{ width: `${Math.min(100, Math.round((collection.items.length / Math.max(1, largest)) * 100))}%` }}
        />
      </div>
    </Card>
  )
}

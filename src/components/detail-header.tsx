import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { navigate, type Tab } from '@/hooks/use-hash-route'

/** Shared masthead for topic and collection detail pages. */
export function DetailHeader({
  backTo, backLabel, title, meta, description, children,
}: {
  backTo: Tab
  backLabel: string
  title: string
  meta?: string
  description?: string
  children?: React.ReactNode
}) {
  return (
    <div className="space-y-3">
      <Button variant="ghost" size="sm" className="-ml-2 h-7 text-muted-foreground" onClick={() => navigate(backTo)}>
        <ArrowLeft /> {backLabel}
      </Button>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        {meta && <span className="text-sm text-muted-foreground">{meta}</span>}
        {children}
      </div>
      {description && <p className="max-w-[70ch] text-sm text-muted-foreground">{description}</p>}
    </div>
  )
}

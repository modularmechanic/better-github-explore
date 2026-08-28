import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

export interface Option<T extends string> {
  value: T
  label: string
}

/** Compact button group — used wherever the choices are few and worth showing. */
export function Segmented<T extends string>({
  value, options, onChange,
}: { value: T; options: readonly Option<T>[]; onChange: (value: T) => void }) {
  const active = useRef<HTMLButtonElement>(null)

  // Scrolling the rail means the selection can start off-screen: a deep link to
  // `#/discover/class-2016` put its pill at x=842 in a 351px strip, with nothing
  // else on the page naming the active lens. Options that fit never scroll, so
  // this is inert for the two- and three-option rails.
  useEffect(() => {
    active.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [value])

  return (
    // Scrolls rather than wrapping. Four options fit a phone row and never
    // scroll; the eight-lens rail would otherwise stack into three rows above
    // the results. Unlike the tab strip this keeps its affordance — the next
    // pill sits half-visible at the edge rather than ending flush with it.
    <div className="flex items-center gap-0.5 overflow-x-auto rounded-xl border bg-card p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {options.map((option) => (
        <Button
          key={option.value}
          ref={value === option.value ? active : undefined}
          size="sm"
          variant={value === option.value ? 'secondary' : 'ghost'}
          className={cn('h-8 shrink-0 px-3.5 text-sm', value !== option.value && 'text-muted-foreground')}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  )
}

/** Dropdown for longer option lists (languages, thresholds). */
export function FilterSelect<T extends string>({
  value, options, onChange, className, size = 'default',
}: {
  value: T
  options: readonly Option<T>[]
  onChange: (value: T) => void
  className?: string
  /** "sm" for controls that sit inside a heading row rather than a filter bar. */
  size?: 'sm' | 'default'
}) {
  const labelFor = (v: string) => options.find((o) => o.value === v)?.label ?? v

  return (
    <Select value={value} onValueChange={(v) => onChange(v as T)}>
      <SelectTrigger
        size="sm"
        className={cn('bg-card', size === 'sm' ? 'h-8' : 'h-10 rounded-xl px-3.5 text-sm', className)}
      >
        <SelectValue>{(v: unknown) => labelFor(String(v))}</SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/** Footnote under the results: what is being shown, and the query behind it. */
export function FilterSummary({ children }: { children: React.ReactNode }) {
  return (
    <p className="pt-1 text-center font-mono text-xs break-words text-muted-foreground">{children}</p>
  )
}

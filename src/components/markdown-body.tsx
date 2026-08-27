import { useMemo } from 'react'
import { renderMarkdown } from '@/lib/markdown'
import { resolveLinks } from '@/lib/readme'
import type { Repo } from '@/types/github'

/** Rendered README content. Styling lives in `.markdown-body` in index.css. */
export function MarkdownBody({
  markdown, repo, className = '',
}: { markdown: string; repo: Repo; className?: string }) {
  const html = useMemo(() => renderMarkdown(resolveLinks(markdown, repo)), [markdown, repo])
  return <div className={`markdown-body ${className}`} dangerouslySetInnerHTML={{ __html: html }} />
}

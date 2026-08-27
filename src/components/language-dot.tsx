import { languageColor } from '@/lib/language-colors'

export function LanguageDot({ language }: { language: string | null | undefined }) {
  if (!language) return null
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="size-2.5 rounded-full ring-1 ring-black/10"
        style={{ background: languageColor(language) }}
      />
      {language}
    </span>
  )
}

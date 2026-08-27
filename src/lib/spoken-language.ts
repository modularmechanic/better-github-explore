/**
 * Which human language a repository is written in. GitHub has no such field —
 * `language:` means the programming language — so it is detected from the
 * description with franc, whose trigram model handles one-sentence input.
 */
import { franc } from 'franc-min'
import type { Option } from '@/components/filter-controls'

/** ISO 639-3 codes, the form franc returns. */
export const SPOKEN_LANGUAGES: Option<string>[] = [
  { value: 'any', label: 'Any written language' },
  { value: 'eng', label: 'English' },
  { value: 'cmn', label: 'Chinese' },
  { value: 'spa', label: 'Spanish' },
  { value: 'rus', label: 'Russian' },
  { value: 'jpn', label: 'Japanese' },
  { value: 'deu', label: 'German' },
  { value: 'fra', label: 'French' },
  { value: 'por', label: 'Portuguese' },
  { value: 'kor', label: 'Korean' },
  { value: 'ara', label: 'Arabic' },
  { value: 'ita', label: 'Italian' },
  { value: 'tur', label: 'Turkish' },
  { value: 'ind', label: 'Indonesian' },
  { value: 'hin', label: 'Hindi' },
  { value: 'vie', label: 'Vietnamese' },
]

const cache = new Map<string, string>()

/** Returns an ISO 639-3 code, or `und` when the text is too short to judge. */
export function detectLanguage(text: string | null | undefined): string {
  const input = (text ?? '').trim()
  if (input.length < 12) return 'und'
  const hit = cache.get(input)
  if (hit) return hit
  const code = franc(input)
  cache.set(input, code)
  return code
}

export const matchesLanguage = (text: string | null | undefined, code: string) =>
  code === 'any' || detectLanguage(text) === code

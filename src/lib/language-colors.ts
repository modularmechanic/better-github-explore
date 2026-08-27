/** Language colours, loaded from the same dataset GitHub renders with. */
const FALLBACK = '#8b97a8'
const SOURCE = 'https://raw.githubusercontent.com/ozh/github-colors/master/colors.json'

let colors: Record<string, string> = {}

export async function loadLanguageColors(): Promise<Record<string, string>> {
  if (Object.keys(colors).length) return colors
  try {
    const res = await fetch(SOURCE)
    if (!res.ok) return colors
    const raw = (await res.json()) as Record<string, { color: string | null }>
    colors = Object.fromEntries(
      Object.entries(raw).map(([name, v]) => [name, v.color ?? FALLBACK]),
    )
  } catch {
    // Offline or blocked — every language just falls back to grey.
  }
  return colors
}

export const languageColor = (language: string | null | undefined) =>
  (language && colors[language]) || FALLBACK

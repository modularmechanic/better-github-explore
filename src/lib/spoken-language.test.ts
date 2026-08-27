import { describe, expect, it } from 'vitest'
import { detectLanguage, matchesLanguage, SPOKEN_LANGUAGES } from '@/lib/spoken-language'

// One-sentence repository descriptions, the only text franc ever sees here.
const DESCRIPTIONS = {
  eng: 'A fast and tiny command line tool for building web applications.',
  rus: 'Библиотека для быстрой разработки веб-приложений на языке Python.',
  cmn: '一个用于构建现代化网页应用的轻量级前端框架，支持热更新。',
  jpn: 'ウェブアプリケーションを構築するための軽量なフレームワークです。',
  spa: 'Una biblioteca ligera para construir aplicaciones web modernas y rapidas.',
}

describe('detectLanguage', () => {
  it.each(Object.entries(DESCRIPTIONS))('detects %s from a single sentence', (code, text) => {
    expect(detectLanguage(text)).toBe(code)
  })

  it('gives up on text below the minimum length', () => {
    // franc alone reports "eng" for this; the guard is ours, and it is what
    // stops eleven characters of noise from filtering out a repository.
    expect(detectLanguage('Hello there')).toBe('und')
    expect(detectLanguage('Hello there!')).toBe('eng')
  })

  it('gives up on empty, null and undefined descriptions', () => {
    expect(detectLanguage('')).toBe('und')
    expect(detectLanguage(null)).toBe('und')
    expect(detectLanguage(undefined)).toBe('und')
    expect(detectLanguage('            ')).toBe('und') // Trimmed, so still short.
  })

  it('returns the same code for a repeated description', () => {
    expect(detectLanguage(DESCRIPTIONS.eng)).toBe(detectLanguage(DESCRIPTIONS.eng))
  })
})

describe('matchesLanguage', () => {
  it('matches anything when the filter is "any"', () => {
    expect(matchesLanguage(DESCRIPTIONS.rus, 'any')).toBe(true)
    expect(matchesLanguage('x', 'any')).toBe(true)
    expect(matchesLanguage(null, 'any')).toBe(true)
  })

  it('matches only the detected language otherwise', () => {
    expect(matchesLanguage(DESCRIPTIONS.spa, 'spa')).toBe(true)
    expect(matchesLanguage(DESCRIPTIONS.spa, 'eng')).toBe(false)
    expect(matchesLanguage(null, 'eng')).toBe(false)
  })
})

describe('SPOKEN_LANGUAGES', () => {
  it('offers "any" first and covers every language the tests detect', () => {
    expect(SPOKEN_LANGUAGES[0].value).toBe('any')
    const values = SPOKEN_LANGUAGES.map((o) => o.value)
    for (const code of Object.keys(DESCRIPTIONS)) expect(values).toContain(code)
  })
})

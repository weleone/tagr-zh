import { readFileSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import { AUTOMATIC_LOCALE, defaultLocale, localeNames, locales, negotiateLocale, resolveLocale } from './locale'

describe('negotiateLocale', () => {
  it('falls back to the default locale without a header', () => {
    expect(negotiateLocale(null)).toBe(defaultLocale)
    expect(negotiateLocale('')).toBe(defaultLocale)
  })

  it('matches a regional tag to its base language', () => {
    expect(negotiateLocale('de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7')).toBe('de')
    expect(negotiateLocale('de-AT')).toBe('de')
    expect(negotiateLocale('es-MX')).toBe('es')
    expect(negotiateLocale('fr-CA,fr;q=0.9')).toBe('fr')
  })

  it('respects quality values', () => {
    expect(negotiateLocale('en;q=0.5, de;q=0.9')).toBe('de')
    expect(negotiateLocale('ja-JP,ja;q=0.9,de;q=0.8,en;q=0.7')).toBe('de')
    expect(negotiateLocale('ca-ES,ca;q=0.9,es;q=0.8')).toBe('ca')
  })

  it('falls back when no supported language is requested', () => {
    expect(negotiateLocale('ja-JP,ja;q=0.9')).toBe(defaultLocale)
    expect(negotiateLocale('*')).toBe(defaultLocale)
    expect(negotiateLocale('de;q=0')).toBe(defaultLocale)
  })
})

describe('resolveLocale', () => {
  it('prefers the language the user saved over the browser', () => {
    expect(resolveLocale('de', 'en-US,en;q=0.9')).toBe('de')
    expect(resolveLocale('en', 'de-DE,de;q=0.9')).toBe('en')
  })

  it('follows the browser when the setting is automatic, empty or no longer supported', () => {
    expect(resolveLocale(AUTOMATIC_LOCALE, 'de-DE')).toBe('de')
    expect(resolveLocale(null, 'de-DE')).toBe('de')
    expect(resolveLocale('', 'de-DE')).toBe('de')
    expect(resolveLocale('ja', 'de-DE')).toBe('de')
    expect(resolveLocale(AUTOMATIC_LOCALE, null)).toBe(defaultLocale)
  })

  it('has a display name for every locale', () => {
    expect(Object.keys(localeNames).sort()).toEqual([...locales].sort())
  })
})

type Messages = { [key: string]: string | Messages }

function flatten(messages: Messages, prefix = ''): Record<string, string> {
  return Object.entries(messages).reduce<Record<string, string>>((all, [key, value]) => {
    const name = prefix + key
    return typeof value === 'string' ? { ...all, [name]: value } : { ...all, ...flatten(value, `${name}.`) }
  }, {})
}

function readMessages(locale: string): Record<string, string> {
  return flatten(JSON.parse(readFileSync(path.join(process.cwd(), 'messages', `${locale}.json`), 'utf-8')))
}

// Placeholders like {count} or {songTitle}; the words inside plural branches ("one {# file}") are not placeholders
function placeholders(message: string): string[] {
  const withoutBranches = message.replace(/(=\d+|zero|one|two|few|many|other)\s*\{[^{}]*\}/g, '$1')
  return [...new Set([...withoutBranches.matchAll(/\{(\w+)[,}]/g)].map(match => match[1]))].sort()
}

describe('translations', () => {
  const english = readMessages('en')

  for (const locale of locales.filter(locale => locale !== 'en')) {
    it(`${locale}.json has exactly the same keys as en.json`, () => {
      expect(Object.keys(readMessages(locale)).sort()).toEqual(Object.keys(english).sort())
    })

    it(`${locale}.json keeps every placeholder of en.json`, () => {
      const translated = readMessages(locale)
      for (const [key, message] of Object.entries(english)) {
        expect(placeholders(translated[key] ?? ''), key).toEqual(placeholders(message))
      }
    })
  }
})

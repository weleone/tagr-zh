import { describe, expect, it } from 'vitest'
import {
  buildFilenameItems,
  compileFilenameTemplate,
  parseFilename,
  stripExtension
} from './filename-template'

function compileOk(template: string) {
  const result = compileFilenameTemplate(template)
  expect(result.ok).toBe(true)
  if (!result.ok) throw new Error('expected template to compile')
  return result.template
}

describe('stripExtension', () => {
  it('removes the last extension', () => {
    expect(stripExtension('song.mp3')).toBe('song')
    expect(stripExtension('song.flac')).toBe('song')
    expect(stripExtension('my.song.mp3')).toBe('my.song')
    expect(stripExtension('noext')).toBe('noext')
  })
})

describe('compileFilenameTemplate', () => {
  it('rejects a template without placeholders', () => {
    expect(compileFilenameTemplate('title-album')).toEqual({ ok: false, error: 'noPlaceholder' })
  })

  it('rejects an unknown placeholder', () => {
    expect(compileFilenameTemplate('{title}-{foo}')).toEqual({
      ok: false,
      error: 'unknownField',
      field: 'foo'
    })
  })

  it('accepts a single placeholder', () => {
    expect(compileFilenameTemplate('{title}').ok).toBe(true)
  })
})

describe('parseFilename', () => {
  it('parses the title-album-publisher example', () => {
    const compiled = compileOk('{title}-{album}-{publisher}')
    expect(parseFilename(compiled, '淡韵流声-纯音空间-汽水音乐.mp3')).toEqual({
      title: '淡韵流声',
      album: '纯音空间',
      publisher: '汽水音乐'
    })
  })

  it('parses the qishui title-artist-publisher pattern', () => {
    const compiled = compileOk('{title}-{artist}-{publisher}')
    expect(parseFilename(compiled, '情人2026-Flow子轩-汽水音乐.mp3')).toEqual({
      title: '情人2026',
      artist: 'Flow子轩',
      publisher: '汽水音乐'
    })
  })

  it('parses numbers for numeric fields', () => {
    const compiled = compileOk('{trackNumber} - {title}')
    expect(parseFilename(compiled, '03 - Song.mp3')).toEqual({ trackNumber: 3, title: 'Song' })
  })

  it('skips a numeric field whose segment is not a number', () => {
    const compiled = compileOk('{trackNumber} - {title}')
    expect(parseFilename(compiled, 'A - Song.mp3')).toEqual({ title: 'Song' })
  })

  it('returns null when the name does not match the template', () => {
    const compiled = compileOk('{title}-{album}-{publisher}')
    expect(parseFilename(compiled, 'only-title.mp3')).toBeNull()
  })

  it('lets the last segment run to the end of the name', () => {
    const compiled = compileOk('{title}-{artist}')
    expect(parseFilename(compiled, 'A-B-C.mp3')).toEqual({ title: 'A', artist: 'B-C' })
  })

  it('matches a literal prefix and suffix', () => {
    const compiled = compileOk('Qishui - {title} ({year})')
    expect(parseFilename(compiled, 'Qishui - Song (2024).mp3')).toEqual({ title: 'Song', year: 2024 })
  })
})

describe('buildFilenameItems', () => {
  it('keeps only songs that yield at least one field', () => {
    const compiled = compileOk('{title}-{album}')
    const items = buildFilenameItems(compiled, [
      { id: 1, fileName: 'A-B.mp3' },
      { id: 2, fileName: 'NoSeparator.mp3' },
      { id: 3, fileName: 'C-D.flac' }
    ])
    expect(items).toEqual([
      { songId: 1, metadata: { title: 'A', album: 'B' } },
      { songId: 3, metadata: { title: 'C', album: 'D' } }
    ])
  })
})

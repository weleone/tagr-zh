import type { SongMetadataUpdate } from '@/features/metadata/domain'
import { BULK_EDITABLE_FIELDS, type BulkEditableField } from '@/features/songs/song-fields'

/** Fields a filename template can fill: plain text, plus numbers parsed from the segment. */
export const FILENAME_TEMPLATE_FIELDS = BULK_EDITABLE_FIELDS.filter(
  field => field.type === 'text' || field.type === 'number' || field.type === 'rating'
)

const SUPPORTED_KEYS = new Set<string>(FILENAME_TEMPLATE_FIELDS.map(field => field.key))

const NUMBER_KEYS = new Set<string>(
  FILENAME_TEMPLATE_FIELDS.filter(field => field.type === 'number' || field.type === 'rating').map(
    field => field.key
  )
)

/** The placeholders the modal offers as one-tap inserts, in this order. */
export const FILENAME_TEMPLATE_PRESETS: BulkEditableField[] = [
  'title',
  'artist',
  'album',
  'albumArtist',
  'publisher',
  'year',
  'genre',
  'trackNumber',
  'discNumber',
  'composer'
]

const PLACEHOLDER_RE = /\{([a-zA-Z]+)\}/g

export type FilenameTemplateError = 'noPlaceholder' | 'unknownField'

export interface CompiledFilenameTemplate {
  regex: RegExp
  fields: BulkEditableField[]
}

export type FilenameTemplateResult =
  | { ok: true; template: CompiledFilenameTemplate }
  | { ok: false; error: FilenameTemplateError; field?: string }

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Compile a template such as `{title}-{album}-{publisher}` into a regex.
 * Every placeholder captures one segment; all but the last are non-greedy so a
 * segment keeps only up to the next literal separator (e.g. `-`).
 */
export function compileFilenameTemplate(template: string): FilenameTemplateResult {
  const fields: BulkEditableField[] = []
  let match: RegExpExecArray | null
  PLACEHOLDER_RE.lastIndex = 0
  while ((match = PLACEHOLDER_RE.exec(template)) !== null) {
    const key = match[1]
    if (!SUPPORTED_KEYS.has(key)) {
      return { ok: false, error: 'unknownField', field: key }
    }
    fields.push(key as BulkEditableField)
  }

  if (fields.length === 0) {
    return { ok: false, error: 'noPlaceholder' }
  }

  let pattern = '^'
  let lastIndex = 0
  let fieldIndex = 0
  PLACEHOLDER_RE.lastIndex = 0
  while ((match = PLACEHOLDER_RE.exec(template)) !== null) {
    pattern += escapeRegExp(template.slice(lastIndex, match.index))
    // The last segment runs to the end of the name; earlier ones stop at the next literal.
    pattern += fieldIndex === fields.length - 1 ? '(.+)' : '(.+?)'
    lastIndex = match.index + match[0].length
    fieldIndex++
  }
  pattern += escapeRegExp(template.slice(lastIndex)) + '$'

  return { ok: true, template: { regex: new RegExp(pattern), fields } }
}

/** The file name without its extension (`song.mp3` -> `song`). */
export function stripExtension(fileName: string): string {
  const dot = fileName.lastIndexOf('.')
  return dot > 0 ? fileName.slice(0, dot) : fileName
}

/**
 * Parse one file name with a compiled template. Returns null when the name does
 * not match the template, or when it matches but yields no usable value.
 */
export function parseFilename(
  compiled: CompiledFilenameTemplate,
  fileName: string
): Partial<SongMetadataUpdate> | null {
  const matched = compiled.regex.exec(stripExtension(fileName))
  if (!matched) return null

  const metadata: Partial<SongMetadataUpdate> = {}
  compiled.fields.forEach((field, index) => {
    const raw = (matched[index + 1] ?? '').trim()
    if (!raw) return

    if (NUMBER_KEYS.has(field)) {
      const value = Number(raw)
      if (Number.isFinite(value)) {
        ;(metadata as Record<string, unknown>)[field] = value
      }
      return
    }

    ;(metadata as Record<string, unknown>)[field] = raw
  })

  return Object.keys(metadata).length > 0 ? metadata : null
}

export interface FilenameParseItem {
  songId: number
  metadata: Partial<SongMetadataUpdate>
}

/** Parse every song's file name; only songs that yield at least one field are kept. */
export function buildFilenameItems(
  compiled: CompiledFilenameTemplate,
  songs: Array<{ id: number; fileName: string }>
): FilenameParseItem[] {
  const items: FilenameParseItem[] = []
  for (const song of songs) {
    const metadata = parseFilename(compiled, song.fileName)
    if (metadata) items.push({ songId: song.id, metadata })
  }
  return items
}

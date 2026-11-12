import type { SongMetadataUpdate } from '@/features/metadata/domain'
import { BULK_EDITABLE_FIELDS } from '@/features/songs/song-fields'

/** One song's filename-parsed tags, ready to be written. */
export interface BulkFilenameApplyItem {
  songId: number
  metadata: Partial<SongMetadataUpdate>
}

/** A filename parse only ever fills a handful of songs at a time; cap the batch. */
export const BULK_FILENAME_LIMIT = 500

const ALLOWED_KEYS = new Set<string>(BULK_EDITABLE_FIELDS.map(field => field.key))

export function isValidFilenameApplyItems(items: unknown): items is BulkFilenameApplyItem[] {
  if (!Array.isArray(items) || items.length === 0 || items.length > BULK_FILENAME_LIMIT) {
    return false
  }

  return items.every(item => {
    if (!item || typeof item !== 'object') return false
    const { songId, metadata } = item as Record<string, unknown>
    if (typeof songId !== 'number' || !Number.isInteger(songId)) return false
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return false
    return Object.entries(metadata).every(
      ([key, value]) => ALLOWED_KEYS.has(key) && (typeof value === 'string' || typeof value === 'number')
    )
  })
}

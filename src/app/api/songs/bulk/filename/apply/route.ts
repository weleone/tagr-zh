import { NextResponse } from 'next/server'
import { recordChanges } from '@/features/history/history.service'
import type { SongMetadataUpdate } from '@/features/metadata/domain'
import { rescanSongFileAndSaveIntoDb } from '@/features/metadata/metadata-scan.service'
import { writeMetadataToFile } from '@/features/metadata/metadata-write.service'
import { isValidFilenameApplyItems, type BulkFilenameApplyItem } from '@/features/songs/bulk-filename'
import type { SongWithMetadata } from '@/features/songs/domain'
import { findSongWithMetadata } from '@/features/songs/songs.repository'
import { requireRole } from '@/lib/api/auth-guard'
import { ndjsonStreamResponse, type NdjsonEvent } from '@/lib/ndjson-stream'

interface BulkFilenameApplyBody {
  items: BulkFilenameApplyItem[]
}

export type BulkFilenameApplyResult =
  | { songId: number; ok: true; song: SongWithMetadata }
  | { songId: number; ok: false; error: string }

/**
 * Writes what the filename template parsed: each song gets its own tags, so unlike the plain bulk
 * edit the metadata differs per song.
 */
export async function PATCH(request: Request): Promise<Response> {
  const guard = await requireRole('tagger')
  if (!guard.authorized) return guard.response

  let body: BulkFilenameApplyBody
  try {
    body = (await request.json()) as BulkFilenameApplyBody
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body || !isValidFilenameApplyItems(body.items)) {
    return NextResponse.json({ success: false, error: 'Invalid items' }, { status: 400 })
  }

  const items = body.items
  const changedBy = guard.session.user?.name ?? undefined

  return ndjsonStreamResponse<BulkFilenameApplyResult>(async function* () {
    yield { type: 'start', total: items.length } satisfies NdjsonEvent<BulkFilenameApplyResult>

    for (let i = 0; i < items.length; i++) {
      const { songId, metadata } = items[i]
      let entry: BulkFilenameApplyResult

      try {
        const song = await findSongWithMetadata(songId)
        if (!song) {
          entry = { songId, ok: false, error: 'Song not found' }
        } else {
          const fields = metadata as SongMetadataUpdate
          if (Object.keys(fields).length > 0) {
            await recordChanges(song, fields as Record<string, unknown>, changedBy)
            await writeMetadataToFile(song.filePath, fields)
          }
          entry = { songId, ok: true, song: await rescanSongFileAndSaveIntoDb(songId) }
        }
      } catch (e) {
        console.error(`Bulk filename apply failed for song ${songId}:`, e)
        entry = { songId, ok: false, error: e instanceof Error ? e.message : 'Unknown error' }
      }

      yield { type: 'result', index: i, result: entry }
    }

    yield { type: 'done', resolvedCount: items.length }
  })
}

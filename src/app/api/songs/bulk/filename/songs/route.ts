import { NextResponse } from 'next/server'
import { BulkResolveError, resolveBulkTargetIds } from '@/features/metadata/bulk-resolver.service'
import { BULK_FILENAME_LIMIT } from '@/features/songs/bulk-filename'
import { type BulkTarget } from '@/features/songs/bulk-target'
import { findSongsForFilename } from '@/features/songs/songs.repository'
import { requireRole } from '@/lib/api/auth-guard'

/** The selected songs, resolved on the server so "whole folder" and "whole playlist" work too. */
export async function POST(request: Request) {
  const guard = await requireRole('tagger')
  if (!guard.authorized) return guard.response

  let body: { target?: BulkTarget }
  try {
    body = (await request.json()) as { target?: BulkTarget }
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body?.target) {
    return NextResponse.json({ success: false, error: 'Missing target' }, { status: 400 })
  }

  let songIds: number[]
  try {
    songIds = await resolveBulkTargetIds(body.target, { userId: guard.session.user?.id })
  } catch (e) {
    if (e instanceof BulkResolveError) {
      return NextResponse.json({ success: false, error: e.message }, { status: e.status })
    }
    throw e
  }

  if (songIds.length > BULK_FILENAME_LIMIT) {
    return NextResponse.json(
      { success: false, error: 'tooManySongs', count: songIds.length, limit: BULK_FILENAME_LIMIT },
      { status: 400 }
    )
  }

  const songs = await findSongsForFilename(songIds)

  return NextResponse.json({ success: true, songs })
}

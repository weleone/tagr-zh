import { NextResponse } from 'next/server'
import { BulkResolveError, resolveBulkTargetIds } from '@/features/metadata/bulk-resolver.service'
import { type BulkTarget } from '@/features/songs/bulk-target'
import { findSongsForTransferOut } from '@/features/songs/songs.repository'
import { requireRole } from '@/lib/api/auth-guard'

interface OutListBody {
  target?: BulkTarget
}

/** 每次最多列 500 首，与出库移动的上限一致。 */
const OUT_LIST_LIMIT = 500

/**
 * 出库待移清单：按批量选择解析出歌曲，返回 id / 标题 / 歌手 / 文件名，
 * 供转移弹窗出库页签展示（只显示计数看不出是哪几首）。
 * 不移动任何文件，也不删数据库记录。
 */
export async function POST(request: Request): Promise<Response> {
  const guard = await requireRole('tagger')
  if (!guard.authorized) return guard.response

  let body: OutListBody
  try {
    body = (await request.json()) as OutListBody
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

  if (songIds.length === 0 || songIds.length > OUT_LIST_LIMIT) {
    return NextResponse.json({ success: false, error: 'Invalid target' }, { status: 400 })
  }

  const songs = await findSongsForTransferOut(songIds)
  // 按解析顺序排，查不到的（已删）跳过
  const byId = new Map(songs.map(song => [song.id, song]))
  const ordered = songIds
    .map(id => byId.get(id))
    .filter((song): song is NonNullable<typeof song> => song !== undefined)

  return NextResponse.json({ success: true, songs: ordered })
}

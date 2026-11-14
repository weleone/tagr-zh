import { NextResponse } from 'next/server'
import { BulkResolveError, resolveBulkTargetIds } from '@/features/metadata/bulk-resolver.service'
import { type BulkTarget } from '@/features/songs/bulk-target'
import { checkOutConflicts } from '@/features/songs/transfer'
import { requireRole } from '@/lib/api/auth-guard'

interface OutConflictsBody {
  target?: BulkTarget
}

/** 每次最多查 500 首，与出库移动的上限一致。 */
const OUT_CONFLICTS_LIMIT = 500

/**
 * 出库同名检测：按批量选择解析出歌曲，查哪些在汽水目录已有同名文件，
 * 返回冲突清单（含曲库那份与汽水那份的文件大小，供弹窗让用户选覆盖还是跳过）。
 * 只查、不移动任何文件，也不删数据库记录。
 */
export async function POST(request: Request): Promise<Response> {
  const guard = await requireRole('tagger')
  if (!guard.authorized) return guard.response

  let body: OutConflictsBody
  try {
    body = (await request.json()) as OutConflictsBody
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

  if (songIds.length === 0 || songIds.length > OUT_CONFLICTS_LIMIT) {
    return NextResponse.json({ success: false, error: 'Invalid target' }, { status: 400 })
  }

  const conflicts = await checkOutConflicts(songIds)
  return NextResponse.json({ success: true, conflicts })
}

import { NextResponse } from 'next/server'
import { BulkResolveError, resolveBulkTargetIds } from '@/features/metadata/bulk-resolver.service'
import { type BulkTarget } from '@/features/songs/bulk-target'
import { moveSongsToQishui } from '@/features/songs/transfer'
import { requireRole } from '@/lib/api/auth-guard'
import { ndjsonStreamResponse, type NdjsonEvent } from '@/lib/ndjson-stream'

interface TransferOutBody {
  target?: BulkTarget
  /** 汽水目录已有同名文件时是否覆盖；不传默认 false（跳过冲突文件） */
  overwrite?: boolean
}

/** 每次最多移动 500 首，与批量文件名解析的上限一致。 */
const TRANSFER_OUT_LIMIT = 500

/**
 * 曲库 → 汽水：按批量选择解析出歌曲，逐首移动文件到汽水目录，
 * 移成功的从数据库里删除记录。用 NDJSON 流逐个返回结果。
 */
export async function POST(request: Request): Promise<Response> {
  const guard = await requireRole('tagger')
  if (!guard.authorized) return guard.response

  let body: TransferOutBody
  try {
    body = (await request.json()) as TransferOutBody
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

  if (songIds.length === 0 || songIds.length > TRANSFER_OUT_LIMIT) {
    return NextResponse.json({ success: false, error: 'Invalid target' }, { status: 400 })
  }

  return ndjsonStreamResponse(async function* () {
    yield { type: 'start', total: songIds.length } satisfies NdjsonEvent<unknown>

    const results = await moveSongsToQishui(songIds, { overwrite: body.overwrite ?? false })
    for (let i = 0; i < results.length; i++) {
      yield { type: 'result', index: i, result: results[i] }
    }

    yield { type: 'done', resolvedCount: results.length } satisfies NdjsonEvent<unknown>
  })
}

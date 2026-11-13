import { NextResponse } from 'next/server'
import { moveFetchIntoLibrary } from '@/features/songs/transfer'
import { requireRole } from '@/lib/api/auth-guard'
import { ndjsonStreamResponse, type NdjsonEvent } from '@/lib/ndjson-stream'

interface TransferInBody {
  files?: string[]
}

/** 每次最多移动 500 个文件，与批量文件名解析的上限一致。 */
const TRANSFER_IN_LIMIT = 500

/**
 * 待入库 → 曲库：移动文件后对曲库做一次 quick 扫描，把新文件写进数据库。
 * 用 NDJSON 流逐个返回结果，移动多文件时不超时。
 */
export async function POST(request: Request): Promise<Response> {
  const guard = await requireRole('tagger')
  if (!guard.authorized) return guard.response

  let body: TransferInBody
  try {
    body = (await request.json()) as TransferInBody
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 })
  }

  const files = body?.files
  if (!Array.isArray(files) || files.length === 0 || files.length > TRANSFER_IN_LIMIT) {
    return NextResponse.json({ success: false, error: 'Invalid files' }, { status: 400 })
  }
  if (!files.every(name => typeof name === 'string' && name.length > 0)) {
    return NextResponse.json({ success: false, error: 'Invalid files' }, { status: 400 })
  }

  return ndjsonStreamResponse(async function* () {
    yield { type: 'start', total: files.length } satisfies NdjsonEvent<unknown>

    const { results, scanned } = await moveFetchIntoLibrary(files)
    for (let i = 0; i < results.length; i++) {
      yield { type: 'result', index: i, result: results[i] }
    }

    yield { type: 'done', resolvedCount: results.length, scanned } satisfies NdjsonEvent<unknown>
  })
}

import { NextResponse } from 'next/server'
import { getTransferDirs, listFetchFiles } from '@/features/songs/transfer'
import { requireRole } from '@/lib/api/auth-guard'

/** 汽水待入库目录里的音频文件列表。 */
export async function GET() {
  const guard = await requireRole('tagger')
  if (!guard.authorized) return guard.response

  const { exists, files } = await listFetchFiles()
  const { fetch } = getTransferDirs()

  return NextResponse.json({ success: true, exists, dir: fetch, files })
}

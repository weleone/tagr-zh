import { NextResponse } from 'next/server'
import { getTransferToolName, isTransferConfigured } from '@/features/songs/transfer'
import { requireRole } from '@/lib/api/auth-guard'

/** 转移功能配置：有没有接下载工具（待入库目录有没有显式设置）。 */
export async function GET() {
  const guard = await requireRole('tagger')
  if (!guard.authorized) return guard.response

  return NextResponse.json({
    success: true,
    configured: await isTransferConfigured(),
    tool: getTransferToolName()
  })
}

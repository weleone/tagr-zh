import fs from 'fs'
import { NextResponse } from 'next/server'
import { findSongsForDownload } from '@/features/songs/songs.repository'
import { dedupeZipNames, fileCrc32, zipStream } from '@/features/songs/zip-stream'
import { requireRole } from '@/lib/api/auth-guard'

/** 一次最多打包 500 首，与出库移动的上限一致。 */
const ZIP_LIMIT = 500

/**
 * 出库打包下载：把已选歌曲打成一个 zip 一次下完（GET，ids 在 query 里），
 * 免得每首歌弹一次保存框。文件名用纯 ASCII 的 tagr-download.zip，
 * 安卓的 URLUtil.guessFileName 能直接认出来。
 * 只读文件，不动数据库、不删记录。
 */
export async function GET(request: Request) {
  const guard = await requireRole('tagger')
  if (!guard.authorized) return guard.response

  const idsParam = new URL(request.url).searchParams.get('ids') || ''
  const ids = [...new Set(
    idsParam
      .split(',')
      .map(s => parseInt(s.trim(), 10))
      .filter(n => !isNaN(n) && n > 0)
  )]
  if (ids.length === 0 || ids.length > ZIP_LIMIT) {
    return NextResponse.json({ success: false, error: 'Invalid ids' }, { status: 400 })
  }

  const songs = await findSongsForDownload(ids)
  const byId = new Map(songs.map(song => [song.id, song]))
  // 按 ids 顺序排，查不到的和磁盘上不存在的跳过
  const existing: { fileName: string; filePath: string }[] = []
  for (const id of ids) {
    const song = byId.get(id)
    if (song && fs.existsSync(song.filePath)) {
      existing.push({ fileName: song.fileName, filePath: song.filePath })
    }
  }
  if (existing.length === 0) {
    return NextResponse.json({ success: false, error: 'No files found on disk' }, { status: 404 })
  }

  const names = dedupeZipNames(existing.map(song => song.fileName))
  const entries = []
  for (let i = 0; i < existing.length; i++) {
    const stat = fs.statSync(existing[i].filePath)
    const crc = await fileCrc32(existing[i].filePath)
    entries.push({ name: names[i], filePath: existing[i].filePath, size: stat.size, crc })
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of zipStream(entries)) {
          controller.enqueue(new Uint8Array(chunk))
        }
        controller.close()
      } catch (e) {
        controller.error(e)
      }
    }
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename="tagr-download.zip"'
    }
  })
}

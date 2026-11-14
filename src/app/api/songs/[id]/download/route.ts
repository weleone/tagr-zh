import fs from 'fs'
import { Readable } from 'stream'
import { NextResponse } from 'next/server'
import { findSongById } from '@/features/songs/songs.repository'
import { requireRole } from '@/lib/api/auth-guard'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

function nodeStreamToWeb(nodeStream: Readable): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      nodeStream.on('data', (chunk: Buffer) => {
        controller.enqueue(new Uint8Array(chunk))
      })
      nodeStream.on('end', () => {
        controller.close()
      })
      nodeStream.on('error', (err) => {
        controller.error(err)
      })
    },
    cancel() {
      nodeStream.destroy()
    }
  })
}

/**
 * 单首下载：把曲库里的原文件以附件形式发给浏览器（下载到本地），
 * 供转移弹窗出库页签的“下载到本地”按钮用。只读文件，不动数据库。
 * 中文文件名只发 filename*=UTF-8''，不发 ASCII 兜底 filename，
 * 否则安卓会把 "-.mp3; filename*=..." 当成文件名。
 */
export async function GET(request: Request, { params }: RouteParams) {
  const guard = await requireRole('tagger')
  if (!guard.authorized) return guard.response

  const { id } = await params
  const songId = parseInt(id, 10)
  if (isNaN(songId)) {
    return NextResponse.json({ success: false, error: 'Invalid song ID' }, { status: 400 })
  }

  const song = await findSongById(songId)
  if (!song) {
    return NextResponse.json({ success: false, error: 'Song not found' }, { status: 404 })
  }
  if (!fs.existsSync(song.filePath)) {
    return NextResponse.json({ success: false, error: 'File not found on disk' }, { status: 404 })
  }

  const stat = fs.statSync(song.filePath)
  return new NextResponse(nodeStreamToWeb(fs.createReadStream(song.filePath)), {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Length': String(stat.size),
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(song.fileName)}`
    }
  })
}

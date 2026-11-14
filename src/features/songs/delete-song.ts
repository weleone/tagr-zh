import { unlink } from 'node:fs/promises'
import path from 'node:path'
import { getMusicFolders } from '@/features/songs/song-file-helpers'
import { deleteSongById, findSongById } from '@/features/songs/songs.repository'

export interface DeleteSongResult {
  songId: number
  name: string
  /** 展示用路径：folderPath/fileName */
  path: string
  ok: boolean
  error?: string
}

/** 只删曲库（MUSIC_FOLDERS）里的文件，拒绝库外路径，防止误删。 */
function isUnderMusicFolders(filePath: string): boolean {
  const resolved = path.resolve(filePath)
  return getMusicFolders().some(folder => {
    const base = path.resolve(folder)
    return resolved === base || resolved.startsWith(base + path.sep)
  })
}

/**
 * 删一首歌：先删磁盘上的文件，再清数据库记录。
 * 文件已不在磁盘上（ENOENT）时只清记录；其他错误（权限等）不继续、不清记录。
 */
export async function deleteSongAndFile(songId: number): Promise<DeleteSongResult> {
  const song = await findSongById(songId)
  if (!song) return { songId, name: '', path: '', ok: false, error: 'notFound' }

  const displayPath = `${song.folderPath}/${song.fileName}`
  if (!isUnderMusicFolders(song.filePath)) {
    return { songId, name: song.fileName, path: displayPath, ok: false, error: 'outsideLibrary' }
  }

  try {
    await unlink(song.filePath)
  } catch (e) {
    if (e instanceof Error && 'code' in e && (e as NodeJS.ErrnoException).code !== 'ENOENT') {
      return { songId, name: song.fileName, path: displayPath, ok: false, error: e.message }
    }
    // ENOENT：文件已不在磁盘上，只清记录
  }

  await deleteSongById(songId)
  return { songId, name: song.fileName, path: displayPath, ok: true }
}

/** 批量删歌：逐首删文件 + 清记录，返回每首的结果。 */
export async function deleteSongsAndFiles(songIds: number[]): Promise<DeleteSongResult[]> {
  const results: DeleteSongResult[] = []
  for (const songId of songIds) {
    results.push(await deleteSongAndFile(songId))
  }
  return results
}

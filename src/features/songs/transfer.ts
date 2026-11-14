import { copyFile, readdir, rename, stat, unlink } from 'node:fs/promises'
import path from 'node:path'
import { deleteSongById, findSongById } from '@/features/songs/songs.repository'
import { getMusicFolders, isMusicFile } from '@/features/songs/song-file-helpers'
import { scanFolderAndUpdateDatabase } from '@/features/metadata/metadata-scan.service'

/**
 * 汽水 ↔ Tagr 文件转移（tagr-zh 新增）。
 *
 * 三个目录（都由 compose 卷挂载进来）：
 * - 曲库：MUSIC_FOLDERS 的第一个（默认 /music），即 /mnt/sdc1/music/tagr
 * - 待入库：QISHUI_FETCH_DIR（默认 /qishui-fetch），即汽水下载的 fetch 目录
 * - 汽水：QISHUI_DIR（默认 /qishui），即改完标签后放回的汽水目录
 *
 * 流程：汽水下到 fetch → 移入库改标签 → 改完移回汽水目录（播放器挂载点能看到）。
 */

export interface TransferDirs {
  library: string
  fetch: string
  qishui: string
}

export function getTransferDirs(): TransferDirs {
  const folders = getMusicFolders()
  return {
    library: folders[0] ?? '/music',
    fetch: process.env.QISHUI_FETCH_DIR?.trim() || '/qishui-fetch',
    qishui: process.env.QISHUI_DIR?.trim() || '/qishui'
  }
}

/**
 * 界面显示用的路径：宿主机路径（只做显示，不参与文件操作）。
 * compose 里可配 HOST_LIBRARY_DIR / HOST_FETCH_DIR / HOST_QISHUI_DIR，
 * 不配就回落到容器内路径。
 */
export function getTransferDisplayDirs(): TransferDirs {
  const dirs = getTransferDirs()
  return {
    library: process.env.HOST_LIBRARY_DIR?.trim() || dirs.library,
    fetch: process.env.HOST_FETCH_DIR?.trim() || dirs.fetch,
    qishui: process.env.HOST_QISHUI_DIR?.trim() || dirs.qishui
  }
}

export interface FetchFile {
  name: string
  size: number
  mtime: string
}

/** 列出待入库目录里的音频文件；目录不存在时返回 exists:false。 */
export async function listFetchFiles(): Promise<{ exists: boolean; files: FetchFile[] }> {
  const { fetch } = getTransferDirs()
  let entries: string[]
  try {
    entries = await readdir(fetch)
  } catch {
    return { exists: false, files: [] }
  }

  const files: FetchFile[] = []
  for (const name of entries.sort()) {
    if (!isMusicFile(name)) continue
    try {
      const info = await stat(path.join(fetch, name))
      if (!info.isFile()) continue
      files.push({ name, size: info.size, mtime: info.mtime.toISOString() })
    } catch {
      // 文件在列目录与取属性之间消失，跳过
    }
  }
  return { exists: true, files }
}

/** 把名字解析进目录内，拒绝 ../ 穿越；不合法返回 null。 */
function resolveInDir(dir: string, name: string): string | null {
  if (!name || name.includes('/') || name.includes('\\') || name === '.' || name === '..') {
    return null
  }
  const resolved = path.resolve(dir, name)
  const base = path.resolve(dir)
  if (resolved !== base && !resolved.startsWith(base + path.sep)) return null
  if (resolved === base) return null
  return resolved
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath)
    return true
  } catch {
    return false
  }
}

/**
 * 跨卷移动：Docker 里每个 bind 挂载算一个文件系统，rename 跨挂载会报
 * EXDEV（cross-device link not permitted）。先试 rename（同卷最快），
 * 报 EXDEV 时退到 copy + unlink（效果等同 mv 命令的跨设备回退）。
 */
async function moveFile(src: string, dest: string): Promise<void> {
  try {
    await rename(src, dest)
  } catch (e) {
    if (e instanceof Error && 'code' in e && (e as NodeJS.ErrnoException).code === 'EXDEV') {
      await copyFile(src, dest)
      await unlink(src)
      return
    }
    throw e
  }
}

export interface TransferMoveResult {
  name: string
  ok: boolean
  error?: string
}

/**
 * 待入库 → 曲库：逐个移动文件，目标已存在同名文件时跳过（不覆盖）。
 * 移完对曲库做一次 quick 扫描，把新文件写进数据库。
 */
export async function moveFetchIntoLibrary(
  fileNames: string[]
): Promise<{ results: TransferMoveResult[]; scanned: { added: number; updated: number } }> {
  const { library, fetch } = getTransferDirs()
  const results: TransferMoveResult[] = []

  for (const name of fileNames) {
    const src = resolveInDir(fetch, name)
    if (!src) {
      results.push({ name, ok: false, error: 'invalidName' })
      continue
    }
    const dest = resolveInDir(library, name)
    if (!dest) {
      results.push({ name, ok: false, error: 'invalidName' })
      continue
    }
    if (!(await exists(src))) {
      results.push({ name, ok: false, error: 'notFound' })
      continue
    }
    if (await exists(dest)) {
      results.push({ name, ok: false, error: 'alreadyExists' })
      continue
    }
    try {
      await moveFile(src, dest)
      results.push({ name, ok: true })
    } catch (e) {
      results.push({ name, ok: false, error: e instanceof Error ? e.message : 'moveFailed' })
    }
  }

  const moved = results.filter(result => result.ok).length
  let scanned = { added: 0, updated: 0 }
  if (moved > 0) {
    try {
      const scan = await scanFolderAndUpdateDatabase(library, undefined, 'quick')
      scanned = { added: scan.addedFiles.length, updated: scan.updatedFiles.length }
    } catch (e) {
      // 扫描失败不影响已经移好的文件，只是不写库；原因打日志方便排查
      console.error('[transfer] quick-scan after import failed', e)
    }
  }

  return { results, scanned }
}

export interface TransferOutResult {
  songId: number
  name: string
  ok: boolean
  error?: string
}

export interface TransferOutConflict {
  songId: number
  fileName: string
  title: string | null
  artist: string | null
  /** 曲库里那份的大小（字节） */
  librarySize: number
  /** 汽水目录里已有的同名文件的大小（字节） */
  qishuiSize: number
}

/**
 * 出库同名检测：已选歌曲里哪些在汽水目录已有同名文件。
 * 只查、不移动，返回冲突清单（含两边的文件大小，供弹窗让用户选覆盖还是跳过）。
 */
export async function checkOutConflicts(songIds: number[]): Promise<TransferOutConflict[]> {
  const { library, qishui } = getTransferDirs()
  const libraryBase = path.resolve(library)
  const conflicts: TransferOutConflict[] = []

  for (const songId of songIds) {
    const song = await findSongById(songId)
    if (!song) continue
    const src = path.resolve(song.filePath)
    if (src !== libraryBase && !src.startsWith(libraryBase + path.sep)) continue
    const dest = resolveInDir(qishui, song.fileName)
    if (!dest) continue
    // stat 失败返回 null：汽水目录没有同名文件，或曲库文件不在磁盘上，都不算冲突
    const destInfo = await stat(dest).catch(() => null)
    if (!destInfo || !destInfo.isFile()) continue
    const srcInfo = await stat(src).catch(() => null)
    if (!srcInfo || !srcInfo.isFile()) continue
    conflicts.push({
      songId,
      fileName: song.fileName,
      title: song.title ?? null,
      artist: song.artist ?? null,
      librarySize: srcInfo.size,
      qishuiSize: destInfo.size
    })
  }

  return conflicts
}

/**
 * 曲库 → 汽水：逐首移动文件，移成功的从数据库里删除该歌曲记录。
 * overwrite=false（默认）：目标已存在同名文件时跳过（不覆盖）；
 * overwrite=true：目标同名文件直接被替换（rename 原子覆盖，跨卷时 copy 覆盖）。
 */
export async function moveSongsToQishui(
  songIds: number[],
  opts?: { overwrite?: boolean }
): Promise<TransferOutResult[]> {
  const { library, qishui } = getTransferDirs()
  const libraryBase = path.resolve(library)
  const results: TransferOutResult[] = []
  const overwrite = opts?.overwrite ?? false

  for (const songId of songIds) {
    const song = await findSongById(songId)
    if (!song) {
      results.push({ songId, name: '', ok: false, error: 'notFound' })
      continue
    }
    const src = path.resolve(song.filePath)
    if (src !== libraryBase && !src.startsWith(libraryBase + path.sep)) {
      results.push({ songId, name: song.fileName, ok: false, error: 'outsideLibrary' })
      continue
    }
    const dest = resolveInDir(qishui, song.fileName)
    if (!dest) {
      results.push({ songId, name: song.fileName, ok: false, error: 'invalidName' })
      continue
    }
    if (!(await exists(src))) {
      // 文件已不在磁盘上，只清数据库记录
      await deleteSongById(songId)
      results.push({ songId, name: song.fileName, ok: true })
      continue
    }
    if (!overwrite && (await exists(dest))) {
      results.push({ songId, name: song.fileName, ok: false, error: 'alreadyExists' })
      continue
    }
    try {
      await moveFile(src, dest)
      await deleteSongById(songId)
      results.push({ songId, name: song.fileName, ok: true })
    } catch (e) {
      results.push({
        songId,
        name: song.fileName,
        ok: false,
        error: e instanceof Error ? e.message : 'moveFailed'
      })
    }
  }

  return results
}

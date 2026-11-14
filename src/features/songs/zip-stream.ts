import fs from 'fs'

/**
 * 最小 ZIP 打包器（无新依赖）：只做 stored（不压缩，音频本来就压过），
 * 用 Node 内置 fs + 自写 CRC32。文件名用 UTF-8 flag（0x0800），
 * 中文文件名解压不会乱码。
 *
 * 供转移出库“下载到本地”用：多首歌打成一个 zip，一次下载，
 * 免得每首歌弹一次保存框。
 */

const CRC_TABLE: Uint32Array = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

export function crc32(buf: Buffer, prev = 0): number {
  let c = (prev ^ 0xffffffff) >>> 0
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

/** 流式算文件 CRC32，不把整个文件读进内存。 */
export async function fileCrc32(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    let crc = 0
    const stream = fs.createReadStream(filePath)
    stream.on('data', (chunk: Buffer | string) => {
      crc = crc32(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk), crc)
    })
    stream.on('end', () => resolve(crc >>> 0))
    stream.on('error', reject)
  })
}

export interface ZipEntry {
  /** zip 里的文件名（已去重），UTF-8 */
  name: string
  /** 磁盘上的实际路径 */
  filePath: string
  size: number
  crc: number
}

function localHeader(entry: ZipEntry): Buffer {
  const nameBuf = Buffer.from(entry.name, 'utf8')
  const header = Buffer.alloc(30)
  header.writeUInt32LE(0x04034b50, 0) // signature
  header.writeUInt16LE(20, 4) // version needed
  header.writeUInt16LE(0x0800, 6) // flags: UTF-8
  header.writeUInt16LE(0, 8) // method: stored
  header.writeUInt16LE(0, 10) // mod time
  header.writeUInt16LE(0, 12) // mod date
  header.writeUInt32LE(entry.crc >>> 0, 14)
  header.writeUInt32LE(entry.size >>> 0, 18) // compressed size = size (stored)
  header.writeUInt32LE(entry.size >>> 0, 22) // uncompressed size
  header.writeUInt16LE(nameBuf.length, 26)
  header.writeUInt16LE(0, 28) // extra length
  return Buffer.concat([header, nameBuf])
}

function centralHeader(entry: ZipEntry, offset: number): Buffer {
  const nameBuf = Buffer.from(entry.name, 'utf8')
  const header = Buffer.alloc(46)
  header.writeUInt32LE(0x02014b50, 0) // signature
  header.writeUInt16LE(20, 4) // version made by
  header.writeUInt16LE(20, 6) // version needed
  header.writeUInt16LE(0x0800, 8) // flags: UTF-8
  header.writeUInt16LE(0, 10) // method: stored
  header.writeUInt16LE(0, 12) // mod time
  header.writeUInt16LE(0, 14) // mod date
  header.writeUInt32LE(entry.crc >>> 0, 16)
  header.writeUInt32LE(entry.size >>> 0, 20)
  header.writeUInt32LE(entry.size >>> 0, 24)
  header.writeUInt16LE(nameBuf.length, 28)
  header.writeUInt16LE(0, 30) // extra length
  header.writeUInt16LE(0, 32) // comment length
  header.writeUInt16LE(0, 34) // disk number
  header.writeUInt16LE(0, 36) // internal attrs
  header.writeUInt32LE(0, 38) // external attrs
  header.writeUInt32LE(offset >>> 0, 42) // local header offset
  return Buffer.concat([header, nameBuf])
}

function endRecord(count: number, centralSize: number, centralOffset: number): Buffer {
  const record = Buffer.alloc(22)
  record.writeUInt32LE(0x06054b50, 0) // signature
  record.writeUInt16LE(0, 4) // disk number
  record.writeUInt16LE(0, 6) // central dir disk
  record.writeUInt16LE(count, 8) // entries this disk
  record.writeUInt16LE(count, 10) // total entries
  record.writeUInt32LE(centralSize >>> 0, 12)
  record.writeUInt32LE(centralOffset >>> 0, 16)
  record.writeUInt16LE(0, 20) // comment length
  return record
}

/**
 * 流式生成 zip：逐个写 local header + 文件内容，最后写 central directory + EOCD。
 * 调用前先把每个文件的 size/crc 算好（fileCrc32 + fs.stat）。
 */
export async function* zipStream(entries: ZipEntry[]): AsyncGenerator<Buffer> {
  let offset = 0
  const central: { entry: ZipEntry; offset: number }[] = []
  for (const entry of entries) {
    const header = localHeader(entry)
    central.push({ entry, offset })
    offset += header.length + entry.size
    yield header
    // 流式拷文件内容，不进内存
    const stream = fs.createReadStream(entry.filePath)
    for await (const chunk of stream) {
      yield chunk as Buffer
    }
  }
  const centralOffset = offset
  let centralSize = 0
  for (const { entry, offset: entryOffset } of central) {
    const header = centralHeader(entry, entryOffset)
    centralSize += header.length
    yield header
  }
  yield endRecord(entries.length, centralSize, centralOffset)
}

/** 同名文件去重：a.mp3、a (2).mp3、a (3).mp3…… */
export function dedupeZipNames(names: string[]): string[] {
  const used = new Set<string>()
  return names.map(name => {
    if (!used.has(name)) {
      used.add(name)
      return name
    }
    const dot = name.lastIndexOf('.')
    const base = dot > 0 ? name.slice(0, dot) : name
    const ext = dot > 0 ? name.slice(dot) : ''
    let i = 2
    let candidate = `${base} (${i})${ext}`
    while (used.has(candidate)) {
      i++
      candidate = `${base} (${i})${ext}`
    }
    used.add(candidate)
    return candidate
  })
}

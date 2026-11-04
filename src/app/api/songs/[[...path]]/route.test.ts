import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET } from './route'

const { mockGetSongsByFolder, mockCountSongsByFolder } = vi.hoisted(() => ({
  mockGetSongsByFolder: vi.fn(),
  mockCountSongsByFolder: vi.fn()
}))

vi.mock('@/features/songs/song-query.repository', () => ({
  PAGE_SIZE: 50,
  getSongsByFolder: (...args: unknown[]) => mockGetSongsByFolder(...args),
  countSongsByFolder: (...args: unknown[]) => mockCountSongsByFolder(...args)
}))

function get(url: string, path?: string[]) {
  return GET(new Request(url), { params: Promise.resolve({ path }) })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetSongsByFolder.mockResolvedValue([])
  mockCountSongsByFolder.mockResolvedValue(0)
})

describe('GET /api/songs', () => {
  it('reads a single-segment folder from the folderPath query parameter', async () => {
    const res = await get('http://localhost/api/songs?folderPath=%2Fmusic')
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.folderPath).toBe('/music')
    expect(mockGetSongsByFolder.mock.calls[0][0]).toBe('/music')
    expect(mockCountSongsByFolder.mock.calls[0][0]).toBe('/music')
  })

  it('keeps special characters of the folderPath query parameter', async () => {
    const folder = '/music/Albums/Amrinder Gill/Judaa & Co #1'
    await get(`http://localhost/api/songs?folderPath=${encodeURIComponent(folder)}`)

    expect(mockGetSongsByFolder.mock.calls[0][0]).toBe(folder)
  })

  it('still accepts the folder as path segments', async () => {
    const res = await get('http://localhost/api/songs/music/Albums', ['music', 'Albums'])
    const body = await res.json()

    expect(body.folderPath).toBe('/music/Albums')
    expect(mockGetSongsByFolder.mock.calls[0][0]).toBe('/music/Albums')
  })

  it('lists all songs when no folder is given', async () => {
    const res = await get('http://localhost/api/songs')
    const body = await res.json()

    expect(body.folderPath).toBe('all')
    expect(mockGetSongsByFolder.mock.calls[0][0]).toBeNull()
  })
})

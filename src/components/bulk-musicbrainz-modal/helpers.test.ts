import { describe, expect, it } from 'vitest'
import type { BulkMusicBrainzSong } from '@/features/musicbrainz/bulk-lookup'
import { initialReleaseSearch, releaseArtist, VARIOUS_ARTISTS } from './helpers'

function song(artist: string | null, albumArtist: string | null = null, album = 'Album'): BulkMusicBrainzSong {
  return { artist, albumArtist, album } as BulkMusicBrainzSong
}

describe('releaseArtist', () => {
  it('uses the album artist when the files carry one', () => {
    expect(releaseArtist([song('Artist A', 'Various Artists'), song('Artist B', 'Various Artists')])).toBe(
      'Various Artists'
    )
    expect(releaseArtist([song('Queen'), song('Queen & David Bowie', 'Queen')])).toBe('Queen')
  })

  it('uses the track artist for a regular album', () => {
    expect(releaseArtist([song('Daft Punk'), song('Daft Punk'), song('Daft Punk')])).toBe('Daft Punk')
  })

  it('searches for Various Artists when every track has a different artist', () => {
    expect(releaseArtist([song('Madonna'), song('Prince'), song('Blondie'), song('Toto')])).toBe(VARIOUS_ARTISTS)
  })

  it('searches for Various Artists when no artist has more than half of the tracks', () => {
    expect(releaseArtist([song('Madonna'), song('Madonna'), song('Prince'), song('Blondie')])).toBe(VARIOUS_ARTISTS)
  })

  it('does not treat guest appearances as different artists', () => {
    expect(
      releaseArtist([
        song('Kendrick Lamar'),
        song('Kendrick Lamar feat. SZA'),
        song('Kendrick Lamar & Rihanna'),
        song('Kendrick Lamar ft. Drake'),
        song('Kendrick Lamar')
      ])
    ).toBe('Kendrick Lamar')
  })

  it('keeps a single song and empty selections as they are', () => {
    expect(releaseArtist([song('Prince')])).toBe('Prince')
    expect(releaseArtist([song(null), song('  ')])).toBe('')
  })
})

describe('initialReleaseSearch', () => {
  it('fills album and artist for a compilation', () => {
    expect(initialReleaseSearch([song('Madonna', null, 'Bravo Hits 1'), song('Prince', null, 'Bravo Hits 1')])).toEqual(
      {
        album: 'Bravo Hits 1',
        artist: VARIOUS_ARTISTS
      }
    )
  })
})

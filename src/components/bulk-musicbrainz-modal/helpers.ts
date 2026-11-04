import type { BulkMusicBrainzSong } from '@/features/musicbrainz/bulk-lookup'
import type { MusicBrainzArtistCredit, MusicBrainzReleaseSearchResult } from '@/features/musicbrainz/domain'

export function formatArtistCredit(credits?: MusicBrainzArtistCredit[]): string {
  if (!credits?.length) return ''
  return credits.map(c => c.name + (c.joinphrase ?? '')).join('')
}

/** The value most songs share, ignoring empty ones - the album the selection most likely is. */
export function mostCommon(values: Array<string | null | undefined>): string {
  const counts = new Map<string, number>()
  for (const value of values) {
    const trimmed = value?.trim()
    if (trimmed) counts.set(trimmed, (counts.get(trimmed) ?? 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''
}

/** MusicBrainz' own name for releases by several artists (its special purpose artist). */
export const VARIOUS_ARTISTS = 'Various Artists'

/** "Kendrick Lamar feat. SZA" -> "Kendrick Lamar", so guest appearances don't look like different artists. */
function primaryArtist(artist: string): string {
  return artist
    .split(/\s+(?:feat\.?|ft\.?|featuring|with|&|x|vs\.?)\s+|\s*[,;/]\s*/i)[0]
    .trim()
    .toLowerCase()
}

/**
 * The artist to search the release by: the album artist when the files carry one, otherwise the track artist -
 * unless no artist (guests aside) appears on more than half of the songs, which makes it a compilation.
 */
export function releaseArtist(songs: BulkMusicBrainzSong[]): string {
  const albumArtist = mostCommon(songs.map(song => song.albumArtist))
  if (albumArtist) return albumArtist

  const artists = songs.map(song => song.artist?.trim()).filter((artist): artist is string => !!artist)
  const primaries = artists.map(primaryArtist)
  const top = mostCommon(primaries)
  const topCount = primaries.filter(primary => primary === top).length
  if (artists.length > 1 && topCount * 2 <= artists.length) return VARIOUS_ARTISTS
  return mostCommon(artists.filter(artist => primaryArtist(artist) === top))
}

export function initialReleaseSearch(songs: BulkMusicBrainzSong[]) {
  return {
    album: mostCommon(songs.map(song => song.album)),
    artist: releaseArtist(songs)
  }
}

/** "2×CD", "CD + DVD" - how MusicBrainz itself summarises the media of a release. */
export function formatMedia(media?: MusicBrainzReleaseSearchResult['media']): string {
  if (!media?.length) return ''
  const counts = new Map<string, number>()
  for (const medium of media) {
    const format = medium.format ?? '?'
    counts.set(format, (counts.get(format) ?? 0) + 1)
  }
  return [...counts.entries()].map(([format, count]) => (count > 1 ? `${count}×${format}` : format)).join(' + ')
}

export function formatPosition(disc: number | null | undefined, position: number | null | undefined): string {
  if (!position) return ''
  const track = String(position).padStart(2, '0')
  return disc ? `${disc}-${track}` : track
}

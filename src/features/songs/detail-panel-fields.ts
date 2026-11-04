/**
 * Sections of the song detail panel and the rows each one shows, in display order. The settings page
 * that picks which rows are visible is built from this list, so a row added to the panel must be listed
 * here too. `customTags` has no fixed rows: its rows are the song's extended tags.
 */
export const DETAIL_PANEL_SECTIONS = [
  {
    id: 'musicInfo',
    titleKey: 'musicInfo.title',
    fields: [
      'title',
      'artist',
      'sortArtist',
      'album',
      'sortAlbum',
      'albumArtist',
      'sortAlbumArtist',
      'year',
      'genre',
      'style',
      'composer',
      'conductor',
      'bpm',
      'grouping',
      'publisher',
      'catalogNumber',
      'releaseType',
      'lyricist',
      'barcode',
      'work',
      'originalReleaseDate',
      'copyright',
      'rating',
      'compilation'
    ]
  },
  { id: 'notes', titleKey: 'notes.title', fields: ['comment', 'lyrics'] },
  { id: 'customTags', titleKey: 'customTags.title', fields: [] },
  {
    id: 'trackInfo',
    titleKey: 'trackInfo.title',
    fields: ['duration', 'trackNumber', 'trackTotal', 'discNumber', 'discTotal']
  },
  {
    id: 'audioProperties',
    titleKey: 'audioProperties.title',
    fields: ['extension', 'codec', 'bitrate', 'sampleRate', 'channels', 'bitsPerSample', 'encoder']
  },
  { id: 'stats', titleKey: 'stats.title', fields: ['dateAdded', 'lastPlayed'] },
  {
    id: 'fileDetails',
    titleKey: 'files.fileInfo',
    fields: ['fileName', 'fileSize', 'createdAt', 'modifiedAt', 'filePath']
  }
] as const

export type DetailPanelSectionId = (typeof DETAIL_PANEL_SECTIONS)[number]['id']

export type DetailPanelField = (typeof DETAIL_PANEL_SECTIONS)[number]['fields'][number]

export function getDetailPanelSectionFields(id: DetailPanelSectionId): readonly DetailPanelField[] {
  return DETAIL_PANEL_SECTIONS.find(section => section.id === id)?.fields ?? []
}

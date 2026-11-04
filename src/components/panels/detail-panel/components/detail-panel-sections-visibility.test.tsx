import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { DetailPanelFieldsState } from '@/features/config/domain'
import type { Song } from '@/features/songs/domain'
import type { SongMetadata } from '@/generated/prisma/client'
import { DetailPanelAudioPropertiesSection } from './detail-panel-audio-properties-section'
import { DetailPanelCustomMetadataSection } from './detail-panel-custom-metadata-section/detail-panel-custom-metadata-section'
import { DetailPanelFileDetailsSection } from './detail-panel-file-details-section'
import { DetailPanelMusicInfoSection } from './detail-panel-music-info-section'
import { DetailPanelNotesSection } from './detail-panel-notes-section'
import { DetailPanelStatsSection } from './detail-panel-stats-section'
import { DetailPanelTrackInfoSection } from './detail-panel-track-info-section'

const { mockFields, mockMetadataKeys } = vi.hoisted(() => ({
  mockFields: { current: {} as DetailPanelFieldsState },
  mockMetadataKeys: { current: [] as string[] }
}))

vi.mock('@/features/songs/hooks/use-detail-panel-fields', () => ({
  useDetailPanelFields: () => ({
    fields: mockFields.current,
    isFieldVisible: (field: string) => !mockFields.current.hidden?.includes(field as never),
    isCustomTagVisible: (key: string) => !mockFields.current.hiddenCustom?.includes(key),
    saveFields: vi.fn()
  })
}))

vi.mock('@/features/songs/hooks/use-metadata-keys', () => ({
  useMetadataKeys: () => ({ data: mockMetadataKeys.current })
}))

vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { role: 'listener' } } })
}))

// The row has its own tests; here only which rows are rendered matters.
vi.mock('./detail-panel-row/detail-panel-row', () => ({
  DetailPanelRow: ({ label }: { label: string }) => <div data-testid='row'>{label}</div>
}))

const song = {
  id: 1,
  title: 'Song',
  artist: 'Artist',
  comment: 'A comment',
  lyrics: 'Some lyrics',
  duration: 200,
  trackNumber: 1,
  codec: 'FLAC',
  bitrate: 1000,
  dateAdded: new Date('2024-01-01'),
  lastPlayed: new Date('2024-02-01'),
  fileName: 'song.flac',
  fileSize: 1000,
  filePath: '/music/song.flac'
} as unknown as Song

const metadata = (key: string, value: string) => ({ key, value }) as SongMetadata

function setVisibility(fields: DetailPanelFieldsState, metadataKeys: string[] = []) {
  mockFields.current = fields
  mockMetadataKeys.current = metadataKeys
}

const rowLabels = () => screen.queryAllByTestId('row').map(row => row.textContent)

beforeEach(() => {
  setVisibility({})
})

describe('detail panel sections - field visibility', () => {
  it('renders every row when nothing is hidden', () => {
    render(<DetailPanelNotesSection song={song} />)

    expect(rowLabels()).toEqual(['fields.comment', 'fields.lyrics'])
  })

  it('leaves hidden rows out of the music info section', () => {
    setVisibility({ hidden: ['title', 'genre'] })

    render(<DetailPanelMusicInfoSection song={song} />)

    expect(rowLabels()).not.toContain('fields.title')
    expect(rowLabels()).not.toContain('fields.genre')
    expect(rowLabels()).toContain('fields.artist')
  })

  it('leaves hidden rows out of the notes section', () => {
    setVisibility({ hidden: ['lyrics'] })

    render(<DetailPanelNotesSection song={song} />)

    expect(rowLabels()).toEqual(['fields.comment'])
  })

  it('leaves hidden rows out of the track info section', () => {
    setVisibility({ hidden: ['duration', 'trackTotal'] })

    render(<DetailPanelTrackInfoSection song={song} />)

    expect(rowLabels()).toEqual(['fields.trackNumber', 'fields.discNumber', 'fields.discTotal'])
  })

  it('leaves hidden rows out of the audio properties section', () => {
    setVisibility({ hidden: ['extension', 'bitrate'] })

    render(<DetailPanelAudioPropertiesSection song={song} extName='FLAC' />)

    expect(rowLabels()).toEqual(['fields.codec'])
  })

  it('leaves hidden rows out of the stats section', () => {
    setVisibility({ hidden: ['lastPlayed'] })

    render(<DetailPanelStatsSection song={song} />)

    expect(rowLabels()).toEqual(['fields.dateAdded'])
  })

  it('leaves hidden rows out of the file details section', () => {
    setVisibility({ hidden: ['fileSize', 'filePath'] })

    render(<DetailPanelFileDetailsSection song={song} />)

    expect(rowLabels()).toEqual(['fields.fileName'])
  })

  it.each([
    ['musicInfo', () => <DetailPanelMusicInfoSection song={song} />, 'musicInfo.title'],
    ['notes', () => <DetailPanelNotesSection song={song} />, 'notes.title'],
    ['trackInfo', () => <DetailPanelTrackInfoSection song={song} />, 'trackInfo.title'],
    ['audioProperties', () => <DetailPanelAudioPropertiesSection song={song} extName='FLAC' />, 'audioProperties.title'],
    ['stats', () => <DetailPanelStatsSection song={song} />, 'stats.title'],
    ['fileDetails', () => <DetailPanelFileDetailsSection song={song} />, 'files.fileInfo']
  ] as const)('hides the whole %s section when all its fields are hidden', async (sectionId, renderSection, title) => {
    const { getDetailPanelSectionFields } = await import('@/features/songs/detail-panel-fields')
    setVisibility({ hidden: [...getDetailPanelSectionFields(sectionId)] })

    const { container } = render(renderSection())

    expect(container).toBeEmptyDOMElement()
    expect(screen.queryByText(title)).not.toBeInTheDocument()
  })

  describe('custom tags', () => {
    const songMetadata = [metadata('TXXX:MOOD', 'Happy'), metadata('ENERGY', 'High')]

    it('leaves hidden custom tags out', () => {
      setVisibility({ hiddenCustom: ['MOOD'] }, ['ENERGY', 'MOOD'])

      render(<DetailPanelCustomMetadataSection songId={1} metadata={songMetadata} />)

      expect(rowLabels()).toEqual(['ENERGY'])
    })

    it('says so when every tag of the song is hidden', () => {
      setVisibility({ hiddenCustom: ['MOOD', 'ENERGY'] }, ['ENERGY', 'MOOD', 'RATING'])

      render(<DetailPanelCustomMetadataSection songId={1} metadata={songMetadata} />)

      expect(rowLabels()).toEqual([])
      expect(screen.getByText('customTags.allHidden')).toBeInTheDocument()
    })

    it('hides the whole section when every library tag is hidden', () => {
      setVisibility({ hiddenCustom: ['MOOD', 'ENERGY'] }, ['ENERGY', 'MOOD'])

      const { container } = render(<DetailPanelCustomMetadataSection songId={1} metadata={songMetadata} />)

      expect(container).toBeEmptyDOMElement()
    })

    it('still shows the empty state when the library has no custom tags', () => {
      setVisibility({}, [])

      render(<DetailPanelCustomMetadataSection songId={1} metadata={[]} />)

      expect(screen.getByText('customTags.empty')).toBeInTheDocument()
    })
  })
})

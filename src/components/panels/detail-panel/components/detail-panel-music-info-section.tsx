'use client'

import {
  ActivityIcon,
  BarcodeIcon,
  BookOpenIcon,
  CalendarIcon,
  CopyrightIcon,
  Disc3Icon,
  DiscIcon,
  FolderIcon,
  LibraryIcon,
  MusicIcon,
  PenLineIcon,
  StarIcon,
  TagIcon,
  ToggleLeftIcon,
  UserIcon,
  UsersIcon
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Song } from '@/features/songs/domain'
import { getDetailPanelSectionFields } from '@/features/songs/detail-panel-fields'
import { useDetailPanelFields } from '@/features/songs/hooks/use-detail-panel-fields'
import { formatDate } from '@/lib/date'
import { DetailPanelRow } from './detail-panel-row/detail-panel-row'
import { DetailPanelSection } from './detail-panel-section'

interface DetailPanelMusicInfoSectionProps {
  song: Song
}

export function DetailPanelMusicInfoSection({ song }: DetailPanelMusicInfoSectionProps) {
  const tSection = useTranslations('musicInfo')
  const t = useTranslations('fields')
  const { isFieldVisible } = useDetailPanelFields()

  if (!getDetailPanelSectionFields('musicInfo').some(isFieldVisible)) return null

  return (
    <DetailPanelSection title={tSection('title')}>
      {isFieldVisible('title') && (
        <DetailPanelRow
          icon={<MusicIcon className='w-4 h-4' />}
          label={t('title')}
          value={song.title}
          songId={song.id}
          fieldName='title'
        />
      )}
      {isFieldVisible('artist') && (
        <DetailPanelRow
          icon={<UserIcon className='w-4 h-4' />}
          label={t('artist')}
          value={song.artist}
          songId={song.id}
          fieldName='artist'
        />
      )}
      {isFieldVisible('sortArtist') && (
        <DetailPanelRow
          icon={<UserIcon className='w-4 h-4' />}
          label={t('sortArtist')}
          value={song.sortArtist}
          songId={song.id}
          fieldName='sortArtist'
        />
      )}
      {isFieldVisible('album') && (
        <DetailPanelRow
          icon={<DiscIcon className='w-4 h-4' />}
          label={t('album')}
          value={song.album}
          songId={song.id}
          fieldName='album'
        />
      )}
      {isFieldVisible('sortAlbum') && (
        <DetailPanelRow
          icon={<DiscIcon className='w-4 h-4' />}
          label={t('sortAlbum')}
          value={song.sortAlbum}
          songId={song.id}
          fieldName='sortAlbum'
        />
      )}
      {isFieldVisible('albumArtist') && (
        <DetailPanelRow
          icon={<UsersIcon className='w-4 h-4' />}
          label={t('albumArtist')}
          value={song.albumArtist}
          songId={song.id}
          fieldName='albumArtist'
        />
      )}
      {isFieldVisible('sortAlbumArtist') && (
        <DetailPanelRow
          icon={<UsersIcon className='w-4 h-4' />}
          label={t('sortAlbumArtist')}
          value={song.sortAlbumArtist}
          songId={song.id}
          fieldName='sortAlbumArtist'
        />
      )}
      {isFieldVisible('year') && (
        <DetailPanelRow
          icon={<CalendarIcon className='w-4 h-4' />}
          label={t('year')}
          value={song.year?.toString()}
          songId={song.id}
          fieldName='year'
          type='number'
        />
      )}
      {isFieldVisible('genre') && (
        <DetailPanelRow
          icon={<TagIcon className='w-4 h-4' />}
          label={t('genre')}
          value={song.genre}
          songId={song.id}
          fieldName='genre'
        />
      )}
      {isFieldVisible('style') && (
        <DetailPanelRow
          icon={<TagIcon className='w-4 h-4' />}
          label={t('style')}
          value={song.style}
          songId={song.id}
          fieldName='style'
        />
      )}
      {isFieldVisible('composer') && (
        <DetailPanelRow
          icon={<PenLineIcon className='w-4 h-4' />}
          label={t('composer')}
          value={song.composer}
          songId={song.id}
          fieldName='composer'
        />
      )}
      {isFieldVisible('conductor') && (
        <DetailPanelRow
          icon={<UserIcon className='w-4 h-4' />}
          label={t('conductor')}
          value={song.conductor}
          songId={song.id}
          fieldName='conductor'
        />
      )}
      {isFieldVisible('bpm') && (
        <DetailPanelRow
          icon={<ActivityIcon className='w-4 h-4' />}
          label={t('bpm')}
          value={song.bpm}
          songId={song.id}
          fieldName='bpm'
          type='number'
        />
      )}
      {isFieldVisible('grouping') && (
        <DetailPanelRow
          icon={<FolderIcon className='w-4 h-4' />}
          label={t('grouping')}
          value={song.grouping}
          songId={song.id}
          fieldName='grouping'
        />
      )}
      {isFieldVisible('publisher') && (
        <DetailPanelRow
          icon={<LibraryIcon className='w-4 h-4' />}
          label={t('publisher')}
          value={song.publisher}
          songId={song.id}
          fieldName='publisher'
        />
      )}
      {isFieldVisible('catalogNumber') && (
        <DetailPanelRow
          icon={<TagIcon className='w-4 h-4' />}
          label={t('catalogNumber')}
          value={song.catalogNumber}
          songId={song.id}
          fieldName='catalogNumber'
        />
      )}
      {isFieldVisible('releaseType') && (
        <DetailPanelRow
          icon={<Disc3Icon className='w-4 h-4' />}
          label={t('releaseType')}
          value={song.releaseType}
          songId={song.id}
          fieldName='releaseType'
        />
      )}
      {isFieldVisible('lyricist') && (
        <DetailPanelRow
          icon={<PenLineIcon className='w-4 h-4' />}
          label={t('lyricist')}
          value={song.lyricist}
          songId={song.id}
          fieldName='lyricist'
        />
      )}
      {isFieldVisible('barcode') && (
        <DetailPanelRow
          icon={<BarcodeIcon className='w-4 h-4' />}
          label={t('barcode')}
          value={song.barcode}
          songId={song.id}
          fieldName='barcode'
        />
      )}
      {isFieldVisible('work') && (
        <DetailPanelRow
          icon={<BookOpenIcon className='w-4 h-4' />}
          label={t('work')}
          value={song.work}
          songId={song.id}
          fieldName='work'
        />
      )}
      {isFieldVisible('originalReleaseDate') && (
        <DetailPanelRow
          icon={<CalendarIcon className='w-4 h-4' />}
          label={t('originalReleaseDate')}
          value={formatDate(song.originalReleaseDate)}
          songId={song.id}
          fieldName='originalReleaseDate'
          type='date'
        />
      )}
      {isFieldVisible('copyright') && (
        <DetailPanelRow
          icon={<CopyrightIcon className='w-4 h-4' />}
          label={t('copyright')}
          value={song.copyright}
          songId={song.id}
          fieldName='copyright'
        />
      )}
      {isFieldVisible('rating') && (
        <DetailPanelRow
          icon={<StarIcon className='w-4 h-4' />}
          label={t('rating')}
          value={song.rating}
          songId={song.id}
          fieldName='rating'
          type='rating'
        />
      )}
      {isFieldVisible('compilation') && (
        <DetailPanelRow
          icon={<ToggleLeftIcon className='w-4 h-4' />}
          label={t('compilation')}
          value={!!song.compilation}
          songId={song.id}
          fieldName='compilation'
          type='boolean'
        />
      )}
    </DetailPanelSection>
  )
}

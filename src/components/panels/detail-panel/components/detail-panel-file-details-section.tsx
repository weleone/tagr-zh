'use client'

import { CalendarIcon, FileIcon, HardDriveIcon, MapPinIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Song } from '@/features/songs/domain'
import { getDetailPanelSectionFields } from '@/features/songs/detail-panel-fields'
import { useDetailPanelFields } from '@/features/songs/hooks/use-detail-panel-fields'
import { formatDetailDate, formatFileSize } from '@/lib/formatters'
import { DetailPanelRow } from './detail-panel-row/detail-panel-row'
import { DetailPanelSection } from './detail-panel-section'

interface DetailPanelFileDetailsSectionProps {
  song: Song
}

export function DetailPanelFileDetailsSection({ song }: DetailPanelFileDetailsSectionProps) {
  const tFiles = useTranslations('files')
  const t = useTranslations('fields')
  const { isFieldVisible } = useDetailPanelFields()

  if (!getDetailPanelSectionFields('fileDetails').some(isFieldVisible)) return null

  return (
    <DetailPanelSection title={tFiles('fileInfo')}>
      {isFieldVisible('fileName') && (
        <DetailPanelRow icon={<FileIcon className='w-4 h-4' />} label={t('fileName')} value={song.fileName} />
      )}
      {isFieldVisible('fileSize') && (
        <DetailPanelRow
          icon={<HardDriveIcon className='w-4 h-4' />}
          label={t('fileSize')}
          value={formatFileSize(song.fileSize)}
        />
      )}
      {song.createdAt && isFieldVisible('createdAt') && (
        <DetailPanelRow
          icon={<CalendarIcon className='w-4 h-4' />}
          label={t('createdAt')}
          value={formatDetailDate(song.createdAt)!}
        />
      )}
      {song.modifiedAt && isFieldVisible('modifiedAt') && (
        <DetailPanelRow
          icon={<CalendarIcon className='w-4 h-4' />}
          label={t('modifiedAt')}
          value={formatDetailDate(song.modifiedAt)!}
        />
      )}
      {isFieldVisible('filePath') && (
        <DetailPanelRow icon={<MapPinIcon className='w-4 h-4' />} label={t('filePath')} value={song.filePath} isAPath />
      )}
    </DetailPanelSection>
  )
}

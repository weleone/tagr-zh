'use client'

import { CalendarIcon, PlayIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Song } from '@/features/songs/domain'
import { useDetailPanelFields } from '@/features/songs/hooks/use-detail-panel-fields'
import { formatDetailDate } from '@/lib/formatters'
import { DetailPanelRow } from './detail-panel-row/detail-panel-row'
import { DetailPanelSection } from './detail-panel-section'

interface DetailPanelStatsSectionProps {
  song: Song
}

export function DetailPanelStatsSection({ song }: DetailPanelStatsSectionProps) {
  const tSection = useTranslations('stats')
  const t = useTranslations('fields')
  const { isFieldVisible } = useDetailPanelFields()

  const showDateAdded = !!song.dateAdded && isFieldVisible('dateAdded')
  const showLastPlayed = !!song.lastPlayed && isFieldVisible('lastPlayed')
  const hasContent = showDateAdded || showLastPlayed

  if (!hasContent) return null

  return (
    <DetailPanelSection title={tSection('title')}>
      {showDateAdded && (
        <DetailPanelRow
          icon={<CalendarIcon className='w-4 h-4' />}
          label={t('dateAdded')}
          value={formatDetailDate(song.dateAdded)!}
        />
      )}
      {showLastPlayed && (
        <DetailPanelRow
          icon={<PlayIcon className='w-4 h-4' />}
          label={t('lastPlayed')}
          value={formatDetailDate(song.lastPlayed)!}
        />
      )}
    </DetailPanelSection>
  )
}

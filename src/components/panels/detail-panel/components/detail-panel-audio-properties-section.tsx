'use client'

import { FileTypeIcon, HashIcon, MicIcon, RadioIcon, ScanLineIcon, SettingsIcon, WavesIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Song } from '@/features/songs/domain'
import { getDetailPanelSectionFields } from '@/features/songs/detail-panel-fields'
import { useDetailPanelFields } from '@/features/songs/hooks/use-detail-panel-fields'
import { formatBitrate, formatChannels, formatSampleRate } from '@/lib/formatters'
import { DetailPanelRow } from './detail-panel-row/detail-panel-row'
import { DetailPanelSection } from './detail-panel-section'

interface DetailPanelAudioPropertiesSectionProps {
  song: Song
  extName: string
}

export function DetailPanelAudioPropertiesSection({ song, extName }: DetailPanelAudioPropertiesSectionProps) {
  const tSection = useTranslations('audioProperties')
  const t = useTranslations('fields')
  const { isFieldVisible } = useDetailPanelFields()

  if (!getDetailPanelSectionFields('audioProperties').some(isFieldVisible)) return null

  return (
    <DetailPanelSection title={tSection('title')}>
      {isFieldVisible('extension') && (
        <DetailPanelRow icon={<FileTypeIcon className='w-4 h-4' />} label={t('extension')} value={extName} />
      )}
      {song.codec && isFieldVisible('codec') && (
        <DetailPanelRow icon={<RadioIcon className='w-4 h-4' />} label={t('codec')} value={song.codec} />
      )}
      {song.bitrate && isFieldVisible('bitrate') && (
        <DetailPanelRow
          icon={<WavesIcon className='w-4 h-4' />}
          label={t('bitrate')}
          value={formatBitrate(song.bitrate)!}
        />
      )}
      {song.sampleRate && isFieldVisible('sampleRate') && (
        <DetailPanelRow
          icon={<ScanLineIcon className='w-4 h-4' />}
          label={t('sampleRate')}
          value={formatSampleRate(song.sampleRate)!}
        />
      )}
      {song.channels && isFieldVisible('channels') && (
        <DetailPanelRow
          icon={<MicIcon className='w-4 h-4' />}
          label={t('channels')}
          value={formatChannels(song.channels)!}
        />
      )}
      {song.bitsPerSample && isFieldVisible('bitsPerSample') && (
        <DetailPanelRow
          icon={<HashIcon className='w-4 h-4' />}
          label={t('bitsPerSample')}
          value={t('bitDepthValue', { value: song.bitsPerSample })}
        />
      )}
      {song.encoder && isFieldVisible('encoder') && (
        <DetailPanelRow icon={<SettingsIcon className='w-4 h-4' />} label={t('encoder')} value={song.encoder} />
      )}
    </DetailPanelSection>
  )
}

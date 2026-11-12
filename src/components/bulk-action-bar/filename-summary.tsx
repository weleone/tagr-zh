'use client'

import { useTranslations } from 'next-intl'
import { FILENAME_TEMPLATE_FIELDS } from '@/components/bulk-filename-modal/filename-template'
import { type BulkFilenameApplyItem } from '@/features/songs/bulk-filename'

interface FilenameSummaryProps {
  items: BulkFilenameApplyItem[]
  template: string
}

export function FilenameSummary({ items, template }: FilenameSummaryProps) {
  const t = useTranslations('bulkFilename')
  const tFields = useTranslations('fields')

  const fieldLabel = (key: string) => {
    const descriptor = FILENAME_TEMPLATE_FIELDS.find(field => field.key === key)
    return descriptor ? tFields(descriptor.labelKey) : key
  }

  return (
    <div className='space-y-2 text-sm'>
      <p className='text-muted-foreground'>{t('summary.description', { count: items.length })}</p>
      <div className='divide-y rounded-md border bg-muted/30 text-xs'>
        <div className='flex justify-between gap-2 px-2.5 py-1.5'>
          <span className='font-medium'>{t('summary.template')}</span>
          <span className='max-w-[60%] text-right text-muted-foreground'>{template}</span>
        </div>
        {items.slice(0, 3).map(item => (
          <div key={item.songId} className='flex justify-between gap-2 px-2.5 py-1.5'>
            <span className='font-medium'>{t('summary.song', { id: item.songId })}</span>
            <span className='max-w-[60%] text-right text-muted-foreground'>
              {Object.entries(item.metadata)
                .map(([key, value]) => `${fieldLabel(key)}=${value}`)
                .join(' · ')}
            </span>
          </div>
        ))}
        {items.length > 3 && (
          <div className='px-2.5 py-1.5 text-muted-foreground'>
            {t('summary.andMore', { count: items.length - 3 })}
          </div>
        )}
      </div>
    </div>
  )
}

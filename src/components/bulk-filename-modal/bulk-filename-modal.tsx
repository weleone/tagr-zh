'use client'

import { Loader2Icon } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { type BulkFilenameApplyItem } from '@/features/songs/bulk-filename'
import { type BulkTarget } from '@/features/songs/bulk-target'
import { useBulkFilenameSongs } from '@/features/songs/hooks/use-bulk-filename'
import {
  buildFilenameItems,
  compileFilenameTemplate,
  FILENAME_TEMPLATE_FIELDS,
  FILENAME_TEMPLATE_PRESETS
} from './filename-template'

interface BulkFilenameModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  target: BulkTarget | null
  onSubmit: (submission: BulkFilenameSubmission) => void
}

export interface BulkFilenameSubmission {
  items: BulkFilenameApplyItem[]
  template: string
}

/**
 * Filename-template parsing for a selection: the user types a template such as
 * `{title}-{album}-{publisher}`, each selected song's file name is split by it, and the
 * parsed values are written as tags. Works from any view that can select songs.
 */
export function BulkFilenameModal({ open, onOpenChange, target, onSubmit }: BulkFilenameModalProps) {
  const t = useTranslations('bulkFilename')
  const tFields = useTranslations('fields')
  const tCommon = useTranslations('common')

  const [template, setTemplate] = useState('{title}-{album}-{publisher}')
  const cursorRef = useRef<number | null>(null)
  const { data: songs, isPending, error } = useBulkFilenameSongs(open ? target : null)

  const compiled = useMemo(() => compileFilenameTemplate(template), [template])
  const items = useMemo(() => {
    if (!compiled.ok || !songs) return []
    return buildFilenameItems(compiled.template, songs)
  }, [compiled, songs])
  const matchedIds = useMemo(() => new Set(items.map(item => item.songId)), [items])

  const fieldLabel = (key: string) => {
    const descriptor = FILENAME_TEMPLATE_FIELDS.find(field => field.key === key)
    return descriptor ? tFields(descriptor.labelKey) : key
  }

  const insertPlaceholder = (key: string) => {
    const placeholder = `{${key}}`
    const at = cursorRef.current ?? template.length
    setTemplate(template.slice(0, at) + placeholder + template.slice(at))
    cursorRef.current = at + placeholder.length
  }

  const templateError =
    !compiled.ok && compiled.error === 'noPlaceholder'
      ? t('errorNoPlaceholder')
      : !compiled.ok && compiled.error === 'unknownField'
        ? t('errorUnknownField', { field: compiled.field })
        : null

  const handleSubmit = () => {
    if (items.length === 0) return
    onSubmit({ items, template })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-3xl max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden'>
        <DialogHeader className='shrink-0 border-b px-4 pt-4 pb-3'>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        <div className='flex flex-col gap-4 overflow-y-auto px-4 py-4'>
          <div className='flex flex-col gap-2'>
            <Label htmlFor='filename-template'>{t('templateLabel')}</Label>
            <Input
              id='filename-template'
              value={template}
              onChange={e => setTemplate(e.target.value)}
              onSelect={e => {
                cursorRef.current = e.currentTarget.selectionStart
              }}
              placeholder='{title}-{album}-{publisher}'
            />
            <div className='flex flex-wrap gap-1.5'>
              {FILENAME_TEMPLATE_PRESETS.map(key => (
                <Button
                  key={key}
                  type='button'
                  variant='outline'
                  size='sm'
                  className='h-7 px-2 text-xs'
                  onClick={() => insertPlaceholder(key)}>
                  {fieldLabel(key)}
                </Button>
              ))}
            </div>
            <p className='text-xs text-muted-foreground'>{t('templateHint')}</p>
            {templateError && <p className='text-xs text-destructive'>{templateError}</p>}
          </div>

          {isPending && !error && (
            <div className='flex h-32 items-center justify-center'>
              <Loader2Icon className='h-5 w-5 animate-spin text-muted-foreground' />
            </div>
          )}

          {error && <p className='text-sm text-destructive'>{error.message}</p>}

          {!isPending && !error && songs && (
            <div className='flex flex-col gap-2'>
              <p className='text-sm font-semibold'>
                {t('previewTitle', { matched: items.length, total: songs.length })}
              </p>
              <div className='flex flex-col divide-y rounded-lg border'>
                {songs.map(song => {
                  const item = items.find(entry => entry.songId === song.id)
                  return (
                    <div key={song.id} className='flex flex-col gap-0.5 px-3 py-2 text-sm'>
                      <span className='truncate font-medium'>{song.fileName}</span>
                      {item ? (
                        <span className='text-xs text-muted-foreground'>
                          {Object.entries(item.metadata)
                            .map(([key, value]) => `${fieldLabel(key)}=${value}`)
                            .join(' · ')}
                        </span>
                      ) : (
                        <span className='text-xs text-destructive'>{t('noMatch')}</span>
                      )}
                    </div>
                  )
                })}
              </div>
              {songs.length > 0 && matchedIds.size === 0 && (
                <p className='text-xs text-destructive'>{t('nothingMatched')}</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className='shrink-0 border-t px-4 py-3'>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            {tCommon('cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={items.length === 0 || !compiled.ok}>
            {t('next', { count: items.length })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

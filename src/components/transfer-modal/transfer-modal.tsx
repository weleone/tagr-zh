'use client'

import { Loader2Icon, RefreshCwIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { buildBulkTargetFromSelection } from '@/features/songs/bulk-target-helpers'
import { useFetchFiles, useTransferIn, useTransferOut } from '@/features/songs/hooks/use-transfer'
import { formatFileSize } from '@/lib/formatters'
import { useBulkSelectionStore } from '@/stores/bulk-selection-store'

interface TransferModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * 汽水 ↔ Tagr 文件转移（tagr-zh 新增）。
 * 入库：把汽水 fetch 目录里的新歌移进曲库，改标签。
 * 出库：把曲库里已改好标签的歌移回汽水目录（播放器挂载点能看到）。
 */
export function TransferModal({ open, onOpenChange }: TransferModalProps) {
  const t = useTranslations('transfer')
  const tCommon = useTranslations('common')

  const [tab, setTab] = useState<'in' | 'out'>('in')
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [doneMessage, setDoneMessage] = useState<string | null>(null)

  const {
    data: fetchData,
    isPending: fetchPending,
    isFetching: fetchFetching,
    error: fetchError,
    refetch: refetchFetch
  } = useFetchFiles(open && tab === 'in')
  const transferIn = useTransferIn()
  const transferOut = useTransferOut()

  const selection = useBulkSelectionStore(s => s.selection)
  const outTarget = useMemo(() => (open ? buildBulkTargetFromSelection(selection) : null), [open, selection])
  const outCount = useMemo(() => {
    if (!selection) return 0
    if (selection.mode === 'explicit') return selection.ids.size
    if (selection.resolvedTotal === null) return 0
    return Math.max(0, selection.resolvedTotal - selection.exclusions.size)
  }, [selection])

  const fetchFiles = fetchData?.files ?? []
  const allChecked = fetchFiles.length > 0 && fetchFiles.every(file => checked.has(file.name))

  const toggleFile = (name: string) => {
    setChecked(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const toggleAll = () => {
    if (allChecked) {
      setChecked(new Set())
    } else {
      setChecked(new Set(fetchFiles.map(file => file.name)))
    }
  }

  const handleTransferIn = () => {
    const files = [...checked]
    if (files.length === 0) return
    setDoneMessage(null)
    transferIn.mutate(
      { files },
      {
        onSuccess: data => {
          const okCount = data.results.filter(result => result.ok).length
          const failCount = data.results.length - okCount
          setDoneMessage(t('inDone', { ok: okCount, fail: failCount }))
          setChecked(new Set())
        }
      }
    )
  }

  const handleTransferOut = () => {
    if (!outTarget || outCount === 0) return
    setDoneMessage(null)
    transferOut.mutate(
      { target: outTarget },
      {
        onSuccess: data => {
          const okCount = data.results.filter(result => result.ok).length
          const failCount = data.results.length - okCount
          setDoneMessage(t('outDone', { ok: okCount, fail: failCount }))
        }
      }
    )
  }

  const busy = transferIn.isPending || transferOut.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-2xl max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden'>
        <DialogHeader className='shrink-0 border-b px-4 pt-4 pb-3'>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={value => setTab(value as 'in' | 'out')} className='flex min-h-0 flex-1 flex-col'>
          <div className='shrink-0 border-b px-4 pt-3'>
            <TabsList>
              <TabsTrigger value='in'>{t('inTab')}</TabsTrigger>
              <TabsTrigger value='out'>{t('outTab')}</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value='in' className='flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4'>
            <p className='text-xs text-muted-foreground'>{t('inHint')}</p>

            {fetchPending && (
              <div className='flex h-32 items-center justify-center'>
                <Loader2Icon className='h-5 w-5 animate-spin text-muted-foreground' />
              </div>
            )}

            {!fetchPending && fetchError && <p className='text-sm text-destructive'>{t('fetchError')}</p>}

            {!fetchPending && !fetchError && fetchData && !fetchData.exists && (
              <p className='text-sm text-muted-foreground'>{t('fetchMissing')}</p>
            )}

            {!fetchPending && !fetchError && fetchData?.exists && fetchFiles.length === 0 && (
              <p className='text-sm text-muted-foreground'>{t('fetchEmpty')}</p>
            )}

            {fetchFiles.length > 0 && (
              <>
                <div className='flex items-center justify-between gap-2'>
                  <label className='flex cursor-pointer items-center gap-2 text-sm font-medium'>
                    <Checkbox checked={allChecked} onCheckedChange={toggleAll} />
                    {t('selectAll', { count: fetchFiles.length })}
                  </label>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={() => void refetchFetch()}
                    disabled={fetchFetching || busy}>
                    <RefreshCwIcon className={`h-4 w-4 ${fetchFetching ? 'animate-spin' : ''}`} />
                    {t('refresh')}
                  </Button>
                </div>
                <div className='flex flex-col divide-y rounded-md border'>
                  {fetchFiles.map(file => (
                    <label key={file.name} className='flex cursor-pointer items-center gap-2 px-3 py-2 text-sm'>
                      <Checkbox checked={checked.has(file.name)} onCheckedChange={() => toggleFile(file.name)} />
                      <span className='min-w-0 flex-1 truncate'>{file.name}</span>
                      <span className='shrink-0 text-xs text-muted-foreground'>{formatFileSize(file.size)}</span>
                    </label>
                  ))}
                </div>
              </>
            )}

            {doneMessage && <p className='text-sm text-muted-foreground'>{doneMessage}</p>}

            <div className='flex justify-end'>
              <Button onClick={handleTransferIn} disabled={checked.size === 0 || busy}>
                {transferIn.isPending && <Loader2Icon className='mr-2 h-4 w-4 animate-spin' />}
                {t('inAction', { count: checked.size })}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value='out' className='flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4'>
            <p className='text-xs text-muted-foreground'>{t('outHint')}</p>

            {outCount === 0 ? (
              <p className='text-sm text-muted-foreground'>{t('outNoSelection')}</p>
            ) : (
              <p className='text-sm'>{t('outSelected', { count: outCount })}</p>
            )}

            {doneMessage && <p className='text-sm text-muted-foreground'>{doneMessage}</p>}

            <div className='flex justify-end'>
              <Button onClick={handleTransferOut} disabled={!outTarget || outCount === 0 || busy}>
                {transferOut.isPending && <Loader2Icon className='mr-2 h-4 w-4 animate-spin' />}
                {t('outAction', { count: outCount })}
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <div className='flex shrink-0 justify-end border-t px-4 py-3'>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            {tCommon('cancel')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

'use client'

import { Loader2Icon, RefreshCwIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { buildBulkTargetFromSelection } from '@/features/songs/bulk-target-helpers'
import { useFetchFiles, useTransferIn, useTransferOut, useTransferOutList } from '@/features/songs/hooks/use-transfer'
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

  const [tab, setTab] = useState<'in' | 'out'>('in')
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [doneMessage, setDoneMessage] = useState<string | null>(null)

  /** 把后端的 error 码翻成能看懂的原因；rename 抛出的原始错误直接显示。 */
  const errorReason = (error: string | undefined): string => {
    if (!error) return t('errOther', { error: 'unknown' })
    if (error === 'invalidName') return t('errInvalidName')
    if (error === 'notFound') return t('errNotFound')
    if (error === 'alreadyExists') return t('errAlreadyExists')
    if (error === 'outsideLibrary') return t('errOutsideLibrary')
    return t('errOther', { error })
  }

  /** 失败明细：每行 "文件名：原因"，拼到完成消息后面。 */
  const failDetails = (results: { name: string; ok: boolean; error?: string }[]): string | null => {
    const failed = results.filter(result => !result.ok)
    if (failed.length === 0) return null
    const lines = failed.map(result => `${result.name}：${errorReason(result.error)}`)
    return t('failDetail', { details: lines.join('；') })
  }

  const {
    data: fetchData,
    isPending: fetchPending,
    isFetching: fetchFetching,
    error: fetchError,
    refetch: refetchFetch
  } = useFetchFiles(open)
  const transferIn = useTransferIn()
  const transferOut = useTransferOut()

  const selection = useBulkSelectionStore(s => s.selection)
  const outTarget = useMemo(() => (open ? buildBulkTargetFromSelection(selection) : null), [open, selection])
  const {
    data: outListData,
    isPending: outListPending,
    error: outListError
  } = useTransferOutList(outTarget, open && tab === 'out')
  const outSongs = outListData?.songs ?? []
  const outCount = useMemo(() => {
    if (!selection) return 0
    if (selection.mode === 'explicit') return selection.ids.size
    if (selection.resolvedTotal === null) return 0
    return Math.max(0, selection.resolvedTotal - selection.exclusions.size)
  }, [selection])

  const fetchFiles = fetchData?.files ?? []
  const dirs = fetchData?.dirs
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
          const base = t('inDone', { ok: okCount, fail: failCount })
          const detail = failDetails(data.results)
          setDoneMessage(detail ? `${base} ${detail}` : base)
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
          const base = t('outDone', { ok: okCount, fail: failCount })
          const detail = failDetails(data.results)
          setDoneMessage(detail ? `${base} ${detail}` : base)
        }
      }
    )
  }

  /** 出库下载到本地：已选歌曲逐个走 /api/songs/[id]/download 下到浏览器，
   * 不动曲库文件也不删记录。多个时逐个触发，间隔 300ms 防浏览器拦截。 */
  const handleDownloadOut = () => {
    if (outSongs.length === 0) return
    outSongs.forEach((song, index) => {
      window.setTimeout(() => {
        const a = document.createElement('a')
        a.href = `/api/songs/${song.id}/download`
        a.download = song.fileName
        document.body.appendChild(a)
        a.click()
        a.remove()
      }, index * 300)
    })
  }

  const busy = transferIn.isPending || transferOut.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-2xl max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden'>
        <DialogHeader className='shrink-0 border-b px-4 pt-4 pb-3'>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
          {dirs && (
            <p className='font-mono text-xs text-muted-foreground break-all'>
              {t('source')}：{tab === 'in' ? dirs.fetch : dirs.library}
            </p>
          )}
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
            {dirs && (
              <p className='font-mono text-xs text-muted-foreground break-all'>
                {t('inPath')}：{dirs.library}
              </p>
            )}

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

            {doneMessage && (
              <div className='flex items-start justify-between gap-2'>
                <p className='min-w-0 flex-1 text-sm text-muted-foreground'>{doneMessage}</p>
                <Button type='button' variant='ghost' size='sm' onClick={() => setDoneMessage(null)}>
                  {t('clearDone')}
                </Button>
              </div>
            )}

            <div className='flex justify-end'>
              <Button onClick={handleTransferIn} disabled={checked.size === 0 || busy}>
                {transferIn.isPending && <Loader2Icon className='mr-2 h-4 w-4 animate-spin' />}
                {t('inAction', { count: checked.size })}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value='out' className='flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4'>
            <p className='text-xs text-muted-foreground'>{t('outHint')}</p>
            {dirs && (
              <p className='font-mono text-xs text-muted-foreground break-all'>
                {t('outPath')}：{dirs.qishui}
              </p>
            )}

            {outCount === 0 ? (
              <p className='text-sm text-muted-foreground'>{t('outNoSelection')}</p>
            ) : (
              <>
                <p className='text-sm'>{t('outSelected', { count: outCount })}</p>
                {outListPending && (
                  <div className='flex h-16 items-center justify-center'>
                    <Loader2Icon className='h-5 w-5 animate-spin text-muted-foreground' />
                  </div>
                )}
                {!outListPending && outListError && (
                  <p className='text-sm text-destructive'>{t('outListError')}</p>
                )}
                {!outListPending && !outListError && outSongs.length > 0 && (
                  <div className='flex flex-col divide-y rounded-md border'>
                    {outSongs.map(song => (
                      <div key={song.id} className='flex items-center gap-2 px-3 py-2 text-sm'>
                        <span className='min-w-0 flex-1 truncate'>
                          {song.title ? `${song.title}${song.artist ? ` - ${song.artist}` : ''}` : song.fileName}
                        </span>
                        <span className='shrink-0 text-xs text-muted-foreground'>{song.fileName}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {doneMessage && (
              <div className='flex items-start justify-between gap-2'>
                <p className='min-w-0 flex-1 text-sm text-muted-foreground'>{doneMessage}</p>
                <Button type='button' variant='ghost' size='sm' onClick={() => setDoneMessage(null)}>
                  {t('clearDone')}
                </Button>
              </div>
            )}

            <div className='flex flex-col items-end gap-2'>
              <Button onClick={handleTransferOut} disabled={!outTarget || outCount === 0 || busy}>
                {transferOut.isPending && <Loader2Icon className='mr-2 h-4 w-4 animate-spin' />}
                {t('outAction', { count: outCount })}
              </Button>
              <Button
                type='button'
                variant='outline'
                onClick={handleDownloadOut}
                disabled={outSongs.length === 0 || busy}>
                {t('outDownload', { count: outSongs.length })}
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <div className='flex shrink-0 justify-end border-t px-4 py-3'>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            {t('close')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

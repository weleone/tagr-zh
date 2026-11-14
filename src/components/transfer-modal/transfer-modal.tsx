'use client'

import { Loader2Icon, RefreshCwIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { buildBulkTargetFromSelection } from '@/features/songs/bulk-target-helpers'
import { useFetchFiles, useTransferIn, useTransferOut, useTransferOutList, checkTransferOutConflicts, type OutConflict } from '@/features/songs/hooks/use-transfer'
import { formatFileSize } from '@/lib/formatters'
import { useBulkSelectionStore } from '@/stores/bulk-selection-store'

interface TransferModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * 汽水 ↔ Tagr 文件转移（tagr-zh 新增）。
 * 入库：把汽水 fetch 目录里的新歌移进曲库，改标签。
 * 出库：把曲库里已改好标签的歌复制到汽水目录（播放器挂载点能看到），
 * 复制后歌仍留在曲库里，不想留了再手动删。
 */
export function TransferModal({ open, onOpenChange }: TransferModalProps) {
  const t = useTranslations('transfer')

  const [tab, setTab] = useState<'in' | 'out'>('in')
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [doneMessage, setDoneMessage] = useState<string | null>(null)
  /** 出库同名冲突弹窗：null=不显示，非 null=显示冲突清单等用户选覆盖/跳过 */
  const [outConflicts, setOutConflicts] = useState<OutConflict[] | null>(null)
  const [checkingConflicts, setCheckingConflicts] = useState(false)

  /**
   * 把后端的 error 码翻成能看懂的原因；rename 抛出的原始错误直接显示。
   * alreadyExists 的说法分方向：入库是曲库里已有，出库是汽水目录里已有。
   */
  const errorReason = (error: string | undefined, direction: 'in' | 'out' = 'in'): string => {
    if (!error) return t('errOther', { error: 'unknown' })
    if (error === 'invalidName') return t('errInvalidName')
    if (error === 'notFound') return t('errNotFound')
    if (error === 'alreadyExists') return direction === 'out' ? t('errAlreadyExistsOut') : t('errAlreadyExists')
    if (error === 'outsideLibrary') return t('errOutsideLibrary')
    return t('errOther', { error })
  }

  /** 失败明细：每行 "文件名：原因"，拼到完成消息后面（只列真失败，不含主动跳过的）。 */
  const failDetails = (results: { name: string; ok: boolean; error?: string }[]): string | null => {
    const failed = results.filter(result => !result.ok && result.error !== 'alreadyExists')
    if (failed.length === 0) return null
    const lines = failed.map(result => `${result.name}：${errorReason(result.error, 'out')}`)
    return t('failDetail', { details: lines.join('；') })
  }

  /** 跳过明细：主动跳过的同名文件（出库：汽水目录里已有），每行 "文件名：原因"。 */
  const skipDetails = (results: { name: string; ok: boolean; error?: string }[]): string | null => {
    const skipped = results.filter(result => !result.ok && result.error === 'alreadyExists')
    if (skipped.length === 0) return null
    const lines = skipped.map(result => `${result.name}：${errorReason(result.error, 'out')}`)
    return t('skipDetail', { details: lines.join('；') })
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

  /** 出库：先查汽水目录有没有同名文件，有就弹窗让用户选覆盖/跳过
   * （弹窗里列两边的文件大小），没有直接复制。 */
  const handleTransferOut = async () => {
    if (!outTarget || outCount === 0) return
    setDoneMessage(null)
    setCheckingConflicts(true)
    let conflicts: OutConflict[]
    try {
      conflicts = await checkTransferOutConflicts(outTarget)
    } catch {
      // 查冲突失败时按无冲突处理（服务端复制时仍会跳过同名文件，不会丢数据）
      conflicts = []
    } finally {
      setCheckingConflicts(false)
    }
    if (conflicts.length > 0) {
      setOutConflicts(conflicts)
      return
    }
    doTransferOut(false)
  }

  const doTransferOut = (overwrite: boolean) => {
    if (!outTarget) return
    setOutConflicts(null)
    setDoneMessage(null)
    transferOut.mutate(
      { target: outTarget, overwrite },
      {
        onSuccess: data => {
          const okCount = data.results.filter(result => result.ok).length
          const skippedCount = data.results.filter(result => !result.ok && result.error === 'alreadyExists').length
          const failCount = data.results.length - okCount - skippedCount
          const parts = [t('outDoneOk', { ok: okCount })]
          if (skippedCount > 0) parts.push(t('outDoneSkipped', { skipped: skippedCount }))
          if (failCount > 0) parts.push(t('outDoneFail', { fail: failCount }))
          const base = `${t('outDonePrefix')}：${parts.join('，')}。`
          const details = [skipDetails(data.results), failDetails(data.results)].filter(Boolean)
          setDoneMessage(details.length > 0 ? `${base} ${details.join(' ')}` : base)
        }
      }
    )
  }

  /** 出库下载到本地：已选歌曲原文件一个个下到本地，不打包。
   * APK 里走 JS 桥 DownloadBridge：一次把清单给 APK，只弹一次保存框，
   * 由 APK 逐个下到所选位置；浏览器里没这个桥，改走 zip 打包下载。 */
  const handleDownloadOut = () => {
    if (outSongs.length === 0) return
    const files = outSongs.map(song => ({
      url: `${window.location.origin}/api/songs/${song.id}/download`,
      fileName: song.fileName
    }))
    const bridge = (window as unknown as { DownloadBridge?: { downloadFiles: (json: string) => void } }).DownloadBridge
    if (bridge && typeof bridge.downloadFiles === 'function') {
      bridge.downloadFiles(JSON.stringify(files))
      return
    }
    const ids = outSongs.map(song => song.id).join(',')
    const a = document.createElement('a')
    a.href = `/api/songs/transfer/out-download-zip?ids=${encodeURIComponent(ids)}`
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  const busy = transferIn.isPending || transferOut.isPending

  return (
    <>
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
              <Button onClick={handleTransferOut} disabled={!outTarget || outCount === 0 || busy || checkingConflicts}>
                {(transferOut.isPending || checkingConflicts) && <Loader2Icon className='mr-2 h-4 w-4 animate-spin' />}
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

    {/* 出库同名冲突：汽水目录已有同名文件，列两边大小让用户选覆盖还是跳过 */}
    <Dialog open={outConflicts !== null} onOpenChange={openState => { if (!openState) setOutConflicts(null) }}>
      <DialogContent className='max-w-lg'>
        <DialogHeader>
          <DialogTitle>{t('outConflictTitle')}</DialogTitle>
          <DialogDescription>{t('outConflictDesc')}</DialogDescription>
        </DialogHeader>
        <div className='flex flex-col divide-y rounded-md border'>
          {(outConflicts ?? []).map(conflict => (
            <div key={conflict.songId} className='flex flex-col gap-1 px-3 py-2 text-sm'>
              <span className='min-w-0 truncate font-medium'>{conflict.fileName}</span>
              <span className='text-xs text-muted-foreground'>
                {t('outConflictLibrary', { size: formatFileSize(conflict.librarySize) })}
                {' · '}
                {t('outConflictQishui', { size: formatFileSize(conflict.qishuiSize) })}
              </span>
            </div>
          ))}
        </div>
        <div className='flex justify-end gap-2'>
          <Button variant='outline' onClick={() => doTransferOut(false)}>
            {t('outConflictSkip')}
          </Button>
          <Button onClick={() => doTransferOut(true)}>
            {t('outConflictOverwrite')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  )
}

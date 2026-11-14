'use client'

import { type BulkTarget } from '@/features/songs/bulk-target'
import { type DeleteSongResult } from '@/features/songs/delete-song'
import { invalidateSongListings } from '@/features/songs/hooks/bulk-cache-sync'
import { collectNdjsonBulkResponse, type NdjsonBulkProgress } from '@/lib/ndjson-stream'
import { useBulkSelectionStore } from '@/stores/bulk-selection-store'
import { useMutation, useQueryClient } from '@tanstack/react-query'

export type BulkDeleteProgress = NdjsonBulkProgress<DeleteSongResult>

interface BulkDeleteParams {
  target: BulkTarget
  onProgress?: (progress: BulkDeleteProgress) => void
}

async function bulkDelete({ target, onProgress }: BulkDeleteParams) {
  const response = await fetch('/api/songs/bulk', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ target })
  })

  return collectNdjsonBulkResponse<DeleteSongResult>(response, onProgress)
}

/** 批量删歌：逐首删磁盘文件 + 清数据库记录；成功后刷新列表与文件夹、清选择。 */
export function useBulkDeleteSongs() {
  const queryClient = useQueryClient()
  const clear = useBulkSelectionStore(s => s.clear)

  return useMutation({
    mutationFn: bulkDelete,
    onSuccess: data => {
      if (data.results.some(result => result.ok)) {
        invalidateSongListings(queryClient)
        void queryClient.invalidateQueries({ queryKey: ['folders'] })
      }
      clear()
    }
  })
}

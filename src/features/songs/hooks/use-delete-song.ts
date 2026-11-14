'use client'

import { invalidateSongListings } from '@/features/songs/hooks/bulk-cache-sync'
import { api } from '@/lib/axios'
import { useBulkSelectionStore } from '@/stores/bulk-selection-store'
import { useMutation, useQueryClient } from '@tanstack/react-query'

interface DeleteSongResponse {
  success: true
  songId: number
  name: string
}

interface DeleteSongError {
  success: false
  error: string
}

type DeleteSongResult = DeleteSongResponse | DeleteSongError

async function deleteSong(songId: number): Promise<string> {
  const response = await api.delete<DeleteSongResult>(`/songs/${songId}`)

  if (!response.data.success) {
    throw new Error(response.data.error)
  }

  return response.data.name
}

/** 删一首歌：删磁盘文件 + 清数据库记录；成功后刷新列表与文件夹。 */
export function useDeleteSong() {
  const queryClient = useQueryClient()
  const clear = useBulkSelectionStore(s => s.clear)

  return useMutation({
    mutationFn: deleteSong,
    onSuccess: () => {
      invalidateSongListings(queryClient)
      void queryClient.invalidateQueries({ queryKey: ['folders'] })
      clear()
    }
  })
}

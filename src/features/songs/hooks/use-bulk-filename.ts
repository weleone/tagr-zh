'use client'

import { incrementEditCount } from '@/components/star-prompt-dialog'
import { invalidateAllHistoryQueryKeys } from '@/features/history/hooks/use-history'
import { type BulkFilenameApplyItem } from '@/features/songs/bulk-filename'
import { type BulkTarget } from '@/features/songs/bulk-target'
import { type SongWithMetadata } from '@/features/songs/domain'
import { applySongUpdates, invalidateBulkTargetQueries } from '@/features/songs/hooks/bulk-cache-sync'
import { api } from '@/lib/axios'
import { collectNdjsonBulkResponse, type NdjsonBulkProgress } from '@/lib/ndjson-stream'
import { useBulkSelectionStore } from '@/stores/bulk-selection-store'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export interface BulkFilenameSong {
  id: number
  fileName: string
  folderPath: string
}

/** The selected songs; the server resolves "whole folder" or "whole playlist" selections. */
export function useBulkFilenameSongs(target: BulkTarget | null) {
  return useQuery({
    queryKey: ['filename', 'bulk-songs', target],
    queryFn: async () => {
      const response = await api.post<{ success: true; songs: BulkFilenameSong[] }>(
        '/songs/bulk/filename/songs',
        { target }
      )
      return response.data.songs
    },
    enabled: !!target,
    retry: false,
    staleTime: 0,
    gcTime: 0
  })
}

type ApplyResult =
  | { songId: number; ok: true; song: SongWithMetadata }
  | { songId: number; ok: false; error: string }

export type BulkFilenameProgress = NdjsonBulkProgress<ApplyResult>

interface ApplyParams {
  target: BulkTarget
  items: BulkFilenameApplyItem[]
  onProgress?: (progress: BulkFilenameProgress) => void
}

async function applyBulkFilename({ items, onProgress }: ApplyParams) {
  const response = await fetch('/api/songs/bulk/filename/apply', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ items })
  })

  return collectNdjsonBulkResponse<ApplyResult>(response, onProgress)
}

export function useBulkApplyFilename() {
  const queryClient = useQueryClient()
  const clear = useBulkSelectionStore(s => s.clear)

  return useMutation({
    mutationFn: applyBulkFilename,
    onSuccess: (data, variables) => {
      const updatedSongs = data.results.filter(result => result.ok).map(result => result.song)

      if (updatedSongs.length > 0) {
        applySongUpdates(queryClient, updatedSongs)
        invalidateAllHistoryQueryKeys(queryClient)
        incrementEditCount()
      }

      invalidateBulkTargetQueries(queryClient, variables.target)

      clear()
    }
  })
}

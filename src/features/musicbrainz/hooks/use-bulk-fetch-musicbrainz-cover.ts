'use client'

import { invalidateAllHistoryQueryKeys } from '@/features/history/hooks/use-history'
import { type BulkTarget } from '@/features/songs/bulk-target'
import { type SongWithMetadata } from '@/features/songs/domain'
import { applySongUpdates, invalidateBulkTargetQueries } from '@/features/songs/hooks/bulk-cache-sync'
import { collectNdjsonBulkResponse, type NdjsonBulkProgress } from '@/lib/ndjson-stream'
import { useBulkSelectionStore } from '@/stores/bulk-selection-store'
import { useMutation, useQueryClient } from '@tanstack/react-query'

type BulkCoverResult =
  | { songId: number; ok: true; song: SongWithMetadata }
  | { songId: number; ok: false; error: string }

export type BulkProgress = NdjsonBulkProgress<BulkCoverResult>

interface BulkCoverParams {
  target: BulkTarget
  onProgress?: (progress: BulkProgress) => void
}

async function bulkFetchCover(params: BulkCoverParams) {
  const { onProgress, ...payload } = params

  const response = await fetch('/api/songs/bulk/musicbrainz/fetch-cover', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload)
  })

  return collectNdjsonBulkResponse<BulkCoverResult>(response, onProgress)
}

export function useBulkFetchMusicBrainzCover() {
  const queryClient = useQueryClient()
  const clear = useBulkSelectionStore(s => s.clear)

  return useMutation({
    mutationFn: bulkFetchCover,
    onSuccess: (data, variables) => {
      const updatedSongs = data.results.filter(result => result.ok).map(result => result.song)

      if (updatedSongs.length > 0) {
        applySongUpdates(queryClient, updatedSongs)
        invalidateAllHistoryQueryKeys(queryClient)
      }

      invalidateBulkTargetQueries(queryClient, variables.target)

      clear()
    }
  })
}

'use client'

import { type BulkTarget } from '@/features/songs/bulk-target'
import { invalidateSongListings } from '@/features/songs/hooks/bulk-cache-sync'
import { type FetchFile, type TransferMoveResult, type TransferOutResult } from '@/features/songs/transfer'
import { api } from '@/lib/axios'
import { collectNdjsonBulkResponse, type NdjsonBulkProgress } from '@/lib/ndjson-stream'
import { useBulkSelectionStore } from '@/stores/bulk-selection-store'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export interface FetchListResponse {
  success: true
  exists: boolean
  dir: string
  dirs: { library: string; fetch: string; qishui: string }
  files: FetchFile[]
}

/** 汽水待入库目录里的音频文件；弹窗打开时才拉。 */
export function useFetchFiles(enabled: boolean) {
  return useQuery({
    queryKey: ['transfer', 'fetch'],
    queryFn: async () => {
      const response = await api.get<FetchListResponse>('/songs/transfer/fetch')
      return response.data
    },
    enabled,
    retry: false,
    staleTime: 0,
    gcTime: 0
  })
}

export type TransferInProgress = NdjsonBulkProgress<TransferMoveResult>

interface TransferInParams {
  files: string[]
  onProgress?: (progress: TransferInProgress) => void
}

async function transferIn({ files, onProgress }: TransferInParams) {
  const response = await fetch('/api/songs/transfer/in', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ files })
  })

  return collectNdjsonBulkResponse<TransferMoveResult>(response, onProgress)
}

export function useTransferIn() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: transferIn,
    onSuccess: data => {
      if (data.results.some(result => result.ok)) {
        invalidateSongListings(queryClient)
        void queryClient.invalidateQueries({ queryKey: ['folders'] })
      }
      void queryClient.invalidateQueries({ queryKey: ['transfer', 'fetch'] })
    }
  })
}

export interface OutListSong {
  id: number
  title: string | null
  artist: string | null
  fileName: string
}

export interface OutListResponse {
  success: true
  songs: OutListSong[]
}

/** 出库待移清单：按批量选择解析，返回已选歌曲的标题/歌手/文件名；出库页签打开且有选择时才拉。 */
export function useTransferOutList(target: BulkTarget | null, enabled: boolean) {
  return useQuery({
    queryKey: ['transfer', 'out-list', target ? JSON.stringify(target) : null],
    queryFn: async () => {
      const response = await api.post<OutListResponse>('/songs/transfer/out-list', { target })
      return response.data
    },
    enabled: enabled && !!target,
    retry: false,
    staleTime: 0,
    gcTime: 0
  })
}

export type TransferOutProgress = NdjsonBulkProgress<TransferOutResult>

interface TransferOutParams {
  target: BulkTarget
  onProgress?: (progress: TransferOutProgress) => void
}

async function transferOut({ target, onProgress }: TransferOutParams) {
  const response = await fetch('/api/songs/transfer/out', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ target })
  })

  return collectNdjsonBulkResponse<TransferOutResult>(response, onProgress)
}

export function useTransferOut() {
  const queryClient = useQueryClient()
  const clear = useBulkSelectionStore(s => s.clear)

  return useMutation({
    mutationFn: transferOut,
    onSuccess: data => {
      if (data.results.some(result => result.ok)) {
        invalidateSongListings(queryClient)
        void queryClient.invalidateQueries({ queryKey: ['folders'] })
      }
      clear()
    }
  })
}

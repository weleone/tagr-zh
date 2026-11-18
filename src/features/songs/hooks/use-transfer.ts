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
  /** 下载工具名（TRANSFER_TOOL_NAME），不设为空串，前端按语言回落。 */
  tool: string
  files: FetchFile[]
}

export interface TransferConfigResponse {
  success: true
  /** 有没有接下载工具（待入库目录有没有在 yaml 里显式设置）。 */
  configured: boolean
  /** 下载工具名（TRANSFER_TOOL_NAME），不设为空串，前端按语言回落。 */
  tool: string
}

/** 转移功能配置：主界面右上角按钮用它决定显不显示；环境变量运行期不变，查一次缓存。 */
export function useTransferConfig() {
  return useQuery({
    queryKey: ['transfer', 'config'],
    queryFn: async () => {
      const response = await api.get<TransferConfigResponse>('/songs/transfer/config')
      return response.data
    },
    retry: false,
    staleTime: Infinity,
    gcTime: Infinity
  })
}

/** 待入库目录里的音频文件；弹窗打开时才拉。 */
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

export interface OutConflict {
  songId: number
  fileName: string
  title: string | null
  artist: string | null
  librarySize: number
  qishuiSize: number
}

export interface OutConflictsResponse {
  success: true
  conflicts: OutConflict[]
}

/** 出库同名检测：查已选歌曲里哪些在下载目录已有同名文件（只查不动）。 */
export async function checkTransferOutConflicts(target: BulkTarget): Promise<OutConflict[]> {
  const response = await api.post<OutConflictsResponse>('/songs/transfer/out-conflicts', { target })
  return response.data.conflicts
}

interface TransferOutParams {
  target: BulkTarget
  overwrite?: boolean
  onProgress?: (progress: TransferOutProgress) => void
}

async function transferOut({ target, overwrite, onProgress }: TransferOutParams) {
  const response = await fetch('/api/songs/transfer/out', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ target, overwrite: overwrite ?? false })
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

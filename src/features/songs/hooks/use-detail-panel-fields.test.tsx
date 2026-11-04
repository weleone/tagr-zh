import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'

const { mockGet, mockPut } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPut: vi.fn()
}))

vi.mock('@/lib/axios', () => ({
  api: { get: mockGet, put: mockPut }
}))

import { useDetailPanelFields } from './use-detail-panel-fields'

function renderUseDetailPanelFields() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  return renderHook(() => useDetailPanelFields(), { wrapper })
}

function mockStoredConfig(value: string | null) {
  mockGet.mockResolvedValue({ data: { success: true, value } })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useDetailPanelFields', () => {
  it('reads the detailPanelFields config', async () => {
    mockStoredConfig(null)

    renderUseDetailPanelFields()

    await waitFor(() => expect(mockGet).toHaveBeenCalledWith('/config', { params: { key: 'detailPanelFields' } }))
  })

  it('shows every field when nothing is stored', async () => {
    mockStoredConfig(null)

    const { result } = renderUseDetailPanelFields()

    await waitFor(() => expect(mockGet).toHaveBeenCalled())
    expect(result.current.fields).toEqual({})
    expect(result.current.isFieldVisible('title')).toBe(true)
    expect(result.current.isCustomTagVisible('MOOD')).toBe(true)
  })

  it('hides the stored fields and custom tags', async () => {
    mockStoredConfig(JSON.stringify({ hidden: ['title', 'lyrics'], hiddenCustom: ['MOOD'] }))

    const { result } = renderUseDetailPanelFields()

    await waitFor(() => expect(result.current.isFieldVisible('title')).toBe(false))
    expect(result.current.isFieldVisible('lyrics')).toBe(false)
    expect(result.current.isFieldVisible('artist')).toBe(true)
    expect(result.current.isCustomTagVisible('MOOD')).toBe(false)
    expect(result.current.isCustomTagVisible('ENERGY')).toBe(true)
  })

  it('falls back to showing everything when the stored value is not valid JSON', async () => {
    mockStoredConfig('not json')

    const { result } = renderUseDetailPanelFields()

    await waitFor(() => expect(mockGet).toHaveBeenCalled())
    await waitFor(() => expect(result.current.fields).toEqual({}))
    expect(result.current.isFieldVisible('title')).toBe(true)
  })

  it('saves the config and applies it optimistically', async () => {
    mockStoredConfig(null)
    const next = { hidden: ['genre' as const], hiddenCustom: ['MOOD'] }
    mockPut.mockResolvedValue({
      data: { success: true, key: 'detailPanelFields', value: JSON.stringify(next) }
    })

    const { result } = renderUseDetailPanelFields()
    await waitFor(() => expect(mockGet).toHaveBeenCalled())

    act(() => result.current.saveFields(next))

    await waitFor(() =>
      expect(mockPut).toHaveBeenCalledWith('/config', { key: 'detailPanelFields', value: JSON.stringify(next) })
    )
    await waitFor(() => expect(result.current.isFieldVisible('genre')).toBe(false))
    expect(result.current.isCustomTagVisible('MOOD')).toBe(false)
  })
})

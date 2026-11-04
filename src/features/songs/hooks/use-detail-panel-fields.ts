'use client'

import { useCallback } from 'react'
import { DEFAULT_DETAIL_PANEL_FIELDS, type DetailPanelFieldsState } from '@/features/config/domain'
import { useConfig } from '@/features/config/hooks/use-config'
import { useUpdateConfig } from '@/features/config/hooks/use-update-config'
import { genericJsonObjectParser } from '@/features/config/parsers'
import type { DetailPanelField } from '@/features/songs/detail-panel-fields'

const CONFIG_KEY = 'detailPanelFields'

const parse = (value: string | null) =>
  genericJsonObjectParser<DetailPanelFieldsState>(value) ?? DEFAULT_DETAIL_PANEL_FIELDS

export function useDetailPanelFields() {
  const { data } = useConfig<DetailPanelFieldsState>({
    key: CONFIG_KEY,
    parser: parse,
    defaultData: DEFAULT_DETAIL_PANEL_FIELDS
  })
  const { mutate } = useUpdateConfig({ parser: parse })

  const fields = data ?? DEFAULT_DETAIL_PANEL_FIELDS

  const isFieldVisible = useCallback((field: DetailPanelField) => !fields.hidden?.includes(field), [fields])

  const isCustomTagVisible = useCallback((key: string) => !fields.hiddenCustom?.includes(key), [fields])

  const saveFields = useCallback(
    (next: DetailPanelFieldsState) => mutate({ key: CONFIG_KEY, value: JSON.stringify(next) }),
    [mutate]
  )

  return { fields, isFieldVisible, isCustomTagVisible, saveFields }
}

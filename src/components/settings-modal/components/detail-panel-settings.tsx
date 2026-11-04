'use client'

import { RotateCcwIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { DETAIL_PANEL_SECTIONS, type DetailPanelField } from '@/features/songs/detail-panel-fields'
import { useDetailPanelFields } from '@/features/songs/hooks/use-detail-panel-fields'
import { useMetadataKeys } from '@/features/songs/hooks/use-metadata-keys'

type CheckedState = boolean | 'indeterminate'

function checkedState(visibleCount: number, total: number): CheckedState {
  if (visibleCount === 0) return false
  return visibleCount === total ? true : 'indeterminate'
}

interface FieldCheckboxProps {
  id: string
  label: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}

function FieldCheckbox({ id, label, checked, onCheckedChange }: FieldCheckboxProps) {
  return (
    <div className='flex min-w-0 items-center gap-2'>
      <Checkbox id={id} checked={checked} onCheckedChange={value => onCheckedChange(value === true)} />
      <Label htmlFor={id} className='truncate font-normal'>
        {label}
      </Label>
    </div>
  )
}

export function DetailPanelSettings() {
  const t = useTranslations('detailPanelSettings')
  const tRoot = useTranslations()
  const tFields = useTranslations('fields')
  const { fields, isFieldVisible, isCustomTagVisible, saveFields } = useDetailPanelFields()
  const { data: metadataKeys = [] } = useMetadataKeys()

  const hidden = fields.hidden ?? []
  const hiddenCustom = fields.hiddenCustom ?? []

  const setFieldsVisible = (targets: readonly DetailPanelField[], visible: boolean) => {
    const rest = hidden.filter(field => !targets.includes(field))
    saveFields({ ...fields, hidden: visible ? rest : [...rest, ...targets] })
  }

  const setCustomTagsVisible = (targets: readonly string[], visible: boolean) => {
    const rest = hiddenCustom.filter(key => !targets.includes(key))
    saveFields({ ...fields, hiddenCustom: visible ? rest : [...rest, ...targets] })
  }

  const hasHiddenFields = hidden.length > 0 || hiddenCustom.length > 0

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex items-start justify-between gap-2'>
        <div>
          <h3 className='text-sm font-semibold'>{t('title')}</h3>
          <p className='text-xs text-muted-foreground'>{t('description')}</p>
        </div>
        <Button size='sm' variant='outline' disabled={!hasHiddenFields} onClick={() => saveFields({})}>
          <RotateCcwIcon className='h-4 w-4' />
          {t('showAll')}
        </Button>
      </div>

      {DETAIL_PANEL_SECTIONS.map((section, index) => {
        const isCustom = section.id === 'customTags'
        const keys: readonly string[] = isCustom ? metadataKeys : section.fields
        const isVisible = (key: string) =>
          isCustom ? isCustomTagVisible(key) : isFieldVisible(key as DetailPanelField)
        const setVisible = (targets: readonly string[], visible: boolean) =>
          isCustom ? setCustomTagsVisible(targets, visible) : setFieldsVisible(targets as DetailPanelField[], visible)
        const visibleCount = keys.filter(isVisible).length

        return (
          <div key={section.id} className='flex flex-col gap-3'>
            {index > 0 && <Separator />}
            <div className='flex items-center gap-2'>
              <Checkbox
                id={`detail-panel-section-${section.id}`}
                checked={checkedState(visibleCount, keys.length)}
                disabled={keys.length === 0}
                onCheckedChange={value => setVisible(keys, value === true)}
              />
              <Label
                htmlFor={`detail-panel-section-${section.id}`}
                className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                {tRoot(section.titleKey)}
              </Label>
            </div>

            {keys.length === 0 ? (
              <p className='pl-6 text-xs text-muted-foreground'>{t('noCustomTags')}</p>
            ) : (
              <div className='grid grid-cols-1 gap-2 pl-6 sm:grid-cols-2'>
                {keys.map(key => (
                  <FieldCheckbox
                    key={key}
                    id={`detail-panel-field-${section.id}-${key}`}
                    label={isCustom ? key : tFields(key)}
                    checked={isVisible(key)}
                    onCheckedChange={visible => setVisible([key], visible)}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

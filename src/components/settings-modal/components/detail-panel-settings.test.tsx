import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { DetailPanelFieldsState } from '@/features/config/domain'
import { getDetailPanelSectionFields } from '@/features/songs/detail-panel-fields'

const { mockFields, mockSaveFields, mockMetadataKeys } = vi.hoisted(() => ({
  mockFields: { current: {} as DetailPanelFieldsState },
  mockSaveFields: vi.fn(),
  mockMetadataKeys: { current: [] as string[] }
}))

vi.mock('@/features/songs/hooks/use-detail-panel-fields', () => ({
  useDetailPanelFields: () => ({
    fields: mockFields.current,
    isFieldVisible: (field: string) => !mockFields.current.hidden?.includes(field as never),
    isCustomTagVisible: (key: string) => !mockFields.current.hiddenCustom?.includes(key),
    saveFields: mockSaveFields
  })
}))

vi.mock('@/features/songs/hooks/use-metadata-keys', () => ({
  useMetadataKeys: () => ({ data: mockMetadataKeys.current })
}))

import { DetailPanelSettings } from './detail-panel-settings'

function renderSettings(fields: DetailPanelFieldsState = {}, metadataKeys: string[] = []) {
  mockFields.current = fields
  mockMetadataKeys.current = metadataKeys
  const user = userEvent.setup()
  render(<DetailPanelSettings />)
  return user
}

const checkbox = (name: string) => screen.getByRole('checkbox', { name })

beforeEach(() => {
  vi.clearAllMocks()
})

describe('DetailPanelSettings', () => {
  it('lists the fields of every section', () => {
    renderSettings()

    expect(checkbox('fields.title')).toBeInTheDocument()
    expect(checkbox('fields.lyrics')).toBeInTheDocument()
    expect(checkbox('fields.discTotal')).toBeInTheDocument()
    expect(checkbox('fields.bitrate')).toBeInTheDocument()
    expect(checkbox('fields.lastPlayed')).toBeInTheDocument()
    expect(checkbox('fields.filePath')).toBeInTheDocument()
  })

  it('reflects the stored visibility', () => {
    renderSettings({ hidden: ['title'], hiddenCustom: ['MOOD'] }, ['MOOD', 'ENERGY'])

    expect(checkbox('fields.title')).not.toBeChecked()
    expect(checkbox('fields.artist')).toBeChecked()
    expect(checkbox('MOOD')).not.toBeChecked()
    expect(checkbox('ENERGY')).toBeChecked()
  })

  it('hides a field', async () => {
    const user = renderSettings({ hidden: ['genre'] })

    await user.click(checkbox('fields.title'))

    expect(mockSaveFields).toHaveBeenCalledWith({ hidden: ['genre', 'title'] })
  })

  it('shows a hidden field again', async () => {
    const user = renderSettings({ hidden: ['genre', 'title'] })

    await user.click(checkbox('fields.title'))

    expect(mockSaveFields).toHaveBeenCalledWith({ hidden: ['genre'] })
  })

  it('keeps the custom tag config when toggling a standard field', async () => {
    const user = renderSettings({ hiddenCustom: ['MOOD'] }, ['MOOD'])

    await user.click(checkbox('fields.comment'))

    expect(mockSaveFields).toHaveBeenCalledWith({ hidden: ['comment'], hiddenCustom: ['MOOD'] })
  })

  it('lists the library custom tags and hides one', async () => {
    const user = renderSettings({}, ['ENERGY', 'MOOD'])

    await user.click(checkbox('MOOD'))

    expect(mockSaveFields).toHaveBeenCalledWith({ hiddenCustom: ['MOOD'] })
  })

  it('says when the library has no custom tags', () => {
    renderSettings()

    expect(screen.getByText('detailPanelSettings.noCustomTags')).toBeInTheDocument()
  })

  describe('section checkbox', () => {
    const sectionCheckbox = (id: string) => document.getElementById(`detail-panel-section-${id}`)!

    it('is checked when every field of the section is visible', () => {
      renderSettings()

      expect(sectionCheckbox('notes')).toHaveAttribute('data-state', 'checked')
    })

    it('is indeterminate when only some fields are visible', () => {
      renderSettings({ hidden: ['comment'] })

      expect(sectionCheckbox('notes')).toHaveAttribute('data-state', 'indeterminate')
    })

    it('is unchecked when every field is hidden', () => {
      renderSettings({ hidden: ['comment', 'lyrics'] })

      expect(sectionCheckbox('notes')).toHaveAttribute('data-state', 'unchecked')
    })

    it('hides every field of the section', async () => {
      const user = renderSettings({ hidden: ['comment'] })

      await user.click(sectionCheckbox('musicInfo'))

      expect(mockSaveFields).toHaveBeenCalledWith({
        hidden: ['comment', ...getDetailPanelSectionFields('musicInfo')]
      })
    })

    it('shows every field of the section when some are hidden', async () => {
      const user = renderSettings({ hidden: ['comment', 'title'] })

      // Indeterminate checkboxes become checked on click.
      await user.click(sectionCheckbox('notes'))

      expect(mockSaveFields).toHaveBeenCalledWith({ hidden: ['title'] })
    })

    it('hides every custom tag', async () => {
      const user = renderSettings({}, ['ENERGY', 'MOOD'])

      await user.click(sectionCheckbox('customTags'))

      expect(mockSaveFields).toHaveBeenCalledWith({ hiddenCustom: ['ENERGY', 'MOOD'] })
    })

    it('is disabled for custom tags when the library has none', () => {
      renderSettings()

      expect(sectionCheckbox('customTags')).toBeDisabled()
    })
  })

  describe('show all', () => {
    it('is disabled when nothing is hidden', () => {
      renderSettings()

      expect(screen.getByRole('button', { name: 'detailPanelSettings.showAll' })).toBeDisabled()
    })

    it('clears every hidden field and custom tag', async () => {
      const user = renderSettings({ hidden: ['title'], hiddenCustom: ['MOOD'] }, ['MOOD'])

      await user.click(screen.getByRole('button', { name: 'detailPanelSettings.showAll' }))

      expect(mockSaveFields).toHaveBeenCalledWith({})
    })
  })
})

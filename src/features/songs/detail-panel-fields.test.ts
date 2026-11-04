import { describe, it, expect } from 'vitest'
import { DETAIL_PANEL_SECTIONS, getDetailPanelSectionFields } from './detail-panel-fields'

describe('DETAIL_PANEL_SECTIONS', () => {
  it('lists every field only once', () => {
    const fields = DETAIL_PANEL_SECTIONS.flatMap(section => section.fields)

    expect(new Set(fields).size).toBe(fields.length)
  })

  it('has unique section ids', () => {
    const ids = DETAIL_PANEL_SECTIONS.map(section => section.id)

    expect(new Set(ids).size).toBe(ids.length)
  })

  it('keeps the custom tags section without fixed fields', () => {
    expect(getDetailPanelSectionFields('customTags')).toEqual([])
  })
})

describe('getDetailPanelSectionFields', () => {
  it('returns the fields of a section in display order', () => {
    expect(getDetailPanelSectionFields('notes')).toEqual(['comment', 'lyrics'])
    expect(getDetailPanelSectionFields('trackInfo')).toEqual([
      'duration',
      'trackNumber',
      'trackTotal',
      'discNumber',
      'discTotal'
    ])
  })
})

import { beforeEach, describe, expect, it } from 'vitest'
import { usePlayerStore } from '@/stores/player-store'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SidebarPlayerVolumeControl } from './sidebar-player-volume-control'

describe('SidebarPlayerVolumeControl', () => {
  beforeEach(() => {
    usePlayerStore.setState({ volume: 0.5 })
  })

  it('opens a slider showing the current volume', async () => {
    const user = userEvent.setup()
    render(<SidebarPlayerVolumeControl />)

    await user.click(screen.getByRole('button', { name: 'playback.volume' }))

    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '50')
    expect(screen.getByText('50%')).toBeInTheDocument()
  })

  it('changes the volume with the keyboard', async () => {
    const user = userEvent.setup()
    render(<SidebarPlayerVolumeControl />)

    await user.click(screen.getByRole('button', { name: 'playback.volume' }))
    screen.getByRole('slider').focus()
    await user.keyboard('{ArrowRight}')

    expect(usePlayerStore.getState().volume).toBeCloseTo(0.51)
    expect(screen.getByText('51%')).toBeInTheDocument()
  })
})

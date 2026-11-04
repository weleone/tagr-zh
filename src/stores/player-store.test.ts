import { beforeEach, describe, expect, it, vi } from 'vitest'
import { VOLUME_STORAGE_KEY } from '@/features/player/volume'

// The stored volume is read once when the store module is created, so each test
// imports a fresh copy of the module after preparing localStorage.
async function loadStore() {
  vi.resetModules()
  return import('./player-store')
}

describe('player store volume', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('defaults to full volume when nothing is stored', async () => {
    const { usePlayerStore } = await loadStore()
    expect(usePlayerStore.getState().volume).toBe(1)
  })

  it('restores the stored volume', async () => {
    localStorage.setItem(VOLUME_STORAGE_KEY, '0.35')
    const { usePlayerStore } = await loadStore()
    expect(usePlayerStore.getState().volume).toBe(0.35)
  })

  it('falls back to full volume for an invalid stored value', async () => {
    localStorage.setItem(VOLUME_STORAGE_KEY, 'loud')
    const { usePlayerStore } = await loadStore()
    expect(usePlayerStore.getState().volume).toBe(1)
  })

  it('clamps the volume to the 0..1 range', async () => {
    const { usePlayerStore } = await loadStore()
    usePlayerStore.getState().setVolume(1.7)
    expect(usePlayerStore.getState().volume).toBe(1)
    usePlayerStore.getState().setVolume(-0.2)
    expect(usePlayerStore.getState().volume).toBe(0)
  })

  it('persists the volume and applies it to the audio element', async () => {
    const { usePlayerStore, getAudio } = await loadStore()
    usePlayerStore.getState().setVolume(0.4)
    expect(localStorage.getItem(VOLUME_STORAGE_KEY)).toBe('0.4')
    expect(getAudio()?.volume).toBe(0.4)
  })

  it('applies the stored volume when the audio element is created', async () => {
    localStorage.setItem(VOLUME_STORAGE_KEY, '0.2')
    const { getAudio } = await loadStore()
    expect(getAudio()?.volume).toBe(0.2)
  })
})

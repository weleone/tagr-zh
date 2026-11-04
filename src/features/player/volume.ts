export const VOLUME_STORAGE_KEY = 'tagr-player-volume'

export function clampVolume(value: number): number {
  return Number.isFinite(value) ? Math.min(Math.max(value, 0), 1) : 1
}

export function loadVolume(): number {
  if (typeof window === 'undefined') return 1
  try {
    const stored = window.localStorage.getItem(VOLUME_STORAGE_KEY)
    return stored === null ? 1 : clampVolume(parseFloat(stored))
  } catch {
    return 1
  }
}

export function saveVolume(value: number) {
  try {
    window.localStorage.setItem(VOLUME_STORAGE_KEY, String(value))
  } catch {
    // Storage may be unavailable (private mode, blocked site data); the volume still applies for this session.
  }
}

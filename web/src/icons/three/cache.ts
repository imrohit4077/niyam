import { MODEL_VERSION, type Model3DName } from './meta'

/**
 * Rendered 3D icon images, keyed by model name. Memory first, then
 * localStorage so repeat visits paint 3D icons without touching WebGL.
 * Storage is best-effort: private mode / quota errors simply skip persistence.
 */
const memory = new Map<Model3DName, string>()
const PREFIX = 'niyam.icon3d.'
const storageKey = (name: Model3DName) => `${PREFIX}v${MODEL_VERSION}.${name}`

let pruned = false
/** Drops renders cached by older model versions (once per page load). */
function pruneStale() {
  if (pruned) return
  pruned = true
  try {
    const current = `${PREFIX}v${MODEL_VERSION}.`
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i)
      if (key?.startsWith(PREFIX) && !key.startsWith(current)) localStorage.removeItem(key)
    }
  } catch {
    /* storage unavailable */
  }
}

export function peekIcon(name: Model3DName): string | null {
  const hit = memory.get(name)
  if (hit) return hit
  pruneStale()
  try {
    const stored = localStorage.getItem(storageKey(name))
    if (stored) {
      memory.set(name, stored)
      return stored
    }
  } catch {
    /* storage unavailable */
  }
  return null
}

export function storeIcon(name: Model3DName, url: string) {
  memory.set(name, url)
  try {
    localStorage.setItem(storageKey(name), url)
  } catch {
    /* quota / private mode — memory cache still serves this session */
  }
}

/** Count how many ISO timestamps fall in each of two consecutive windows of `windowDays`. */
export function compareRecentWindows(isoDates: string[], windowDays = 30): { current: number; previous: number } {
  const now = Date.now()
  const ms = windowDays * 86400000
  const boundary = now - ms
  const older = now - 2 * ms

  let current = 0
  let previous = 0
  for (const iso of isoDates) {
    const t = new Date(iso).getTime()
    if (Number.isNaN(t)) continue
    if (t >= boundary && t <= now) current += 1
    else if (t >= older && t < boundary) previous += 1
  }
  return { current, previous }
}

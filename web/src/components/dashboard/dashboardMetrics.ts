export type TrendResult = {
  pct: number
  up: boolean
  flat: boolean
}

function clampPct(n: number): number {
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.min(999, Math.round(n))
}

/** Percent change: (current - previous) / max(previous, 1) * 100, capped for display */
export function compareCounts(current: number, previous: number): TrendResult {
  if (current === 0 && previous === 0) return { pct: 0, up: true, flat: true }
  if (previous === 0 && current > 0) return { pct: 100, up: true, flat: false }
  const raw = ((current - previous) / previous) * 100
  const pct = clampPct(Math.abs(raw))
  const up = raw >= 0
  const flat = Math.abs(raw) < 0.5
  return { pct, up, flat }
}

export function inRange(iso: string | null | undefined, start: Date, end: Date): boolean {
  if (!iso) return false
  const t = new Date(iso).getTime()
  return t >= start.getTime() && t < end.getTime()
}

/** Count stage_history entries where stage matches (e.g. offer) and changed_at falls in [start, end). */
export function countStageTransitions(
  applications: { stage_history?: { stage: string; changed_at: string }[] }[],
  stage: string,
  start: Date,
  end: Date,
): number {
  let n = 0
  for (const app of applications) {
    for (const h of app.stage_history ?? []) {
      if (h.stage === stage && inRange(h.changed_at, start, end)) n += 1
    }
  }
  return n
}

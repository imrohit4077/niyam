/** Rolling window helpers for dashboard trend badges (no external deps). */

export function windowBounds() {
  const now = new Date()
  const ms = 86400000
  const recentStart = new Date(now.getTime() - 30 * ms)
  const recentEnd = now
  const priorStart = new Date(now.getTime() - 60 * ms)
  const priorEnd = recentStart
  return { recentStart, recentEnd, priorStart, priorEnd }
}

export function inOpenRange(iso: string, from: Date, to: Date) {
  const t = new Date(iso).getTime()
  return t >= from.getTime() && t < to.getTime()
}

export function trendPercent(current: number, previous: number): { label: string; direction: 'up' | 'down' | 'flat' | 'new' } {
  if (previous === 0 && current === 0) return { label: '—', direction: 'flat' }
  if (previous === 0) return { label: 'New', direction: 'new' }
  const raw = Math.round(((current - previous) / previous) * 100)
  const direction = raw > 0 ? 'up' : raw < 0 ? 'down' : 'flat'
  const label = `${raw > 0 ? '+' : ''}${raw}%`
  return { label, direction }
}

const FUNNEL_ORDER = ['applied', 'screening', 'interview', 'offer', 'hired'] as const

export function funnelCountsFromApplications(
  applications: { status: string }[],
): { key: (typeof FUNNEL_ORDER)[number]; label: string; value: number }[] {
  const byStatus = applications.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1
    return acc
  }, {})
  return FUNNEL_ORDER.map(key => ({
    key,
    label: key.charAt(0).toUpperCase() + key.slice(1),
    value: byStatus[key] ?? 0,
  }))
}

export function dominantStage(statuses: string[]): string {
  if (statuses.length === 0) return '—'
  const counts = statuses.reduce<Record<string, number>>((acc, s) => {
    acc[s] = (acc[s] ?? 0) + 1
    return acc
  }, {})
  let best = statuses[0]
  let max = 0
  for (const [s, n] of Object.entries(counts)) {
    if (n > max) {
      max = n
      best = s
    }
  }
  return best
}

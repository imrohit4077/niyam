/** Pure helpers for dashboard KPIs and trends (no React). */

export type TrendDirection = 'up' | 'down' | 'flat'

export type TrendResult = {
  direction: TrendDirection
  pct: number
  label: string
}

export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function countInMonth<T>(items: T[], getDate: (item: T) => string | null | undefined, key: string): number {
  return items.filter(item => {
    const raw = getDate(item)
    if (!raw) return false
    return monthKey(new Date(raw)) === key
  }).length
}

export function trendVsPrevious(current: number, previous: number): TrendResult {
  if (previous === 0 && current === 0) {
    return { direction: 'flat', pct: 0, label: '0%' }
  }
  if (previous === 0) {
    return { direction: 'up', pct: 100, label: '+100%' }
  }
  const raw = Math.round(((current - previous) / previous) * 100)
  const direction: TrendDirection = raw > 0 ? 'up' : raw < 0 ? 'down' : 'flat'
  const sign = raw > 0 ? '+' : ''
  return { direction, pct: raw, label: `${sign}${raw}%` }
}

export const FUNNEL_STAGE_ORDER = ['applied', 'screening', 'interview', 'offer', 'hired'] as const
export type FunnelStage = (typeof FUNNEL_STAGE_ORDER)[number]

export const FUNNEL_LABELS: Record<FunnelStage, string> = {
  applied: 'Applied',
  screening: 'Screening',
  interview: 'Interview',
  offer: 'Offer',
  hired: 'Hired',
}

export function statusToFunnelStage(status: string): FunnelStage | null {
  const s = status.toLowerCase()
  if (s === 'hired') return 'hired'
  if (s === 'offer') return 'offer'
  if (s === 'interview') return 'interview'
  if (s === 'screening') return 'screening'
  if (s === 'applied') return 'applied'
  return null
}

export function funnelCountsFromStatuses(statusCounts: Record<string, number>): Record<FunnelStage, number> {
  const out: Record<FunnelStage, number> = {
    applied: 0,
    screening: 0,
    interview: 0,
    offer: 0,
    hired: 0,
  }
  for (const [status, n] of Object.entries(statusCounts)) {
    const stage = statusToFunnelStage(status)
    if (stage) out[stage] += n
  }
  return out
}

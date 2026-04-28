/** Funnel stages shown on the hiring dashboard (matches typical ATS application statuses). */
export const PIPELINE_FUNNEL_STAGES = ['applied', 'screening', 'interview', 'offer', 'hired'] as const

export type PipelineFunnelStage = (typeof PIPELINE_FUNNEL_STAGES)[number]

export function formatDashboardLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())
}

export function formatRelativeTime(iso: string) {
  const t = new Date(iso).getTime()
  const diff = Date.now() - t
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

type PeriodCounts = { current: number; previous: number }

export function windowCounts30d<T>(items: T[], getTime: (item: T) => number | null): PeriodCounts {
  const now = Date.now()
  const ms30 = 30 * 24 * 60 * 60 * 1000
  const currentStart = now - ms30
  const previousStart = now - 2 * ms30
  let current = 0
  let previous = 0
  for (const item of items) {
    const t = getTime(item)
    if (t == null || Number.isNaN(t)) continue
    if (t >= currentStart && t <= now) current += 1
    else if (t >= previousStart && t < currentStart) previous += 1
  }
  return { current, previous }
}

export function trendFromPeriods(current: number, previous: number): { arrow: '↑' | '↓' | '→'; pct: number; label: string } {
  if (previous === 0 && current === 0) return { arrow: '→', pct: 0, label: '0%' }
  if (previous === 0) return { arrow: '↑', pct: 100, label: '+100%' }
  const raw = ((current - previous) / previous) * 100
  const rounded = Math.round(Math.abs(raw))
  const arrow = raw > 0 ? '↑' : raw < 0 ? '↓' : '→'
  const sign = raw > 0 ? '+' : raw < 0 ? '−' : ''
  return { arrow, pct: rounded, label: `${sign}${rounded}%` }
}

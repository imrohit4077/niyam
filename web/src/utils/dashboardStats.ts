/** Month-over-month trend for dashboard KPIs. */
export function monthOverMonthTrend(current: number, previous: number): {
  arrow: '↑' | '↓' | '→'
  pctLabel: string
  positive: boolean | null
} {
  if (previous === 0 && current === 0) {
    return { arrow: '→', pctLabel: '0%', positive: null }
  }
  if (previous === 0 && current > 0) {
    return { arrow: '↑', pctLabel: 'New', positive: true }
  }
  if (previous > 0 && current === 0) {
    return { arrow: '↓', pctLabel: '100%', positive: false }
  }
  const raw = ((current - previous) / previous) * 100
  const rounded = Math.round(Math.abs(raw))
  const positive = raw >= 0
  return {
    arrow: raw > 0 ? '↑' : raw < 0 ? '↓' : '→',
    pctLabel: `${rounded}%`,
    positive: raw === 0 ? null : positive,
  }
}

export const FUNNEL_STATUSES = ['applied', 'screening', 'interview', 'offer', 'hired'] as const

export type FunnelStatus = (typeof FUNNEL_STATUSES)[number]

const STAGE_ORDER: Record<string, number> = {
  applied: 0,
  screening: 1,
  interview: 2,
  offer: 3,
  hired: 4,
  rejected: -1,
  withdrawn: -1,
}

/** Dominant pipeline stage among applications (prefers non-terminal statuses when present). */
export function dominantPipelineStage(applications: { status: string }[]): string | null {
  if (applications.length === 0) return null
  const counts = new Map<string, number>()
  for (const a of applications) {
    counts.set(a.status, (counts.get(a.status) ?? 0) + 1)
  }
  const terminal = new Set(['rejected', 'withdrawn'])
  const nonTerminal = [...counts.entries()].filter(([s]) => !terminal.has(s))
  const pool = nonTerminal.length > 0 ? nonTerminal : [...counts.entries()]
  pool.sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1]
    return (STAGE_ORDER[b[0]] ?? -5) - (STAGE_ORDER[a[0]] ?? -5)
  })
  return pool[0]?.[0] ?? null
}

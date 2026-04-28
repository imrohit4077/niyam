import type { ReactNode } from 'react'

export type KpiTrend = {
  /** Percent change vs prior period, or null when not meaningful */
  pct: number | null
  label?: string
}

function TrendBadge({ trend }: { trend: KpiTrend }) {
  const { pct } = trend
  if (pct === null) {
    return <span className="dashboard-kpi-trend dashboard-kpi-trend-neutral">—</span>
  }
  const up = pct > 0
  const down = pct < 0
  const arrow = up ? '↑' : down ? '↓' : '→'
  const cls =
    up ? 'dashboard-kpi-trend-up' : down ? 'dashboard-kpi-trend-down' : 'dashboard-kpi-trend-neutral'
  return (
    <span className={`dashboard-kpi-trend ${cls}`} title={trend.label}>
      {arrow} {Math.abs(pct)}%
    </span>
  )
}

export function DashboardSummaryKpi({
  icon,
  label,
  value,
  trend,
  sublabel,
  highlight,
}: {
  icon: ReactNode
  label: string
  value: string | number
  trend: KpiTrend
  sublabel?: string
  highlight?: boolean
}) {
  return (
    <article className={`dashboard-summary-kpi ${highlight ? 'dashboard-summary-kpi-highlight' : ''}`}>
      <div className="dashboard-summary-kpi-top">
        <span className="dashboard-summary-kpi-icon" aria-hidden>
          {icon}
        </span>
        <TrendBadge trend={trend} />
      </div>
      <span className="dashboard-summary-kpi-label">{label}</span>
      <strong className="dashboard-summary-kpi-value">{value}</strong>
      {sublabel ? <p className="dashboard-summary-kpi-sublabel">{sublabel}</p> : null}
    </article>
  )
}

export function KpiIconCandidates() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

export function KpiIconBriefcase() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  )
}

export function KpiIconCalendar() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

export function KpiIconGift() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <polyline points="20 12 20 22 4 22 4 12" />
      <rect x="2" y="7" width="20" height="5" />
      <line x1="12" y1="22" x2="12" y2="7" />
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
    </svg>
  )
}

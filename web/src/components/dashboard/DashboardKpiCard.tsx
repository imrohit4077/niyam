import type { ReactNode } from 'react'

export type KpiTrend = {
  pct: number | null
  label?: string
}

function TrendBadge({ trend }: { trend: KpiTrend }) {
  if (trend.pct == null) {
    return <span className="dashboard-kpi-trend dashboard-kpi-trend-neutral">—</span>
  }
  const up = trend.pct > 0
  const down = trend.pct < 0
  const arrow = up ? '↑' : down ? '↓' : '→'
  const cls =
    up ? 'dashboard-kpi-trend-up' : down ? 'dashboard-kpi-trend-down' : 'dashboard-kpi-trend-neutral'
  return (
    <span className={`dashboard-kpi-trend ${cls}`} title={trend.label}>
      {arrow} {Math.abs(trend.pct)}%
    </span>
  )
}

export function DashboardKpiCard({
  label,
  value,
  hint,
  icon,
  trend,
  primary,
}: {
  label: string
  value: string | number
  hint?: string
  icon: ReactNode
  trend: KpiTrend
  primary?: boolean
}) {
  return (
    <article className={`dashboard-kpi-card${primary ? ' dashboard-kpi-primary' : ''}`}>
      <div className="dashboard-kpi-card-top">
        <span className="dashboard-kpi-icon" aria-hidden>
          {icon}
        </span>
        <div className="dashboard-kpi-card-text">
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
        <TrendBadge trend={trend} />
      </div>
      {hint ? <p>{hint}</p> : null}
    </article>
  )
}

export function KpiIconCandidates() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

export function KpiIconJobs() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      <path d="M2 13h20" />
    </svg>
  )
}

export function KpiIconInterviews() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  )
}

export function KpiIconOffers() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
    </svg>
  )
}

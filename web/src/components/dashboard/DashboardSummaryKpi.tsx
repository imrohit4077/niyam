import type { ReactNode } from 'react'

export type TrendDirection = 'up' | 'down' | 'flat'

export function DashboardTrendBadge({
  pct,
  direction,
  label,
}: {
  pct: number
  direction: TrendDirection
  label?: string
}) {
  if (direction === 'flat') {
    return (
      <span className="dashboard-kpi-trend dashboard-kpi-trend-flat" title={label}>
        <span className="dashboard-kpi-trend-arrow">—</span>
        <span className="dashboard-kpi-trend-pct">0%</span>
        <span className="dashboard-kpi-trend-hint">vs prior 30d</span>
      </span>
    )
  }
  const arrow = direction === 'up' ? '↑' : '↓'
  return (
    <span
      className={`dashboard-kpi-trend dashboard-kpi-trend-${direction}`}
      title={label ?? 'Compared to the prior 30-day window'}
    >
      <span className="dashboard-kpi-trend-arrow">{arrow}</span>
      <span className="dashboard-kpi-trend-pct">{pct}%</span>
      <span className="dashboard-kpi-trend-hint">vs prior 30d</span>
    </span>
  )
}

export function DashboardSummaryKpi({
  icon,
  label,
  value,
  trendPct,
  trendDirection,
  sublabel,
  highlight,
}: {
  icon: ReactNode
  label: string
  value: string | number
  trendPct: number
  trendDirection: TrendDirection
  sublabel?: string
  highlight?: boolean
}) {
  return (
    <article className={`dashboard-kpi-card dashboard-kpi-card-v2 ${highlight ? 'dashboard-kpi-primary' : ''}`}>
      <div className="dashboard-kpi-card-top">
        <span className="dashboard-kpi-icon" aria-hidden>
          {icon}
        </span>
        <DashboardTrendBadge pct={trendPct} direction={trendDirection} />
      </div>
      <span className="dashboard-kpi-card-label">{label}</span>
      <strong className="dashboard-kpi-card-value">{value}</strong>
      {sublabel ? <p className="dashboard-kpi-card-sublabel">{sublabel}</p> : null}
    </article>
  )
}

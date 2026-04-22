import type { ReactNode } from 'react'
import type { TrendDirection } from './dashboardPeriodTrend'

function TrendBadge({ direction, pct }: { direction: TrendDirection; pct: number }) {
  if (direction === 'flat' && pct === 0) {
    return <span className="dashboard-kpi-trend dashboard-kpi-trend--flat">— 0%</span>
  }
  const arrow = direction === 'up' ? '↑' : direction === 'down' ? '↓' : '→'
  const sign = direction === 'down' ? '−' : ''
  const cls =
    direction === 'up'
      ? 'dashboard-kpi-trend dashboard-kpi-trend--up'
      : direction === 'down'
        ? 'dashboard-kpi-trend dashboard-kpi-trend--down'
        : 'dashboard-kpi-trend dashboard-kpi-trend--flat'
  return (
    <span className={cls}>
      {arrow} {sign}
      {pct}% <span className="dashboard-kpi-trend-label">vs prior 30d</span>
    </span>
  )
}

export function DashboardSummaryCard({
  label,
  value,
  icon,
  trendDirection,
  trendPct,
  primary,
  subtitle,
}: {
  label: string
  value: string | number
  icon: ReactNode
  trendDirection: TrendDirection
  trendPct: number
  primary?: boolean
  subtitle?: string
}) {
  return (
    <article className={`dashboard-summary-card${primary ? ' dashboard-summary-card--primary' : ''}`}>
      <div className="dashboard-summary-card-top">
        <span className="dashboard-summary-card-icon" aria-hidden>
          {icon}
        </span>
        <TrendBadge direction={trendDirection} pct={trendPct} />
      </div>
      <span className="dashboard-summary-card-label">{label}</span>
      <strong className="dashboard-summary-card-value">{value}</strong>
      {subtitle ? <p className="dashboard-summary-card-sub">{subtitle}</p> : null}
    </article>
  )
}

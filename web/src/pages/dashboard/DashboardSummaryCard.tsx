import type { ReactNode } from 'react'
import type { TrendParts } from './dashboardUtils'

type Props = {
  label: string
  value: string | number
  icon: ReactNode
  trend: TrendParts
  variant?: 'default' | 'primary'
}

function TrendBadge({ trend }: { trend: TrendParts }) {
  if (trend.percent === null && trend.direction === 'flat') {
    return (
      <span className="dashboard-kpi-trend dashboard-kpi-trend-muted" title={trend.label}>
        —
      </span>
    )
  }
  if (trend.percent === null && trend.direction === 'up') {
    return (
      <span className="dashboard-kpi-trend dashboard-kpi-trend-up" title={trend.label}>
        ↑ new
      </span>
    )
  }
  const arrow = trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'
  const cls =
    trend.direction === 'up'
      ? 'dashboard-kpi-trend-up'
      : trend.direction === 'down'
        ? 'dashboard-kpi-trend-down'
        : 'dashboard-kpi-trend-flat'
  return (
    <span className={`dashboard-kpi-trend ${cls}`} title={trend.label}>
      {arrow} {trend.percent}%
    </span>
  )
}

export function DashboardSummaryCard({ label, value, icon, trend, variant = 'default' }: Props) {
  return (
    <article className={`dashboard-kpi-card dashboard-kpi-card-modern ${variant === 'primary' ? 'dashboard-kpi-primary' : ''}`}>
      <div className="dashboard-kpi-card-top">
        <span className="dashboard-kpi-icon" aria-hidden>
          {icon}
        </span>
        <TrendBadge trend={trend} />
      </div>
      <span className="dashboard-kpi-label">{label}</span>
      <strong className="dashboard-kpi-value">{value}</strong>
    </article>
  )
}

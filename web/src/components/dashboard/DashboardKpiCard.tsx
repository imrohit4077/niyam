import type { ReactNode } from 'react'
import type { TrendResult } from './dashboardMetrics'

export type DashboardKpiCardProps = {
  label: string
  value: number | string
  icon: ReactNode
  trend: TrendResult
  /** Shown under the value (context, not the trend line). */
  hint?: string
  primary?: boolean
}

function TrendBadge({ trend }: { trend: TrendResult }) {
  if (trend.direction === 'flat' || trend.pct === 0) {
    return <span className="dashboard-kpi-trend dashboard-kpi-trend-flat">— vs prior 30d</span>
  }
  const arrow = trend.direction === 'up' ? '↑' : '↓'
  const sign = trend.direction === 'up' ? '+' : '−'
  return (
    <span
      className={`dashboard-kpi-trend dashboard-kpi-trend-${trend.direction === 'up' ? 'up' : 'down'}`}
      title="Compared to the previous 30-day window"
    >
      {arrow} {sign}
      {trend.pct}%
    </span>
  )
}

export function DashboardKpiCard({ label, value, icon, trend, hint, primary }: DashboardKpiCardProps) {
  return (
    <article className={`dashboard-kpi-card${primary ? ' dashboard-kpi-primary' : ''}`}>
      <div className="dashboard-kpi-card-top">
        <span className="dashboard-kpi-icon" aria-hidden>
          {icon}
        </span>
        <TrendBadge trend={trend} />
      </div>
      <span className="dashboard-kpi-label">{label}</span>
      <strong className="dashboard-kpi-value">{value}</strong>
      {hint ? <p className="dashboard-kpi-hint">{hint}</p> : null}
    </article>
  )
}

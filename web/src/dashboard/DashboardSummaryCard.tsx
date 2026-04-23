import type { ReactNode } from 'react'
import type { TrendResult } from './dashboardUtils'

type Props = {
  title: string
  value: string | number
  icon: ReactNode
  trend?: TrendResult
  subtitle?: string
  highlight?: boolean
}

function TrendBadge({ trend }: { trend: TrendResult }) {
  const sym = trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'
  const cls =
    trend.direction === 'up'
      ? 'dashboard-kpi-trend-up'
      : trend.direction === 'down'
        ? 'dashboard-kpi-trend-down'
        : 'dashboard-kpi-trend-flat'
  if (trend.direction === 'flat' && trend.percent === 0) {
    return (
      <span className={`dashboard-kpi-trend ${cls}`}>
        <span className="dashboard-kpi-trend-sym">→</span> 0%
        <span className="dashboard-kpi-trend-cap">{trend.caption}</span>
      </span>
    )
  }
  return (
    <span className={`dashboard-kpi-trend ${cls}`}>
      <span className="dashboard-kpi-trend-sym">{sym}</span> {trend.percent}%
      <span className="dashboard-kpi-trend-cap">{trend.caption}</span>
    </span>
  )
}

export function DashboardSummaryCard({ title, value, icon, trend, subtitle, highlight }: Props) {
  return (
    <article className={`dashboard-kpi-card dashboard-kpi-card-rich ${highlight ? 'dashboard-kpi-primary' : ''}`}>
      <div className="dashboard-kpi-card-top">
        <span className="dashboard-kpi-card-icon" aria-hidden>
          {icon}
        </span>
        <span className="dashboard-kpi-card-title">{title}</span>
      </div>
      <strong className="dashboard-kpi-card-value">{value}</strong>
      {trend && <TrendBadge trend={trend} />}
      {subtitle ? <p className="dashboard-kpi-card-sub">{subtitle}</p> : null}
    </article>
  )
}

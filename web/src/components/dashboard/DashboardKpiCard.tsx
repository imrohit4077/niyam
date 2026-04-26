import type { ReactNode } from 'react'
import type { TrendResult } from './dashboardTypes'

type Props = {
  label: string
  value: ReactNode
  icon: ReactNode
  trend: TrendResult
  /** Secondary line under the value */
  hint?: string
  primary?: boolean
}

function TrendBadge({ trend }: { trend: TrendResult }) {
  const arrow = trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'
  const cls =
    trend.direction === 'up'
      ? 'dashboard-kpi-trend dashboard-kpi-trend--up'
      : trend.direction === 'down'
        ? 'dashboard-kpi-trend dashboard-kpi-trend--down'
        : 'dashboard-kpi-trend dashboard-kpi-trend--flat'
  return (
    <span className={cls} title="vs prior 30 days">
      <span className="dashboard-kpi-trend-arrow" aria-hidden>
        {arrow}
      </span>
      <span className="dashboard-kpi-trend-pct">{trend.label}</span>
      <span className="dashboard-kpi-trend-caption">30d</span>
    </span>
  )
}

export function DashboardKpiCard({ label, value, icon, trend, hint, primary }: Props) {
  return (
    <article className={`dashboard-kpi-card dashboard-kpi-card--rich${primary ? ' dashboard-kpi-primary' : ''}`}>
      <div className="dashboard-kpi-card-top">
        <span className="dashboard-kpi-card-label">{label}</span>
        <span className="dashboard-kpi-card-icon" aria-hidden>
          {icon}
        </span>
      </div>
      <div className="dashboard-kpi-card-mid">
        <strong>{value}</strong>
        <TrendBadge trend={trend} />
      </div>
      {hint ? <p className="dashboard-kpi-card-hint">{hint}</p> : null}
    </article>
  )
}

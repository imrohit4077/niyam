import type { ReactNode } from 'react'

export type StatTrend = {
  direction: 'up' | 'down' | 'flat'
  pct: number | null
  /** Short caption, e.g. "vs prior 30d" */
  label?: string
}

type DashboardStatCardProps = {
  icon: ReactNode
  label: string
  value: string | number
  /** Secondary line under the value */
  hint?: string
  trend?: StatTrend
  primary?: boolean
}

export function DashboardStatCard({ icon, label, value, hint, trend, primary }: DashboardStatCardProps) {
  const arrow = trend?.direction === 'up' ? '↑' : trend?.direction === 'down' ? '↓' : '→'
  const trendClass =
    trend?.direction === 'up'
      ? 'dashboard-stat-trend--up'
      : trend?.direction === 'down'
        ? 'dashboard-stat-trend--down'
        : 'dashboard-stat-trend--flat'

  return (
    <article className={`dashboard-stat-card${primary ? ' dashboard-stat-card--primary' : ''}`}>
      <div className="dashboard-stat-card-top">
        <span className="dashboard-stat-icon" aria-hidden>
          {icon}
        </span>
        <span className="dashboard-stat-label">{label}</span>
      </div>
      <strong className="dashboard-stat-value">{value}</strong>
      {hint ? <p className="dashboard-stat-hint">{hint}</p> : null}
      {trend ? (
        <div className={`dashboard-stat-trend ${trendClass}`} title={trend.label}>
          <span className="dashboard-stat-trend-arrow" aria-hidden>
            {arrow}
          </span>
          <span className="dashboard-stat-trend-pct">
            {trend.pct === null ? '—' : `${trend.pct > 0 ? '+' : ''}${trend.pct}%`}
          </span>
          {trend.label ? <span className="dashboard-stat-trend-caption">{trend.label}</span> : null}
        </div>
      ) : null}
    </article>
  )
}

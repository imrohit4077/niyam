import type { ReactNode } from 'react'
import type { TrendResult } from './dashboardTrend'
import { formatTrendLabel } from './dashboardTrend'

type Props = {
  label: string
  value: string | number
  icon: ReactNode
  trend: TrendResult
  /** Shown under the value; keep short */
  hint?: string
  primary?: boolean
}

export function DashboardSummaryCard({ label, value, icon, trend, hint, primary }: Props) {
  const arrow = trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'
  const trendClass =
    trend.direction === 'up'
      ? 'dashboard-kpi-trend--up'
      : trend.direction === 'down'
        ? 'dashboard-kpi-trend--down'
        : 'dashboard-kpi-trend--flat'

  return (
    <article className={`dashboard-kpi-card${primary ? ' dashboard-kpi-primary' : ''}`}>
      <div className="dashboard-kpi-card-top">
        <span className="dashboard-kpi-icon" aria-hidden>
          {icon}
        </span>
        <span className="dashboard-kpi-label">{label}</span>
      </div>
      <strong className="dashboard-kpi-value">{value}</strong>
      <div className="dashboard-kpi-meta">
        <span className={`dashboard-kpi-trend ${trendClass}`}>
          <span className="dashboard-kpi-trend-arrow" aria-hidden>
            {arrow}
          </span>
          {formatTrendLabel(trend)}
          <span className="dashboard-kpi-trend-vs"> vs prior 30d</span>
        </span>
        {hint ? <p className="dashboard-kpi-hint">{hint}</p> : null}
      </div>
    </article>
  )
}

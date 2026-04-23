import type { ReactNode } from 'react'
import type { TrendResult } from './dashboardUtils'
import { formatTrendLabel } from './dashboardUtils'

type Props = {
  label: string
  value: string | number
  subtitle?: string
  icon: ReactNode
  trend?: TrendResult
  primary?: boolean
}

export function DashboardStatCard({ label, value, subtitle, icon, trend, primary }: Props) {
  const trendClass =
    trend == null
      ? 'dashboard-stat-trend-neutral'
      : trend.direction === 'up'
        ? 'dashboard-stat-trend-up'
        : trend.direction === 'down'
          ? 'dashboard-stat-trend-down'
          : 'dashboard-stat-trend-neutral'

  return (
    <article className={`dashboard-stat-card ${primary ? 'dashboard-stat-card-primary' : ''}`}>
      <div className="dashboard-stat-card-top">
        <span className="dashboard-stat-icon" aria-hidden>
          {icon}
        </span>
        {trend != null && (
          <span className={`dashboard-stat-trend ${trendClass}`} title="vs prior period">
            {formatTrendLabel(trend)}
          </span>
        )}
      </div>
      <span className="dashboard-stat-label">{label}</span>
      <strong className="dashboard-stat-value">{value}</strong>
      {subtitle ? <p className="dashboard-stat-sub">{subtitle}</p> : null}
    </article>
  )
}

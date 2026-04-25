import type { ReactNode } from 'react'
import type { SummaryTrend, TrendDirection } from './dashboardSummaryUtils'

function trendClass(direction: TrendDirection) {
  if (direction === 'up') return 'dashboard-summary-trend-up'
  if (direction === 'down') return 'dashboard-summary-trend-down'
  return 'dashboard-summary-trend-flat'
}

function trendArrow(direction: TrendDirection) {
  if (direction === 'up') return '↑'
  if (direction === 'down') return '↓'
  return '→'
}

export function DashboardSummaryCard({
  label,
  value,
  icon,
  trend,
  subtitle,
  primary,
}: {
  label: string
  value: ReactNode
  icon: ReactNode
  trend: SummaryTrend | null
  subtitle?: string
  primary?: boolean
}) {
  return (
    <article className={`dashboard-summary-card ${primary ? 'dashboard-summary-card-primary' : ''}`}>
      <div className="dashboard-summary-card-top">
        <span className="dashboard-summary-icon" aria-hidden>
          {icon}
        </span>
        {trend ? (
          <span className={`dashboard-summary-trend ${trendClass(trend.direction)}`}>
            {trendArrow(trend.direction)} {trend.pct}%
          </span>
        ) : (
          <span className="dashboard-summary-trend dashboard-summary-trend-muted">—</span>
        )}
      </div>
      <span className="dashboard-summary-label">{label}</span>
      <strong className="dashboard-summary-value">{value}</strong>
      {subtitle ? <p className="dashboard-summary-sub">{subtitle}</p> : null}
    </article>
  )
}

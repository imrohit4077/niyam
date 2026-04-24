import type { ReactNode } from 'react'
import type { TrendResult } from './dashboardMetrics'
import { formatTrendPercent } from './dashboardMetrics'

type Props = {
  label: string
  value: string | number
  icon: ReactNode
  trend: TrendResult
  hint?: string
  primary?: boolean
  loading?: boolean
}

export function DashboardSummaryCard({ label, value, icon, trend, hint, primary, loading }: Props) {
  const trendText = formatTrendPercent(trend)
  const trendClass =
    trend.direction === 'up'
      ? 'dashboard-summary-trend--up'
      : trend.direction === 'down'
        ? 'dashboard-summary-trend--down'
        : 'dashboard-summary-trend--flat'

  return (
    <article
      className={`dashboard-summary-card${primary ? ' dashboard-summary-card--primary' : ''}${loading ? ' dashboard-summary-card--loading' : ''}`}
    >
      {loading ? (
        <>
          <div className="dashboard-summary-skeleton-icon" />
          <div className="dashboard-summary-skeleton-line dashboard-summary-skeleton-line--short" />
          <div className="dashboard-summary-skeleton-line dashboard-summary-skeleton-line--value" />
          <div className="dashboard-summary-skeleton-line dashboard-summary-skeleton-line--tiny" />
        </>
      ) : (
        <>
          <div className="dashboard-summary-card-top">
            <div className="dashboard-summary-icon" aria-hidden>
              {icon}
            </div>
            <span className="dashboard-summary-label">{label}</span>
          </div>
          <strong className="dashboard-summary-value">{value}</strong>
          <div className="dashboard-summary-meta">
            <span className={`dashboard-summary-trend ${trendClass}`} title="vs prior 30 days">
              {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'} {trendText}
            </span>
            {hint ? <span className="dashboard-summary-hint">{hint}</span> : null}
          </div>
        </>
      )}
    </article>
  )
}

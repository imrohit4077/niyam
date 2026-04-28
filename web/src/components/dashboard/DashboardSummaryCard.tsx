import type { ReactNode } from 'react'

type TrendDirection = 'up' | 'down' | 'flat'

export type DashboardSummaryCardProps = {
  label: string
  value: string | number
  icon: ReactNode
  trendPercent: number | null
  trendLabel?: string
  loading?: boolean
  emphasize?: boolean
}

function trendDirection(percent: number): TrendDirection {
  if (percent > 0.5) return 'up'
  if (percent < -0.5) return 'down'
  return 'flat'
}

export function DashboardSummaryCard({
  label,
  value,
  icon,
  trendPercent,
  trendLabel = 'vs prior period',
  loading,
  emphasize,
}: DashboardSummaryCardProps) {
  if (loading) {
    return (
      <article className={`dashboard-summary-card ${emphasize ? 'dashboard-summary-card-emphasis' : ''} dashboard-summary-card-skeleton`}>
        <div className="dashboard-summary-card-top">
          <span className="dashboard-summary-skeleton-icon" />
          <span className="dashboard-summary-skeleton-line dashboard-summary-skeleton-line-short" />
        </div>
        <span className="dashboard-summary-skeleton-line dashboard-summary-skeleton-line-value" />
        <span className="dashboard-summary-skeleton-line dashboard-summary-skeleton-line-trend" />
      </article>
    )
  }

  const dir = trendPercent == null ? null : trendDirection(trendPercent)
  const arrow = dir === 'up' ? '↑' : dir === 'down' ? '↓' : '→'
  const trendClass =
    dir === 'up' ? 'dashboard-trend-up' : dir === 'down' ? 'dashboard-trend-down' : 'dashboard-trend-flat'

  return (
    <article className={`dashboard-summary-card ${emphasize ? 'dashboard-summary-card-emphasis' : ''}`}>
      <div className="dashboard-summary-card-top">
        <span className="dashboard-summary-icon" aria-hidden>
          {icon}
        </span>
        <span className="dashboard-summary-label">{label}</span>
      </div>
      <strong className="dashboard-summary-value">{value}</strong>
      {trendPercent != null ? (
        <p className={`dashboard-summary-trend ${trendClass}`}>
          <span className="dashboard-summary-trend-arrow" aria-hidden>
            {arrow}
          </span>
          <span>
            {trendPercent > 0 ? '+' : ''}
            {Math.round(trendPercent)}%
          </span>
          <span className="dashboard-summary-trend-muted">{trendLabel}</span>
        </p>
      ) : (
        <p className="dashboard-summary-trend dashboard-trend-flat">
          <span className="dashboard-summary-trend-muted">No prior period data</span>
        </p>
      )}
    </article>
  )
}

import type { ReactNode } from 'react'
import type { TrendIndicator, TrendDirection } from './dashboardHelpers'

function TrendGlyph({ direction }: { direction: TrendDirection }) {
  if (direction === 'up') return <span aria-hidden>↑</span>
  if (direction === 'down') return <span aria-hidden>↓</span>
  return <span aria-hidden>→</span>
}

export function DashboardSummaryCard({
  label,
  value,
  icon,
  trend,
  loading,
}: {
  label: string
  value: string | number
  icon: ReactNode
  trend: TrendIndicator
  loading?: boolean
}) {
  if (loading) {
    return (
      <article className="dashboard-summary-card dashboard-summary-card-skeleton" aria-busy>
        <div className="dashboard-summary-skeleton-icon" />
        <div className="dashboard-summary-skeleton-line dashboard-summary-skeleton-line-short" />
        <div className="dashboard-summary-skeleton-line dashboard-summary-skeleton-line-value" />
        <div className="dashboard-summary-skeleton-line dashboard-summary-skeleton-line-tiny" />
      </article>
    )
  }

  const trendClass =
    trend.direction === 'up'
      ? 'dashboard-trend-up'
      : trend.direction === 'down'
        ? 'dashboard-trend-down'
        : 'dashboard-trend-flat'

  const trendText =
    trend.percent != null ? (
      <>
        <TrendGlyph direction={trend.direction} /> {trend.percent}%
      </>
    ) : trend.direction === 'up' ? (
      <>
        <TrendGlyph direction="up" /> new
      </>
    ) : (
      <span className="dashboard-trend-muted">—</span>
    )

  return (
    <article className="dashboard-summary-card">
      <div className="dashboard-summary-card-top">
        <div className="dashboard-summary-icon" aria-hidden>
          {icon}
        </div>
        <span className="dashboard-summary-label">{label}</span>
      </div>
      <strong className="dashboard-summary-value">{value}</strong>
      <div className={`dashboard-summary-trend ${trendClass}`}>
        {trendText}
        <span className="dashboard-summary-trend-caption">{trend.caption}</span>
      </div>
    </article>
  )
}

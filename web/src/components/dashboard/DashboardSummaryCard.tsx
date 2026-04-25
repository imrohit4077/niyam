import type { ReactNode } from 'react'

export type DashboardSummaryCardProps = {
  label: string
  value: string | number
  icon: ReactNode
  trendLabel: string
  trendDirection: 'up' | 'down' | 'flat'
  trendHint: string
  highlight?: boolean
  loading?: boolean
}

function TrendArrow({ direction }: { direction: 'up' | 'down' | 'flat' }) {
  if (direction === 'flat') return <span className="dashboard-summary-trend-arrow">→</span>
  if (direction === 'down') return <span className="dashboard-summary-trend-arrow dashboard-summary-trend-arrow-down">↓</span>
  return <span className="dashboard-summary-trend-arrow dashboard-summary-trend-arrow-up">↑</span>
}

export function DashboardSummaryCard({
  label,
  value,
  icon,
  trendLabel,
  trendDirection,
  trendHint,
  highlight,
  loading,
}: DashboardSummaryCardProps) {
  if (loading) {
    return (
      <article className="dashboard-summary-card dashboard-summary-card-skeleton" aria-hidden>
        <div className="dashboard-summary-skeleton-icon" />
        <div className="dashboard-summary-skeleton-line dashboard-summary-skeleton-line-short" />
        <div className="dashboard-summary-skeleton-line dashboard-summary-skeleton-line-value" />
        <div className="dashboard-summary-skeleton-line dashboard-summary-skeleton-line-trend" />
      </article>
    )
  }

  return (
    <article className={`dashboard-summary-card${highlight ? ' dashboard-summary-card-highlight' : ''}`}>
      <div className="dashboard-summary-card-top">
        <div className="dashboard-summary-icon" aria-hidden>
          {icon}
        </div>
        <span className="dashboard-summary-label">{label}</span>
      </div>
      <strong className="dashboard-summary-value">{value}</strong>
      <div className="dashboard-summary-trend">
        <span
          className={`dashboard-summary-trend-pill dashboard-summary-trend-${trendDirection}`}
          title={trendHint}
        >
          <TrendArrow direction={trendDirection} />
          <span>{trendLabel}</span>
        </span>
        <span className="dashboard-summary-trend-hint">{trendHint}</span>
      </div>
    </article>
  )
}

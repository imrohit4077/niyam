import type { ReactNode } from 'react'

export type TrendDirection = 'up' | 'down' | 'neutral'

export type DashboardSummaryCardProps = {
  label: string
  value: string | number
  icon: ReactNode
  trendLabel: string
  trendDirection: TrendDirection
  subtitle?: string
  loading?: boolean
  highlight?: boolean
}

function TrendArrow({ direction }: { direction: TrendDirection }) {
  if (direction === 'up') return <span aria-hidden>↑</span>
  if (direction === 'down') return <span aria-hidden>↓</span>
  return <span aria-hidden>→</span>
}

export function DashboardSummaryCard({
  label,
  value,
  icon,
  trendLabel,
  trendDirection,
  subtitle,
  loading,
  highlight,
}: DashboardSummaryCardProps) {
  if (loading) {
    return (
      <article className={`dashboard-summary-card dashboard-summary-card-skeleton ${highlight ? 'dashboard-summary-card-highlight' : ''}`}>
        <div className="dashboard-summary-card-top">
          <span className="dashboard-summary-skeleton dashboard-summary-skeleton-icon" />
          <span className="dashboard-summary-skeleton dashboard-summary-skeleton-trend" />
        </div>
        <span className="dashboard-summary-skeleton dashboard-summary-skeleton-label" />
        <span className="dashboard-summary-skeleton dashboard-summary-skeleton-value" />
        <span className="dashboard-summary-skeleton dashboard-summary-skeleton-sub" />
      </article>
    )
  }

  return (
    <article className={`dashboard-summary-card ${highlight ? 'dashboard-summary-card-highlight' : ''}`}>
      <div className="dashboard-summary-card-top">
        <span className="dashboard-summary-icon" aria-hidden>
          {icon}
        </span>
        <span
          className={`dashboard-summary-trend dashboard-summary-trend-${trendDirection}`}
          title="Compared to prior period"
        >
          <TrendArrow direction={trendDirection} />
          {trendLabel}
        </span>
      </div>
      <span className="dashboard-summary-label">{label}</span>
      <strong className="dashboard-summary-value">{value}</strong>
      {subtitle ? <p className="dashboard-summary-subtitle">{subtitle}</p> : null}
    </article>
  )
}

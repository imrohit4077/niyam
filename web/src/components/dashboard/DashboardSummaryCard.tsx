import type { ReactNode } from 'react'

type Trend = {
  direction: 'up' | 'down' | 'flat'
  label: string
}

type Props = {
  icon: ReactNode
  label: string
  value: string | number
  trend?: Trend | null
  trendCaption?: string
  highlight?: boolean
  loading?: boolean
}

export function DashboardSummaryCard({ icon, label, value, trend, trendCaption, highlight, loading }: Props) {
  if (loading) {
    return (
      <article className={`dashboard-summary-card ${highlight ? 'dashboard-summary-card--primary' : ''}`}>
        <div className="dashboard-summary-card-skeleton-row">
          <span className="dashboard-summary-skeleton dashboard-summary-skeleton--icon" />
          <span className="dashboard-summary-skeleton dashboard-summary-skeleton--short" />
        </div>
        <span className="dashboard-summary-skeleton dashboard-summary-skeleton--value" />
        <span className="dashboard-summary-skeleton dashboard-summary-skeleton--trend" />
      </article>
    )
  }

  const trendClass =
    trend?.direction === 'up'
      ? 'dashboard-summary-trend--up'
      : trend?.direction === 'down'
        ? 'dashboard-summary-trend--down'
        : 'dashboard-summary-trend--flat'

  return (
    <article className={`dashboard-summary-card ${highlight ? 'dashboard-summary-card--primary' : ''}`}>
      <div className="dashboard-summary-card-top">
        <span className="dashboard-summary-icon" aria-hidden>
          {icon}
        </span>
        <span className="dashboard-summary-label">{label}</span>
      </div>
      <strong className="dashboard-summary-value">{value}</strong>
      {trend && (
        <div className={`dashboard-summary-trend ${trendClass}`}>
          <span className="dashboard-summary-trend-arrow" aria-hidden>
            {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'}
          </span>
          <span>{trend.label}</span>
          {trendCaption ? <span className="dashboard-summary-trend-caption">{trendCaption}</span> : null}
        </div>
      )}
    </article>
  )
}

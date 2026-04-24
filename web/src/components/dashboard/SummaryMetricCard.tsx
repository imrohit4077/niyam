import type { ReactNode } from 'react'
import type { TrendDirection } from './dashboardMetrics'

const trendClass: Record<TrendDirection, string> = {
  up: 'dashboard-summary-trend--up',
  down: 'dashboard-summary-trend--down',
  flat: 'dashboard-summary-trend--flat',
}

const trendArrow: Record<TrendDirection, string> = {
  up: '↑',
  down: '↓',
  flat: '→',
}

type Props = {
  label: string
  value: string | number
  icon: ReactNode
  trend: { direction: TrendDirection; label: string }
  hint?: string
  highlight?: boolean
}

export function SummaryMetricCard({ label, value, icon, trend, hint, highlight }: Props) {
  return (
    <article className={`dashboard-summary-card ${highlight ? 'dashboard-summary-card--primary' : ''}`}>
      <div className="dashboard-summary-card-top">
        <span className="dashboard-summary-icon" aria-hidden>
          {icon}
        </span>
        <span className={`dashboard-summary-trend ${trendClass[trend.direction]}`}>
          <span className="dashboard-summary-trend-arrow">{trendArrow[trend.direction]}</span>
          <span>{trend.label}</span>
        </span>
      </div>
      <span className="dashboard-summary-label">{label}</span>
      <strong className="dashboard-summary-value">{value}</strong>
      {hint ? <p className="dashboard-summary-hint">{hint}</p> : null}
    </article>
  )
}

export function SummaryMetricCardSkeleton() {
  return (
    <div className="dashboard-summary-card dashboard-summary-card--skeleton" aria-hidden>
      <div className="dashboard-skeleton dashboard-skeleton-row" />
      <div className="dashboard-skeleton dashboard-skeleton-label" />
      <div className="dashboard-skeleton dashboard-skeleton-value" />
      <div className="dashboard-skeleton dashboard-skeleton-hint" />
    </div>
  )
}

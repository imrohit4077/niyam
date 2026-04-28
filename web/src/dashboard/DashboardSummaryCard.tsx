import type { ReactNode } from 'react'
import type { TrendResult } from './dashboardUtils'
import { trendArrowDisplay } from './dashboardUtils'

type Props = {
  label: string
  value: string | number
  icon: ReactNode
  trend: TrendResult | null
  sublabel?: string
  highlight?: boolean
  loading?: boolean
}

export function DashboardSummaryCard({ label, value, icon, trend, sublabel, highlight, loading }: Props) {
  const { arrow, text } = trendArrowDisplay(trend)

  if (loading) {
    return (
      <article className={`dashboard-summary-card ${highlight ? 'dashboard-summary-card--primary' : ''}`}>
        <div className="dashboard-summary-card-skeleton dashboard-summary-card-skeleton-icon" />
        <div className="dashboard-summary-card-skeleton dashboard-summary-card-skeleton-label" />
        <div className="dashboard-summary-card-skeleton dashboard-summary-card-skeleton-value" />
        <div className="dashboard-summary-card-skeleton dashboard-summary-card-skeleton-trend" />
      </article>
    )
  }

  return (
    <article className={`dashboard-summary-card ${highlight ? 'dashboard-summary-card--primary' : ''}`}>
      <div className="dashboard-summary-card-top">
        <span className="dashboard-summary-card-icon" aria-hidden>
          {icon}
        </span>
        <span className="dashboard-summary-card-label">{label}</span>
      </div>
      <strong className="dashboard-summary-card-value">{value}</strong>
      <div className="dashboard-summary-card-meta">
        <span className={`dashboard-summary-trend ${trend ? (trend.up ? 'dashboard-summary-trend--up' : 'dashboard-summary-trend--down') : ''}`}>
          {trend ? (
            <>
              <span className="dashboard-summary-trend-arrow">{arrow}</span>
              <span>{text}</span>
            </>
          ) : (
            <span className="dashboard-summary-trend-neutral">—</span>
          )}
        </span>
        {sublabel ? <span className="dashboard-summary-card-sublabel">{sublabel}</span> : null}
      </div>
    </article>
  )
}

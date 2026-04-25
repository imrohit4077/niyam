import type { ReactNode } from 'react'

export type SummaryTrend = {
  label: string
  direction: 'up' | 'down' | 'flat'
}

type Props = {
  icon: ReactNode
  label: string
  value: string | number
  trend?: SummaryTrend
  subline?: string
  primary?: boolean
  loading?: boolean
}

export function DashboardSummaryCard({ icon, label, value, trend, subline, primary, loading }: Props) {
  if (loading) {
    return (
      <article className={`dashboard-summary-card ${primary ? 'dashboard-summary-card-primary' : ''} dashboard-summary-card-skeleton`}>
        <div className="dashboard-summary-card-top">
          <span className="dashboard-summary-icon skeleton-block" aria-hidden />
          <span className="dashboard-summary-skeleton-label skeleton-block" />
        </div>
        <span className="dashboard-summary-value skeleton-block dashboard-summary-skeleton-value" />
        <span className="dashboard-summary-trend skeleton-block dashboard-summary-skeleton-trend" />
      </article>
    )
  }

  const arrow = trend?.direction === 'up' ? '↑' : trend?.direction === 'down' ? '↓' : '→'
  const trendClass =
    trend?.direction === 'up'
      ? 'dashboard-summary-trend-up'
      : trend?.direction === 'down'
        ? 'dashboard-summary-trend-down'
        : 'dashboard-summary-trend-flat'

  return (
    <article className={`dashboard-summary-card ${primary ? 'dashboard-summary-card-primary' : ''}`}>
      <div className="dashboard-summary-card-top">
        <span className="dashboard-summary-icon" aria-hidden>
          {icon}
        </span>
        <span className="dashboard-summary-label">{label}</span>
      </div>
      <strong className="dashboard-summary-value">{value}</strong>
      {trend && (
        <span className={`dashboard-summary-trend ${trendClass}`} title="vs prior period">
          <span className="dashboard-summary-trend-arrow" aria-hidden>
            {arrow}
          </span>
          {trend.label}
        </span>
      )}
      {subline && <p className="dashboard-summary-subline">{subline}</p>}
    </article>
  )
}

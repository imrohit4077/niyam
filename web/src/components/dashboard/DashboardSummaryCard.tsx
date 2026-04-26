import type { ReactNode } from 'react'
import type { TrendDirection } from './dashboardTrendUtils'

export type DashboardSummaryCardProps = {
  label: string
  value: string | number
  icon: ReactNode
  trendLabel: string
  trendDirection: TrendDirection
  /** Shown below trend, e.g. period hint */
  hint?: string
  primary?: boolean
  loading?: boolean
}

export function DashboardSummaryCard({
  label,
  value,
  icon,
  trendLabel,
  trendDirection,
  hint,
  primary,
  loading,
}: DashboardSummaryCardProps) {
  if (loading) {
    return (
      <article className={`dashboard-summary-card ${primary ? 'dashboard-summary-card-primary' : ''}`}>
        <div className="dashboard-summary-card-skeleton dashboard-summary-skel-icon" />
        <div className="dashboard-summary-card-skeleton dashboard-summary-skel-label" />
        <div className="dashboard-summary-card-skeleton dashboard-summary-skel-value" />
        <div className="dashboard-summary-card-skeleton dashboard-summary-skel-trend" />
      </article>
    )
  }

  const trendClass =
    trendDirection === 'up'
      ? 'dashboard-trend-up'
      : trendDirection === 'down'
        ? 'dashboard-trend-down'
        : 'dashboard-trend-flat'

  return (
    <article className={`dashboard-summary-card ${primary ? 'dashboard-summary-card-primary' : ''}`}>
      <div className="dashboard-summary-card-top">
        <span className="dashboard-summary-icon" aria-hidden>
          {icon}
        </span>
        <span className="dashboard-summary-label">{label}</span>
      </div>
      <strong className="dashboard-summary-value">{value}</strong>
      <div className={`dashboard-summary-trend ${trendClass}`}>
        <span className="dashboard-summary-trend-arrow" aria-hidden>
          {trendDirection === 'up' ? '↑' : trendDirection === 'down' ? '↓' : '→'}
        </span>
        <span>{trendLabel}</span>
      </div>
      {hint ? <p className="dashboard-summary-hint">{hint}</p> : null}
    </article>
  )
}

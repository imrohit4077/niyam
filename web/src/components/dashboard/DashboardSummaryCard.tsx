import type { ReactNode } from 'react'

export type TrendTone = 'up' | 'down' | 'neutral'

export type DashboardSummaryCardProps = {
  icon: ReactNode
  label: string
  value: string | number
  trendLabel: string
  trendTone: TrendTone
  primary?: boolean
  loading?: boolean
}

export function DashboardSummaryCard({
  icon,
  label,
  value,
  trendLabel,
  trendTone,
  primary,
  loading,
}: DashboardSummaryCardProps) {
  if (loading) {
    return (
      <article className={`dashboard-stat-card ${primary ? 'dashboard-stat-card-primary' : ''} dashboard-stat-card-skeleton`}>
        <div className="dashboard-stat-card-top">
          <span className="dashboard-stat-icon dashboard-skeleton-block" aria-hidden />
          <div className="dashboard-skeleton-line dashboard-skeleton-line-short" />
        </div>
        <div className="dashboard-skeleton-line dashboard-skeleton-line-value" />
        <div className="dashboard-skeleton-line dashboard-skeleton-line-trend" />
      </article>
    )
  }

  return (
    <article className={`dashboard-stat-card ${primary ? 'dashboard-stat-card-primary' : ''}`}>
      <div className="dashboard-stat-card-top">
        <span className="dashboard-stat-icon" aria-hidden>
          {icon}
        </span>
        <span className="dashboard-stat-label">{label}</span>
      </div>
      <strong className="dashboard-stat-value">{value}</strong>
      <p className={`dashboard-stat-trend dashboard-stat-trend-${trendTone}`}>{trendLabel}</p>
    </article>
  )
}

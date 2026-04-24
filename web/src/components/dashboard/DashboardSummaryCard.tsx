import type { ReactNode } from 'react'
import type { TrendParts } from './dashboardMetrics'

type Props = {
  label: string
  value: string | number
  icon: ReactNode
  trend?: TrendParts
  sublabel?: string
  primary?: boolean
  loading?: boolean
}

export function DashboardSummaryCard({ label, value, icon, trend, sublabel, primary, loading }: Props) {
  if (loading) {
    return (
      <article className={`dashboard-summary-card ${primary ? 'dashboard-summary-card--primary' : ''}`}>
        <div className="dashboard-summary-card__top">
          <span className="dashboard-summary-card__icon dashboard-skeleton-icon" aria-hidden />
          <div className="dashboard-summary-card__skeleton-label dashboard-skeleton-line" />
        </div>
        <div className="dashboard-summary-card__value dashboard-skeleton-line dashboard-skeleton-line--lg" />
        <div className="dashboard-summary-card__trend dashboard-skeleton-line dashboard-skeleton-line--sm" />
      </article>
    )
  }

  return (
    <article className={`dashboard-summary-card ${primary ? 'dashboard-summary-card--primary' : ''}`}>
      <div className="dashboard-summary-card__top">
        <span className="dashboard-summary-card__icon" aria-hidden>
          {icon}
        </span>
        <span className="dashboard-summary-card__label">{label}</span>
      </div>
      <strong className="dashboard-summary-card__value">{value}</strong>
      {trend && (
        <p className="dashboard-summary-card__trend">
          <span className={`dashboard-summary-card__arrow dashboard-summary-card__arrow--${trend.arrow === '—' ? 'flat' : trend.arrow === '↑' ? 'up' : 'down'}`}>
            {trend.arrow} {trend.pctLabel}
          </span>
          <span className="dashboard-summary-card__trend-caption">{trend.caption}</span>
        </p>
      )}
      {sublabel && <p className="dashboard-summary-card__sublabel">{sublabel}</p>}
    </article>
  )
}

import type { ReactNode } from 'react'
import type { TrendDirection } from './dashboardTrendUtils'

type DashboardSummaryCardProps = {
  label: string
  value: string | number
  icon: ReactNode
  trendLabel: string
  trendDirection: TrendDirection
  sublabel?: string
  highlight?: boolean
}

export function DashboardSummaryCard({
  label,
  value,
  icon,
  trendLabel,
  trendDirection,
  sublabel,
  highlight,
}: DashboardSummaryCardProps) {
  return (
    <article className={`dashboard-summary-card${highlight ? ' dashboard-summary-card--primary' : ''}`}>
      <div className="dashboard-summary-card__top">
        <span className="dashboard-summary-card__icon" aria-hidden>
          {icon}
        </span>
        <span className={`dashboard-summary-card__trend dashboard-summary-card__trend--${trendDirection}`}>
          {trendLabel}
        </span>
      </div>
      <span className="dashboard-summary-card__label">{label}</span>
      <strong className="dashboard-summary-card__value">{value}</strong>
      {sublabel ? <p className="dashboard-summary-card__sub">{sublabel}</p> : null}
    </article>
  )
}

export function DashboardSummaryGridSkeleton() {
  return (
    <div className="dashboard-summary-grid" aria-busy="true" aria-label="Loading summary">
      {[0, 1, 2, 3].map(i => (
        <div key={i} className="dashboard-summary-card dashboard-summary-card--skeleton">
          <div className="dashboard-skeleton dashboard-skeleton--icon" />
          <div className="dashboard-skeleton dashboard-skeleton--line sm" />
          <div className="dashboard-skeleton dashboard-skeleton--line lg" />
          <div className="dashboard-skeleton dashboard-skeleton--line md" />
        </div>
      ))}
    </div>
  )
}

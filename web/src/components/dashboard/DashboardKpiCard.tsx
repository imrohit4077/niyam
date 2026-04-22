import type { ReactNode } from 'react'
import type { TrendDirection } from './dashboardTrend'

function TrendBadge({ direction, pctLabel }: { direction: TrendDirection; pctLabel: string }) {
  const arrow = direction === 'up' ? '↑' : direction === 'down' ? '↓' : direction === 'new' ? '↑' : '—'
  const tone =
    direction === 'up' || direction === 'new'
      ? 'dashboard-kpi-trend-up'
      : direction === 'down'
        ? 'dashboard-kpi-trend-down'
        : 'dashboard-kpi-trend-flat'
  return (
    <span className={`dashboard-kpi-trend ${tone}`} title="Compared to prior period">
      <span className="dashboard-kpi-trend-arrow" aria-hidden>
        {arrow}
      </span>
      <span>{pctLabel}</span>
    </span>
  )
}

export function DashboardKpiCard({
  label,
  value,
  icon,
  trendDirection,
  trendPctLabel,
  footnote,
  primary,
}: {
  label: string
  value: string | number
  icon: ReactNode
  trendDirection: TrendDirection
  trendPctLabel: string
  footnote?: string
  primary?: boolean
}) {
  return (
    <article className={`dashboard-summary-card ${primary ? 'dashboard-summary-card-primary' : ''}`}>
      <div className="dashboard-summary-card-top">
        <span className="dashboard-summary-icon" aria-hidden>
          {icon}
        </span>
        <TrendBadge direction={trendDirection} pctLabel={trendPctLabel} />
      </div>
      <span className="dashboard-summary-label">{label}</span>
      <strong className="dashboard-summary-value">{value}</strong>
      {footnote ? <p className="dashboard-summary-foot">{footnote}</p> : null}
    </article>
  )
}

export function DashboardKpiSkeleton() {
  return (
    <div className="dashboard-summary-card dashboard-skeleton-card" aria-hidden>
      <div className="dashboard-skeleton dashboard-skeleton-icon" />
      <div className="dashboard-skeleton dashboard-skeleton-line sm" />
      <div className="dashboard-skeleton dashboard-skeleton-line lg" />
      <div className="dashboard-skeleton dashboard-skeleton-line md" />
    </div>
  )
}

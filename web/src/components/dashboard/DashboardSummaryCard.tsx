import type { ReactNode } from 'react'

export type TrendDirection = 'up' | 'down' | 'flat' | 'new' | 'none'

export type DashboardSummaryCardProps = {
  icon: ReactNode
  label: string
  value: string | number
  /** e.g. "↑ 12%" or "—" */
  trendLabel: string
  trendDirection: TrendDirection
  footnote?: string
  /** Primary accent card (first KPI) */
  primary?: boolean
}

export function DashboardSummaryCard({
  icon,
  label,
  value,
  trendLabel,
  trendDirection,
  footnote,
  primary,
}: DashboardSummaryCardProps) {
  const trendClass =
    trendDirection === 'up'
      ? 'dashboard-kpi-trend--up'
      : trendDirection === 'down'
        ? 'dashboard-kpi-trend--down'
        : trendDirection === 'new'
          ? 'dashboard-kpi-trend--new'
          : 'dashboard-kpi-trend--neutral'

  return (
    <article className={`dashboard-kpi-card dashboard-kpi-summary ${primary ? 'dashboard-kpi-primary' : ''}`}>
      <div className="dashboard-kpi-summary-top">
        <span className="dashboard-kpi-icon" aria-hidden>
          {icon}
        </span>
        <span className="dashboard-kpi-trend" data-direction={trendDirection}>
          <span className={`dashboard-kpi-trend-text ${trendClass}`}>{trendLabel}</span>
        </span>
      </div>
      <span className="dashboard-kpi-summary-label">{label}</span>
      <strong className="dashboard-kpi-summary-value">{value}</strong>
      {footnote ? <p>{footnote}</p> : null}
    </article>
  )
}

export function DashboardKpiSkeleton() {
  return (
    <div className="dashboard-kpi-skeleton" aria-hidden>
      <div className="dashboard-kpi-skeleton-shimmer" />
    </div>
  )
}

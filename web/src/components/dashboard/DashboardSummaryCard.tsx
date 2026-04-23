import type { ReactNode } from 'react'
import type { KpiTrend } from './dashboardKpi'
import { trendArrow } from './dashboardKpi'

type Props = {
  label: string
  value: string | number
  icon: ReactNode
  trend?: KpiTrend
  /** Shown under the value when no trend or as secondary context */
  hint?: string
  primary?: boolean
  loading?: boolean
}

export default function DashboardSummaryCard({ label, value, icon, trend, hint, primary, loading }: Props) {
  if (loading) {
    return (
      <article className={`dashboard-summary-card ${primary ? 'dashboard-summary-card--primary' : ''}`}>
        <div className="dashboard-summary-card-top">
          <span className="dashboard-summary-skeleton dashboard-summary-skeleton--icon" aria-hidden />
          <span className="dashboard-summary-skeleton dashboard-summary-skeleton--label" aria-hidden />
        </div>
        <span className="dashboard-summary-skeleton dashboard-summary-skeleton--value" aria-hidden />
        <span className="dashboard-summary-skeleton dashboard-summary-skeleton--hint" aria-hidden />
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
    <article className={`dashboard-summary-card ${primary ? 'dashboard-summary-card--primary' : ''}`}>
      <div className="dashboard-summary-card-top">
        <span className="dashboard-summary-icon" aria-hidden>
          {icon}
        </span>
        <span className="dashboard-summary-label">{label}</span>
      </div>
      <strong className="dashboard-summary-value">{value}</strong>
      {trend ? (
        <p className={`dashboard-summary-trend ${trendClass}`}>
          <span className="dashboard-summary-trend-arrow" aria-hidden>
            {trendArrow(trend.direction)}
          </span>
          <span>
            {trend.direction === 'flat' && trend.percent === 0 ? 'No change' : `${trend.percent}%`}
          </span>
          <span className="dashboard-summary-trend-period">{trend.periodLabel}</span>
        </p>
      ) : hint ? (
        <p className="dashboard-summary-hint">{hint}</p>
      ) : null}
    </article>
  )
}

import type { ReactNode } from 'react'
import type { PeriodTrend } from './dashboardUtils'

type Props = {
  label: string
  value: string | number
  icon: ReactNode
  trend?: PeriodTrend
  /** Shown under the value when no trend footnote needed */
  hint?: string
  primary?: boolean
  loading?: boolean
}

export default function DashboardSummaryCard({ label, value, icon, trend, hint, primary, loading }: Props) {
  if (loading) {
    return (
      <article className={`dashboard-summary-card ${primary ? 'dashboard-summary-card--primary' : ''}`}>
        <div className="dashboard-summary-card__top">
          <span className="dashboard-summary-card__icon dashboard-skeleton dashboard-skeleton--icon" aria-hidden />
          <span className="dashboard-skeleton dashboard-skeleton--line-sm" />
        </div>
        <div className="dashboard-skeleton dashboard-skeleton--value" />
        <div className="dashboard-skeleton dashboard-skeleton--line-xs" />
      </article>
    )
  }

  const trendEl =
    trend && trend.direction !== 'flat' ? (
      <span
        className={`dashboard-trend dashboard-trend--${trend.direction}`}
        title={trend.periodLabel}
      >
        {trend.direction === 'up' ? '↑' : '↓'} {trend.percent}%
      </span>
    ) : trend && trend.direction === 'flat' ? (
      <span className="dashboard-trend dashboard-trend--flat" title={trend.periodLabel}>
        — 0%
      </span>
    ) : null

  return (
    <article className={`dashboard-summary-card ${primary ? 'dashboard-summary-card--primary' : ''}`}>
      <div className="dashboard-summary-card__top">
        <span className="dashboard-summary-card__icon" aria-hidden>
          {icon}
        </span>
        <span className="dashboard-summary-card__label">{label}</span>
      </div>
      <div className="dashboard-summary-card__value-row">
        <strong className="dashboard-summary-card__value">{value}</strong>
        {trendEl}
      </div>
      {hint ? <p className="dashboard-summary-card__hint">{hint}</p> : trend ? <p className="dashboard-summary-card__hint">{trend.periodLabel}</p> : null}
    </article>
  )
}

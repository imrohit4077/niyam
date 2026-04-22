import type { ReactNode } from 'react'
import { monthBucketTrend } from './dashboardTrend'

export type DashboardSummaryCardProps = {
  label: string
  value: string | number
  icon: ReactNode
  /** Count in the current calendar month (for trend vs previous month). */
  currentMonthCount: number
  /** Count in the previous calendar month. */
  previousMonthCount: number
  footnote?: string
  primary?: boolean
}

export default function DashboardSummaryCard({
  label,
  value,
  icon,
  currentMonthCount,
  previousMonthCount,
  footnote,
  primary,
}: DashboardSummaryCardProps) {
  const { pct, direction } = monthBucketTrend(currentMonthCount, previousMonthCount)
  const trendLabel =
    direction === 'flat'
      ? '0% vs last month'
      : `${direction === 'up' ? '↑' : '↓'} ${pct}% vs last month`

  return (
    <article className={`dashboard-summary-card ${primary ? 'dashboard-summary-card--primary' : ''}`}>
      <div className="dashboard-summary-card-top">
        <span className="dashboard-summary-card-icon" aria-hidden>
          {icon}
        </span>
        <span className="dashboard-summary-card-label">{label}</span>
      </div>
      <strong className="dashboard-summary-card-value">{value}</strong>
      <div className={`dashboard-summary-card-trend dashboard-summary-card-trend--${direction}`}>
        <span>{trendLabel}</span>
      </div>
      {footnote ? <p className="dashboard-summary-card-foot">{footnote}</p> : null}
    </article>
  )
}

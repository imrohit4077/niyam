import type { ReactNode } from 'react'
import type { TrendDirection } from './dashboardSummaryUtils'

function trendClass(dir: TrendDirection): string {
  if (dir === 'up') return 'dashboard-summary-trend-up'
  if (dir === 'down') return 'dashboard-summary-trend-down'
  if (dir === 'flat') return 'dashboard-summary-trend-flat'
  return 'dashboard-summary-trend-neutral'
}

type DashboardSummaryCardProps = {
  icon: ReactNode
  label: string
  value: string | number
  /** Short context under the value (not the trend). */
  hint?: string
  /** e.g. "vs prior 30 days" */
  trendCaption?: string
  trendText: string
  trendDirection: TrendDirection
  loading?: boolean
}

export function DashboardSummaryCard({
  icon,
  label,
  value,
  hint,
  trendCaption = 'vs prior period',
  trendText,
  trendDirection,
  loading,
}: DashboardSummaryCardProps) {
  return (
    <article className="dashboard-summary-card">
      <div className="dashboard-summary-card-top">
        <span className="dashboard-summary-icon" aria-hidden>
          {icon}
        </span>
        <span className="dashboard-summary-label">{label}</span>
      </div>
      {loading ? (
        <div className="dashboard-summary-skeleton-value" />
      ) : (
        <>
          <strong className="dashboard-summary-value">{value}</strong>
          {hint ? <p className="dashboard-summary-hint">{hint}</p> : null}
          <div className={`dashboard-summary-trend ${trendClass(trendDirection)}`}>
            <span className="dashboard-summary-trend-text">{trendText}</span>
            <span className="dashboard-summary-trend-caption">{trendCaption}</span>
          </div>
        </>
      )}
    </article>
  )
}

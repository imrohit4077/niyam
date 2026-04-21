import type { ReactNode } from 'react'

export type SummaryTrend = {
  direction: 'up' | 'down' | 'flat'
  /** Non-negative display percentage (0–100+), whole number. */
  percent: number
  /** Shown next to the arrow, e.g. "vs prior 30 days". */
  periodLabel?: string
}

type Props = {
  label: string
  value: string | number
  icon: ReactNode
  trend?: SummaryTrend | null
  className?: string
}

function formatTrendArrow(direction: SummaryTrend['direction']) {
  if (direction === 'up') return '↑'
  if (direction === 'down') return '↓'
  return '→'
}

export function DashboardSummaryCard({ label, value, icon, trend, className = '' }: Props) {
  return (
    <article className={`dashboard-summary-card ${className}`.trim()}>
      <div className="dashboard-summary-card-top">
        <span className="dashboard-summary-icon" aria-hidden>
          {icon}
        </span>
        {trend != null && trend.direction !== 'flat' && (
          <span
            className={`dashboard-summary-trend dashboard-summary-trend--${trend.direction}`}
            title={trend.periodLabel}
          >
            <span className="dashboard-summary-trend-arrow">{formatTrendArrow(trend.direction)}</span>
            <span className="dashboard-summary-trend-pct">{trend.percent}%</span>
          </span>
        )}
        {trend != null && trend.direction === 'flat' && trend.percent === 0 && (
          <span className="dashboard-summary-trend dashboard-summary-trend--flat" title={trend.periodLabel}>
            <span className="dashboard-summary-trend-arrow">→</span>
            <span className="dashboard-summary-trend-pct">0%</span>
          </span>
        )}
      </div>
      <strong className="dashboard-summary-value">{value}</strong>
      <span className="dashboard-summary-label">{label}</span>
      {trend?.periodLabel ? (
        <p className="dashboard-summary-caption">{trend.periodLabel}</p>
      ) : (
        <p className="dashboard-summary-caption">&nbsp;</p>
      )}
    </article>
  )
}

export function DashboardSummaryCardSkeleton() {
  return (
    <div className="dashboard-summary-card dashboard-summary-card--skeleton" aria-hidden>
      <div className="dashboard-summary-skel-row">
        <span className="dashboard-summary-skel-icon" />
        <span className="dashboard-summary-skel-trend" />
      </div>
      <span className="dashboard-summary-skel-value" />
      <span className="dashboard-summary-skel-label" />
    </div>
  )
}

import type { ReactNode } from 'react'
import type { TrendVsPrior } from './dashboardPeriodStats'
import { formatTrendLabel } from './dashboardPeriodStats'

type Props = {
  label: string
  value: string | number
  icon: ReactNode
  trend: TrendVsPrior
  /** Shown under the value when not loading */
  hint?: string
  loading?: boolean
  emphasize?: boolean
}

function TrendBadge({ trend }: { trend: TrendVsPrior }) {
  const arrow = trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'
  const label = formatTrendLabel(trend)
  const cls =
    trend.direction === 'up'
      ? 'dashboard-summary-trend dashboard-summary-trend-up'
      : trend.direction === 'down'
        ? 'dashboard-summary-trend dashboard-summary-trend-down'
        : 'dashboard-summary-trend dashboard-summary-trend-flat'
  return (
    <span className={cls} title="vs prior 30 days">
      {arrow} {label}
    </span>
  )
}

export default function DashboardSummaryCard({ label, value, icon, trend, hint, loading, emphasize }: Props) {
  return (
    <article className={`dashboard-summary-card${emphasize ? ' dashboard-summary-card-primary' : ''}`}>
      <div className="dashboard-summary-card-top">
        <div className="dashboard-summary-icon" aria-hidden>
          {icon}
        </div>
        {!loading && <TrendBadge trend={trend} />}
      </div>
      {loading ? (
        <div className="dashboard-summary-skeleton">
          <div className="dashboard-skeleton-line dashboard-skeleton-line-lg" />
          <div className="dashboard-skeleton-line dashboard-skeleton-line-sm" />
        </div>
      ) : (
        <>
          <span className="dashboard-summary-label">{label}</span>
          <strong className="dashboard-summary-value">{value}</strong>
          {hint ? <p className="dashboard-summary-hint">{hint}</p> : null}
        </>
      )}
    </article>
  )
}

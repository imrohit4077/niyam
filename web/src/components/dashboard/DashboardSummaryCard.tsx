import type { ReactNode } from 'react'
import type { TrendResult } from './dashboardUtils'

type Props = {
  label: string
  value: string | number
  icon: ReactNode
  trend: TrendResult
  /** Shown under the value when not loading */
  hint?: string
  loading?: boolean
  emphasize?: boolean
}

function TrendBadge({ trend }: { trend: TrendResult }) {
  const arrow = trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'
  const className =
    trend.direction === 'up'
      ? 'dashboard-summary-trend dashboard-summary-trend--up'
      : trend.direction === 'down'
        ? 'dashboard-summary-trend dashboard-summary-trend--down'
        : 'dashboard-summary-trend dashboard-summary-trend--flat'
  return (
    <span className={className} title="Vs prior 30 days">
      <span className="dashboard-summary-trend-arrow" aria-hidden>
        {arrow}
      </span>
      {trend.label}
    </span>
  )
}

export function DashboardSummaryCard({ label, value, icon, trend, hint, loading, emphasize }: Props) {
  return (
    <article className={`dashboard-summary-card${emphasize ? ' dashboard-summary-card--primary' : ''}`}>
      <div className="dashboard-summary-card-top">
        <div className="dashboard-summary-icon" aria-hidden>
          {icon}
        </div>
        {!loading && <TrendBadge trend={trend} />}
      </div>
      <span className="dashboard-summary-label">{label}</span>
      {loading ? (
        <div className="dashboard-summary-skeleton-value" />
      ) : (
        <>
          <strong className="dashboard-summary-value">{value}</strong>
          {hint ? <p className="dashboard-summary-hint">{hint}</p> : null}
        </>
      )}
    </article>
  )
}

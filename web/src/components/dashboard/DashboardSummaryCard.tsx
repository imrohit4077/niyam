import type { ReactNode } from 'react'
import type { TrendResult } from './dashboardUtils'

function TrendBadge({ trend }: { trend: TrendResult }) {
  const arrow = trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'
  const pctText = trend.pct == null ? '—' : `${trend.pct}%`
  return (
    <span
      className={`dashboard-summary-trend dashboard-summary-trend--${trend.direction}`}
      title={trend.label}
    >
      <span className="dashboard-summary-trend-arrow" aria-hidden>
        {arrow}
      </span>
      <span className="dashboard-summary-trend-pct">{pctText}</span>
    </span>
  )
}

export function DashboardSummaryCard({
  icon,
  label,
  value,
  trend,
  loading,
}: {
  icon: ReactNode
  label: string
  value: string | number
  trend: TrendResult
  loading?: boolean
}) {
  return (
    <article className="dashboard-summary-card">
      <div className="dashboard-summary-card-icon" aria-hidden>
        {icon}
      </div>
      <div className="dashboard-summary-card-body">
        <span className="dashboard-summary-card-label">{label}</span>
        {loading ? (
          <div className="dashboard-skeleton dashboard-skeleton-line dashboard-skeleton-line--lg" />
        ) : (
          <strong className="dashboard-summary-card-value">{value}</strong>
        )}
        <div className="dashboard-summary-card-footer">
          {loading ? (
            <div className="dashboard-skeleton dashboard-skeleton-line dashboard-skeleton-line--sm" />
          ) : (
            <TrendBadge trend={trend} />
          )}
        </div>
      </div>
    </article>
  )
}

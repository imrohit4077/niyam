import type { ReactNode } from 'react'
import type { PeriodTrend } from './dashboardMetrics'

function TrendBadge({ trend }: { trend: PeriodTrend }) {
  const { direction, pct } = trend
  if (direction === 'flat' && pct === 0) {
    return <span className="dashboard-trend dashboard-trend-flat">—</span>
  }
  const arrow = direction === 'up' ? '↑' : direction === 'down' ? '↓' : '→'
  const label = direction === 'flat' ? '0%' : `${arrow} ${pct}%`
  return (
    <span className={`dashboard-trend dashboard-trend-${direction}`} title="Compared to the prior 30-day window">
      {label}
    </span>
  )
}

export function DashboardSummaryCard({
  label,
  value,
  icon,
  trend,
  hint,
  emphasize,
}: {
  label: string
  value: string | number
  icon: ReactNode
  trend: PeriodTrend
  hint?: string
  emphasize?: boolean
}) {
  return (
    <article className={`dashboard-summary-card${emphasize ? ' dashboard-summary-card-primary' : ''}`}>
      <div className="dashboard-summary-card-top">
        <span className="dashboard-summary-card-icon" aria-hidden>
          {icon}
        </span>
        <TrendBadge trend={trend} />
      </div>
      <span className="dashboard-summary-card-label">{label}</span>
      <strong className="dashboard-summary-card-value">{value}</strong>
      {hint ? <p className="dashboard-summary-card-hint">{hint}</p> : null}
    </article>
  )
}

export function DashboardSummarySkeleton() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="dashboard-summary-card dashboard-summary-card-skeleton" aria-hidden>
          <div className="dashboard-skeleton-icon" />
          <div className="dashboard-skeleton-line dashboard-skeleton-line-short" />
          <div className="dashboard-skeleton-line dashboard-skeleton-line-value" />
          <div className="dashboard-skeleton-line dashboard-skeleton-line-hint" />
        </div>
      ))}
    </>
  )
}

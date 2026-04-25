import type { ReactNode } from 'react'
import type { TrendDirection } from './dashboardTrend'

function TrendBadge({ direction, label }: { direction: TrendDirection; label: string }) {
  const arrow = direction === 'up' ? '↑' : direction === 'down' ? '↓' : '→'
  const cls =
    direction === 'up'
      ? 'dashboard-summary-trend dashboard-summary-trend-up'
      : direction === 'down'
        ? 'dashboard-summary-trend dashboard-summary-trend-down'
        : 'dashboard-summary-trend dashboard-summary-trend-flat'
  return (
    <span className={cls} title="Compared to the prior 30 days">
      <span className="dashboard-summary-trend-arrow" aria-hidden>
        {arrow}
      </span>
      {label}
    </span>
  )
}

export function DashboardSummaryCard({
  label,
  value,
  subtitle,
  icon,
  trend,
  primary,
}: {
  label: string
  value: string | number
  subtitle?: string
  icon: ReactNode
  trend: { direction: TrendDirection; label: string }
  primary?: boolean
}) {
  return (
    <article className={`dashboard-summary-card${primary ? ' dashboard-summary-card-primary' : ''}`}>
      <div className="dashboard-summary-card-top">
        <span className="dashboard-summary-card-icon" aria-hidden>
          {icon}
        </span>
        <TrendBadge direction={trend.direction} label={trend.label} />
      </div>
      <span className="dashboard-summary-card-label">{label}</span>
      <strong className="dashboard-summary-card-value">{value}</strong>
      {subtitle ? <p className="dashboard-summary-card-sub">{subtitle}</p> : null}
    </article>
  )
}

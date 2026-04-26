import type { ReactNode } from 'react'
import type { TrendDirection } from './dashboardTrend'

function TrendBadge({ direction, label }: { direction: TrendDirection; label: string }) {
  const arrow = direction === 'up' ? '↑' : direction === 'down' ? '↓' : '→'
  const cls =
    direction === 'up'
      ? 'dashboard-kpi-trend dashboard-kpi-trend-up'
      : direction === 'down'
        ? 'dashboard-kpi-trend dashboard-kpi-trend-down'
        : 'dashboard-kpi-trend dashboard-kpi-trend-flat'
  return (
    <span className={cls} title="vs prior period">
      <span className="dashboard-kpi-trend-arrow" aria-hidden>
        {arrow}
      </span>
      {label}
    </span>
  )
}

export function DashboardSummaryCard({
  icon,
  label,
  value,
  trend,
  subtitle,
  primary,
}: {
  icon: ReactNode
  label: string
  value: string | number
  trend?: { direction: TrendDirection; label: string }
  subtitle?: string
  primary?: boolean
}) {
  return (
    <article className={`dashboard-kpi-card dashboard-kpi-card-v2${primary ? ' dashboard-kpi-primary' : ''}`}>
      <div className="dashboard-kpi-card-top">
        <span className="dashboard-kpi-icon" aria-hidden>
          {icon}
        </span>
        {trend ? <TrendBadge direction={trend.direction} label={trend.label} /> : null}
      </div>
      <span className="dashboard-kpi-card-label">{label}</span>
      <strong className="dashboard-kpi-card-value">{value}</strong>
      {subtitle ? <p className="dashboard-kpi-card-sub">{subtitle}</p> : null}
    </article>
  )
}

export function DashboardKpiSkeleton() {
  return (
    <article className="dashboard-kpi-card dashboard-kpi-card-v2 dashboard-kpi-skeleton" aria-hidden>
      <div className="dashboard-kpi-skel-shimmer" />
    </article>
  )
}

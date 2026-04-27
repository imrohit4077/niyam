import type { ReactNode } from 'react'
import type { TrendDirection } from './dashboardUtils'

function TrendBadge({ direction, label }: { direction: TrendDirection; label: string }) {
  const cls =
    direction === 'up'
      ? 'dashboard-summary-trend dashboard-summary-trend--up'
      : direction === 'down'
        ? 'dashboard-summary-trend dashboard-summary-trend--down'
        : 'dashboard-summary-trend dashboard-summary-trend--neutral'
  return <span className={cls}>{label}</span>
}

export function DashboardSummaryCardSkeleton() {
  return (
    <article className="dashboard-summary-card dashboard-summary-card--skeleton" aria-hidden>
      <div className="dashboard-summary-card-top">
        <span className="dashboard-summary-skel dashboard-summary-skel--icon" />
        <span className="dashboard-summary-skel dashboard-summary-skel--trend" />
      </div>
      <span className="dashboard-summary-skel dashboard-summary-skel--value" />
      <span className="dashboard-summary-skel dashboard-summary-skel--label" />
    </article>
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
  trend: { direction: TrendDirection; label: string }
  subtitle?: string
  primary?: boolean
}) {
  return (
    <article className={`dashboard-summary-card${primary ? ' dashboard-summary-card--primary' : ''}`}>
      <div className="dashboard-summary-card-top">
        <span className="dashboard-summary-icon" aria-hidden>
          {icon}
        </span>
        <TrendBadge direction={trend.direction} label={trend.label} />
      </div>
      <strong className="dashboard-summary-value">{value}</strong>
      <span className="dashboard-summary-label">{label}</span>
      {subtitle ? <p className="dashboard-summary-subtitle">{subtitle}</p> : null}
    </article>
  )
}

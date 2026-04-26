import type { ReactNode } from 'react'
import type { TrendDirection } from './dashboardUtils'

function TrendBadge({ direction, pct }: { direction: TrendDirection; pct: number }) {
  if (direction === 'flat') {
    return <span className="dashboard-kpi-trend dashboard-kpi-trend--flat">— 0%</span>
  }
  const arrow = direction === 'up' ? '↑' : '↓'
  const cls =
    direction === 'up' ? 'dashboard-kpi-trend dashboard-kpi-trend--up' : 'dashboard-kpi-trend dashboard-kpi-trend--down'
  return (
    <span className={cls}>
      {arrow} {pct}%
    </span>
  )
}

export function SummaryCard({
  label,
  value,
  icon,
  trend,
  subtitle,
  primary,
}: {
  label: string
  value: string | number
  icon: ReactNode
  trend: { direction: TrendDirection; pct: number }
  subtitle?: string
  primary?: boolean
}) {
  return (
    <article className={`dashboard-kpi-card${primary ? ' dashboard-kpi-primary' : ''}`}>
      <div className="dashboard-kpi-card-top">
        <span className="dashboard-kpi-icon" aria-hidden>
          {icon}
        </span>
        <TrendBadge direction={trend.direction} pct={trend.pct} />
      </div>
      <span>{label}</span>
      <strong>{value}</strong>
      {subtitle ? <p>{subtitle}</p> : null}
    </article>
  )
}

export function SummaryCardSkeleton() {
  return (
    <div className="dashboard-kpi-card dashboard-kpi-skeleton" aria-hidden>
      <div className="dashboard-kpi-skeleton-row">
        <span className="dashboard-kpi-skeleton-icon" />
        <span className="dashboard-kpi-skeleton-pill" />
      </div>
      <span className="dashboard-kpi-skeleton-line dashboard-kpi-skeleton-line--short" />
      <span className="dashboard-kpi-skeleton-line dashboard-kpi-skeleton-line--value" />
      <span className="dashboard-kpi-skeleton-line" />
    </div>
  )
}

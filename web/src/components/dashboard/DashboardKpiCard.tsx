import type { ReactNode } from 'react'
import type { MonthOverMonth } from './utils'

function TrendBadge({ trend }: { trend: MonthOverMonth }) {
  const { direction, percent } = trend
  if (direction === 'flat' && (percent === 0 || percent === null)) {
    return <span className="dashboard-kpi-trend dashboard-kpi-trend-neutral">—</span>
  }
  const arrow = direction === 'up' ? '↑' : direction === 'down' ? '↓' : '→'
  const label =
    percent === null ? (direction === 'up' ? 'New' : '—') : `${arrow} ${percent}%`
  return (
    <span
      className={`dashboard-kpi-trend dashboard-kpi-trend-${direction === 'flat' ? 'neutral' : direction === 'up' ? 'positive' : 'negative'}`}
    >
      {label}
    </span>
  )
}

export function DashboardKpiCard({
  label,
  value,
  subtitle,
  icon,
  trend,
  primary,
}: {
  label: string
  value: ReactNode
  subtitle?: string
  icon: ReactNode
  trend: MonthOverMonth | 'loading'
  primary?: boolean
}) {
  return (
    <article className={`dashboard-kpi-card${primary ? ' dashboard-kpi-primary' : ''}`}>
      <div className="dashboard-kpi-card-top">
        <span className="dashboard-kpi-icon" aria-hidden>
          {icon}
        </span>
        {trend === 'loading' ? (
          <span className="dashboard-kpi-trend dashboard-kpi-trend-skeleton" />
        ) : (
          <TrendBadge trend={trend} />
        )}
      </div>
      <div className="dashboard-kpi-label">{label}</div>
      <strong className="dashboard-kpi-value">{value}</strong>
      {subtitle ? <p className="dashboard-kpi-subtitle">{subtitle}</p> : null}
    </article>
  )
}

export function DashboardKpiSkeletonGrid() {
  return (
    <div className="dashboard-kpi-grid" aria-busy="true" aria-label="Loading summary">
      {Array.from({ length: 4 }).map((_, i) => (
        <article key={i} className="dashboard-kpi-card dashboard-kpi-card-skeleton">
          <div className="dashboard-kpi-card-top">
            <span className="dashboard-kpi-icon dashboard-skeleton-block" />
            <span className="dashboard-kpi-trend dashboard-kpi-trend-skeleton" />
          </div>
          <span className="dashboard-skeleton-line dashboard-skeleton-line--sm" />
          <span className="dashboard-skeleton-line dashboard-skeleton-line--lg" />
          <span className="dashboard-skeleton-line dashboard-skeleton-line--md" />
        </article>
      ))}
    </div>
  )
}

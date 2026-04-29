import type { ReactNode } from 'react'
import type { TrendDirection } from './dashboardUtils'

type Props = {
  label: string
  value: string | number
  icon: ReactNode
  trend?: { direction: TrendDirection; percent: number; hint?: string }
  loading?: boolean
  emphasize?: boolean
}

function TrendBadge({ direction, percent }: { direction: TrendDirection; percent: number }) {
  if (direction === 'flat' || percent === 0) {
    return (
      <span className="dashboard-kpi-trend dashboard-kpi-trend-flat" title="No meaningful change vs prior period">
        — 0%
      </span>
    )
  }
  const arrow = direction === 'up' ? '↑' : '↓'
  const cls =
    direction === 'up' ? 'dashboard-kpi-trend dashboard-kpi-trend-up' : 'dashboard-kpi-trend dashboard-kpi-trend-down'
  return (
    <span className={cls} title={direction === 'up' ? 'Up vs prior period' : 'Down vs prior period'}>
      {arrow} {percent}%
    </span>
  )
}

export function DashboardSummaryStat({ label, value, icon, trend, loading, emphasize }: Props) {
  return (
    <article className={`dashboard-kpi-card ${emphasize ? 'dashboard-kpi-primary' : ''}`}>
      <div className="dashboard-kpi-card-head">
        <span className="dashboard-kpi-icon" aria-hidden>
          {icon}
        </span>
        <span>{label}</span>
      </div>
      {loading ? (
        <div className="dashboard-kpi-skeleton-value" aria-hidden />
      ) : (
        <strong>{value}</strong>
      )}
      {loading ? (
        <div className="dashboard-kpi-skeleton-sub" aria-hidden />
      ) : (
        <p>
          {trend ? (
            <>
              <TrendBadge direction={trend.direction} percent={trend.percent} />
              {trend.hint ? <span className="dashboard-kpi-hint"> {trend.hint}</span> : null}
            </>
          ) : (
            <span className="dashboard-kpi-hint">—</span>
          )}
        </p>
      )}
    </article>
  )
}

export function DashboardKpiSkeletonGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="dashboard-kpi-grid">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="dashboard-kpi-card dashboard-kpi-card-skeleton" aria-hidden>
          <div className="dashboard-kpi-skeleton-head" />
          <div className="dashboard-kpi-skeleton-value" />
          <div className="dashboard-kpi-skeleton-sub" />
        </div>
      ))}
    </div>
  )
}

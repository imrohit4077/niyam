import type { ReactNode } from 'react'

export type DashboardTrend = {
  /** Signed percentage change vs comparison period, or null if not meaningful */
  pct: number | null
  label?: string
}

type Props = {
  icon: ReactNode
  label: string
  value: string | number
  trend?: DashboardTrend
  /** Highlight first card (brand) */
  primary?: boolean
}

function TrendBadge({ trend }: { trend: DashboardTrend }) {
  if (trend.pct === null) {
    return (
      <span className="dashboard-kpi-trend dashboard-kpi-trend-neutral" title={trend.label}>
        —
      </span>
    )
  }
  const up = trend.pct > 0
  const flat = trend.pct === 0
  const arrow = flat ? '→' : up ? '↑' : '↓'
  const cls = flat ? 'dashboard-kpi-trend-neutral' : up ? 'dashboard-kpi-trend-up' : 'dashboard-kpi-trend-down'
  return (
    <span className={`dashboard-kpi-trend ${cls}`} title={trend.label}>
      {arrow} {Math.abs(trend.pct)}%
    </span>
  )
}

export function DashboardSummaryStatCard({ icon, label, value, trend, primary }: Props) {
  return (
    <article className={`dashboard-kpi-card dashboard-kpi-stat ${primary ? 'dashboard-kpi-primary' : ''}`}>
      <div className="dashboard-kpi-stat-top">
        <span className="dashboard-kpi-icon" aria-hidden>
          {icon}
        </span>
        {trend && <TrendBadge trend={trend} />}
      </div>
      <span className="dashboard-kpi-label">{label}</span>
      <strong className="dashboard-kpi-value">{value}</strong>
    </article>
  )
}

export function DashboardKpiSkeletonRow() {
  return (
    <div className="dashboard-kpi-grid dashboard-kpi-grid-skeleton" aria-hidden>
      {[0, 1, 2, 3].map(i => (
        <div key={i} className="dashboard-kpi-skeleton-card" />
      ))}
    </div>
  )
}

export function DashboardPanelBodySkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="dashboard-panel-skeleton">
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="dashboard-panel-skeleton-line" style={{ width: `${72 - i * 12}%` }} />
      ))}
    </div>
  )
}

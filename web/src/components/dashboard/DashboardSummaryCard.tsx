import type { ReactNode } from 'react'

export type DashboardTrend = {
  direction: 'up' | 'down' | 'flat'
  /** Whole number percentage change vs comparison period (can be negative). */
  percent: number
  caption: string
}

type Props = {
  icon: ReactNode
  label: string
  value: string | number
  trend?: DashboardTrend | null
  loading?: boolean
  primary?: boolean
}

function TrendBadge({ trend }: { trend: DashboardTrend }) {
  const arrow = trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'
  const sign = trend.percent > 0 ? '+' : ''
  const pct = Number.isFinite(trend.percent) ? `${sign}${Math.round(trend.percent)}%` : '—'
  const cls =
    trend.direction === 'up'
      ? 'dashboard-kpi-trend dashboard-kpi-trend-up'
      : trend.direction === 'down'
        ? 'dashboard-kpi-trend dashboard-kpi-trend-down'
        : 'dashboard-kpi-trend dashboard-kpi-trend-flat'

  return (
    <div className={cls} title={trend.caption}>
      <span className="dashboard-kpi-trend-arrow" aria-hidden>
        {arrow}
      </span>
      <span className="dashboard-kpi-trend-pct">{pct}</span>
      <span className="dashboard-kpi-trend-cap">{trend.caption}</span>
    </div>
  )
}

export function DashboardSummaryCard({ icon, label, value, trend, loading, primary }: Props) {
  return (
    <article className={`dashboard-kpi-card${primary ? ' dashboard-kpi-primary' : ''}`}>
      <div className="dashboard-kpi-card-top">
        <span className="dashboard-kpi-icon" aria-hidden>
          {icon}
        </span>
        {loading ? (
          <div className="dashboard-skeleton dashboard-skeleton-trend" />
        ) : trend ? (
          <TrendBadge trend={trend} />
        ) : null}
      </div>
      <span>{label}</span>
      {loading ? (
        <div className="dashboard-skeleton dashboard-skeleton-value" />
      ) : (
        <strong>{value}</strong>
      )}
    </article>
  )
}

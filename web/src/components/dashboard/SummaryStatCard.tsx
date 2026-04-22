import type { ReactNode } from 'react'

export type TrendDirection = 'up' | 'down' | 'flat'

export type SummaryTrend = {
  direction: TrendDirection
  label: string
}

type SummaryStatCardProps = {
  label: string
  value: string | number
  icon: ReactNode
  trend?: SummaryTrend | null
  sublabel?: string
  highlight?: boolean
  loading?: boolean
}

function TrendBadge({ trend }: { trend: SummaryTrend }) {
  const arrow = trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'
  const cls =
    trend.direction === 'up'
      ? 'dashboard-stat-trend-up'
      : trend.direction === 'down'
        ? 'dashboard-stat-trend-down'
        : 'dashboard-stat-trend-flat'
  return (
    <span className={`dashboard-stat-trend ${cls}`} title="Compared to prior period">
      {arrow} {trend.label}
    </span>
  )
}

export function SummaryStatCard({ label, value, icon, trend, sublabel, highlight, loading }: SummaryStatCardProps) {
  return (
    <article className={`dashboard-stat-card ${highlight ? 'dashboard-stat-card-highlight' : ''}`}>
      <div className="dashboard-stat-card-top">
        <span className="dashboard-stat-icon" aria-hidden>
          {icon}
        </span>
        {!loading && trend ? <TrendBadge trend={trend} /> : null}
        {loading ? <span className="dashboard-stat-trend-skeleton" /> : null}
      </div>
      {loading ? (
        <>
          <div className="dashboard-skeleton-line dashboard-skeleton-line-lg" />
          <div className="dashboard-skeleton-line dashboard-skeleton-line-sm" />
        </>
      ) : (
        <>
          <span className="dashboard-stat-label">{label}</span>
          <strong className="dashboard-stat-value">{value}</strong>
          {sublabel ? <p className="dashboard-stat-sublabel">{sublabel}</p> : null}
        </>
      )}
    </article>
  )
}

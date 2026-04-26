import type { ReactNode } from 'react'

export type DashboardTrend = {
  /** Percent change vs comparison period (e.g. vs last month). */
  percent: number | null
  /** Short context, e.g. "vs last month". */
  caption: string
  /** When true, an increase in value is shown as positive (green). */
  upIsPositive?: boolean
}

function TrendBadge({ trend }: { trend: DashboardTrend }) {
  const { percent, caption, upIsPositive = true } = trend
  if (percent === null) {
    return (
      <span className="dashboard-kpi-trend dashboard-kpi-trend-neutral" title={caption}>
        — <span className="dashboard-kpi-trend-caption">{caption}</span>
      </span>
    )
  }
  const up = percent > 0
  const flat = percent === 0
  const good = flat ? true : up ? upIsPositive : !upIsPositive
  const tone = flat ? 'neutral' : good ? 'positive' : 'negative'
  const arrow = flat ? '→' : up ? '↑' : '↓'
  return (
    <span className={`dashboard-kpi-trend dashboard-kpi-trend-${tone}`} title={caption}>
      {arrow} {Math.abs(percent)}%{' '}
      <span className="dashboard-kpi-trend-caption">{caption}</span>
    </span>
  )
}

export function DashboardSummaryStatCard({
  icon,
  label,
  value,
  sublabel,
  trend,
  highlight,
}: {
  icon: ReactNode
  label: string
  value: string | number
  sublabel?: string
  trend?: DashboardTrend
  highlight?: boolean
}) {
  return (
    <article className={`dashboard-kpi-card dashboard-kpi-stat ${highlight ? 'dashboard-kpi-primary' : ''}`}>
      <div className="dashboard-kpi-stat-top">
        <span className="dashboard-kpi-icon" aria-hidden>
          {icon}
        </span>
        <span className="dashboard-kpi-stat-label">{label}</span>
      </div>
      <strong className="dashboard-kpi-stat-value">{value}</strong>
      <div className="dashboard-kpi-stat-bottom">
        {sublabel ? <p>{sublabel}</p> : <p className="dashboard-kpi-stat-spacer" />}
        {trend ? <TrendBadge trend={trend} /> : null}
      </div>
    </article>
  )
}

export function DashboardKpiSkeletonCard() {
  return (
    <div className="dashboard-kpi-card dashboard-kpi-skeleton" aria-hidden>
      <div className="dashboard-kpi-skeleton-line dashboard-kpi-skeleton-line-short" />
      <div className="dashboard-kpi-skeleton-line dashboard-kpi-skeleton-line-value" />
      <div className="dashboard-kpi-skeleton-line dashboard-kpi-skeleton-line-medium" />
    </div>
  )
}

import type { ReactNode } from 'react'

export type TrendDirection = 'up' | 'down' | 'flat'

export type SummaryStatCardProps = {
  label: string
  value: string | number
  icon: ReactNode
  trendPercent: number | null
  trendDirection: TrendDirection
  sublabel?: string
  loading?: boolean
  highlight?: boolean
}

function TrendBadge({ percent, direction }: { percent: number | null; direction: TrendDirection }) {
  if (percent === null || !Number.isFinite(percent)) {
    return <span className="dashboard-stat-trend dashboard-stat-trend-muted">—</span>
  }
  const arrow = direction === 'up' ? '↑' : direction === 'down' ? '↓' : '→'
  const cls =
    direction === 'up'
      ? 'dashboard-stat-trend-up'
      : direction === 'down'
        ? 'dashboard-stat-trend-down'
        : 'dashboard-stat-trend-flat'
  return (
    <span className={`dashboard-stat-trend ${cls}`}>
      {arrow} {Math.abs(percent)}%
    </span>
  )
}

export function SummaryStatCard({
  label,
  value,
  icon,
  trendPercent,
  trendDirection,
  sublabel,
  loading,
  highlight,
}: SummaryStatCardProps) {
  if (loading) {
    return (
      <article className={`dashboard-stat-card ${highlight ? 'dashboard-stat-card-highlight' : ''}`}>
        <div className="dashboard-stat-card-top">
          <span className="dashboard-skeleton dashboard-skeleton-icon" />
          <span className="dashboard-skeleton dashboard-skeleton-trend" />
        </div>
        <span className="dashboard-skeleton dashboard-skeleton-label" />
        <span className="dashboard-skeleton dashboard-skeleton-value" />
        <span className="dashboard-skeleton dashboard-skeleton-sub" />
      </article>
    )
  }

  return (
    <article className={`dashboard-stat-card ${highlight ? 'dashboard-stat-card-highlight' : ''}`}>
      <div className="dashboard-stat-card-top">
        <span className="dashboard-stat-icon" aria-hidden>
          {icon}
        </span>
        <TrendBadge percent={trendPercent} direction={trendDirection} />
      </div>
      <span className="dashboard-stat-label">{label}</span>
      <strong className="dashboard-stat-value">{value}</strong>
      {sublabel ? <p className="dashboard-stat-sub">{sublabel}</p> : null}
    </article>
  )
}

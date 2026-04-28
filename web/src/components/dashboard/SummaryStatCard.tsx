import type { ReactNode } from 'react'
import type { TrendDirection } from './dashboardTrend'

function TrendBadge({ direction, pct }: { direction: TrendDirection; pct: number }) {
  if (direction === 'flat') {
    return <span className="dashboard-stat-trend dashboard-stat-trend--flat">— 0%</span>
  }
  const arrow = direction === 'up' ? '↑' : '↓'
  const label = `${arrow} ${pct}%`
  return (
    <span className={`dashboard-stat-trend dashboard-stat-trend--${direction === 'up' ? 'up' : 'down'}`}>
      {label}
      <span className="dashboard-stat-trend-hint"> vs prior period</span>
    </span>
  )
}

export function SummaryStatCard({
  label,
  value,
  sublabel,
  icon,
  trendDirection,
  trendPct,
}: {
  label: string
  value: string | number
  sublabel?: string
  icon: ReactNode
  trendDirection: TrendDirection
  trendPct: number
}) {
  return (
    <article className="dashboard-stat-card">
      <div className="dashboard-stat-card-top">
        <span className="dashboard-stat-icon" aria-hidden>
          {icon}
        </span>
        <TrendBadge direction={trendDirection} pct={trendPct} />
      </div>
      <span className="dashboard-stat-label">{label}</span>
      <strong className="dashboard-stat-value">{value}</strong>
      {sublabel ? <p className="dashboard-stat-sublabel">{sublabel}</p> : null}
    </article>
  )
}

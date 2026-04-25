import type { ReactNode } from 'react'
import type { TrendDirection } from './dashboardUtils'

function TrendGlyph({ direction, pct }: { direction: TrendDirection; pct: number }) {
  if (direction === 'flat') {
    return (
      <span className="dashboard-stat-trend dashboard-stat-trend--flat" title="No change vs last month">
        — 0%
      </span>
    )
  }
  const arrow = direction === 'up' ? '↑' : '↓'
  const cls =
    direction === 'up' ? 'dashboard-stat-trend dashboard-stat-trend--up' : 'dashboard-stat-trend dashboard-stat-trend--down'
  return (
    <span className={cls} title="Vs prior calendar month">
      {arrow} {pct}%
    </span>
  )
}

export function DashboardStatCard({
  icon,
  label,
  value,
  trendDirection,
  trendPct,
  hint,
  highlight,
  skeleton,
}: {
  icon: ReactNode
  label: string
  value: string | number
  trendDirection: TrendDirection
  trendPct: number
  hint?: string
  highlight?: boolean
  skeleton?: boolean
}) {
  if (skeleton) {
    return (
      <article className="dashboard-stat-card dashboard-stat-card--skeleton" aria-hidden>
        <div className="dashboard-stat-skel-icon" />
        <div className="dashboard-stat-skel-label" />
        <div className="dashboard-stat-skel-value" />
        <div className="dashboard-stat-skel-trend" />
      </article>
    )
  }

  return (
    <article className={`dashboard-stat-card${highlight ? ' dashboard-stat-card--primary' : ''}`}>
      <div className="dashboard-stat-card-top">
        <div className="dashboard-stat-icon" aria-hidden>
          {icon}
        </div>
        <TrendGlyph direction={trendDirection} pct={trendPct} />
      </div>
      <span className="dashboard-stat-label">{label}</span>
      <strong className="dashboard-stat-value">{value}</strong>
      {hint ? <p className="dashboard-stat-hint">{hint}</p> : null}
    </article>
  )
}

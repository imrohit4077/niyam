import type { ReactNode } from 'react'

type Trend = { direction: 'up' | 'down' | 'flat'; pct: number }

function TrendBadge({ trend, invertColors }: { trend: Trend; invertColors?: boolean }) {
  const { direction, pct } = trend
  if (direction === 'flat') {
    return (
      <span className="dashboard-stat-trend dashboard-stat-trend-flat" aria-label="No change vs prior period">
        — 0%
      </span>
    )
  }
  const arrow = direction === 'up' ? '↑' : '↓'
  const goodUp = !invertColors
  const positive = direction === 'up' ? goodUp : !goodUp
  const cls = positive ? 'dashboard-stat-trend-pos' : 'dashboard-stat-trend-neg'
  return (
    <span className={`dashboard-stat-trend ${cls}`} aria-label={`${direction === 'up' ? 'Up' : 'Down'} ${pct}% vs prior period`}>
      {arrow} {pct}%
    </span>
  )
}

export function SummaryStatCard({
  icon,
  label,
  value,
  hint,
  trend,
  trendInvert,
}: {
  icon: ReactNode
  label: string
  value: string | number
  hint?: string
  trend: Trend
  /** When true, down is good (e.g. fewer rejections — not used by default). */
  trendInvert?: boolean
}) {
  return (
    <article className="dashboard-stat-card">
      <div className="dashboard-stat-card-top">
        <span className="dashboard-stat-icon" aria-hidden>
          {icon}
        </span>
        <TrendBadge trend={trend} invertColors={trendInvert} />
      </div>
      <span className="dashboard-stat-label">{label}</span>
      <strong className="dashboard-stat-value">{value}</strong>
      {hint ? <p className="dashboard-stat-hint">{hint}</p> : null}
    </article>
  )
}

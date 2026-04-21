import type { ReactNode } from 'react'
import type { TrendDirection } from './dashboardMetrics'

function TrendGlyph({ direction, pct }: { direction: TrendDirection; pct: number }) {
  if (direction === 'flat') {
    return <span className="dashboard-kpi-trend dashboard-kpi-trend-flat">— 0%</span>
  }
  const arrow = direction === 'up' ? '↑' : '↓'
  const cls =
    direction === 'up' ? 'dashboard-kpi-trend dashboard-kpi-trend-up' : 'dashboard-kpi-trend dashboard-kpi-trend-down'
  return (
    <span className={cls}>
      {arrow} {pct}%
    </span>
  )
}

export function DashboardSummaryCard({
  label,
  value,
  icon,
  trendDirection,
  trendPct,
  caption,
  primary,
}: {
  label: string
  value: string | number
  icon: ReactNode
  trendDirection: TrendDirection
  trendPct: number
  caption: string
  primary?: boolean
}) {
  return (
    <article className={`dashboard-kpi-card dashboard-kpi-card-v2 ${primary ? 'dashboard-kpi-primary' : ''}`}>
      <div className="dashboard-kpi-card-top">
        <div className="dashboard-kpi-icon" aria-hidden>
          {icon}
        </div>
        <TrendGlyph direction={trendDirection} pct={trendPct} />
      </div>
      <span className="dashboard-kpi-label">{label}</span>
      <strong className="dashboard-kpi-value">{value}</strong>
      <p className="dashboard-kpi-caption">{caption}</p>
    </article>
  )
}

import type { ReactNode } from 'react'
import type { TrendParts } from './dashboardUtils'

function TrendGlyph({ trend }: { trend: TrendParts }) {
  if (trend.direction === 'neutral') {
    return <span className="dashboard-kpi-trend dashboard-kpi-trend-neutral">{trend.percentLabel}</span>
  }
  const arrow = trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'
  const mod =
    trend.direction === 'up'
      ? 'dashboard-kpi-trend-up'
      : trend.direction === 'down'
        ? 'dashboard-kpi-trend-down'
        : 'dashboard-kpi-trend-flat'
  return (
    <span className={`dashboard-kpi-trend ${mod}`} title={trend.caption}>
      <span className="dashboard-kpi-trend-arrow" aria-hidden>
        {arrow}
      </span>
      <span className="dashboard-kpi-trend-pct">{trend.percentLabel}</span>
      <span className="dashboard-kpi-trend-caption">{trend.caption}</span>
    </span>
  )
}

export function DashboardSummaryCard({
  icon,
  label,
  value,
  trend,
  sublabel,
  highlight,
}: {
  icon: ReactNode
  label: string
  value: string | number
  trend: TrendParts
  sublabel?: string
  highlight?: boolean
}) {
  return (
    <article className={`dashboard-summary-card ${highlight ? 'dashboard-summary-card--primary' : ''}`}>
      <div className="dashboard-summary-card-top">
        <div className="dashboard-summary-icon" aria-hidden>
          {icon}
        </div>
        <TrendGlyph trend={trend} />
      </div>
      <span className="dashboard-summary-label">{label}</span>
      <strong className="dashboard-summary-value">{value}</strong>
      {sublabel ? <p className="dashboard-summary-sublabel">{sublabel}</p> : null}
    </article>
  )
}

import type { ReactNode } from 'react'
import type { TrendIndicator } from './dashboardMetrics'

type Props = {
  label: string
  value: string | number
  icon: ReactNode
  trend: TrendIndicator
  footnote?: string
  highlight?: boolean
}

function TrendBadge({ trend }: { trend: TrendIndicator }) {
  const arrow = trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'
  const mod =
    trend.direction === 'up'
      ? 'dashboard-trend-up'
      : trend.direction === 'down'
        ? 'dashboard-trend-down'
        : 'dashboard-trend-flat'
  return (
    <span className={`dashboard-trend-badge ${mod}`} title="Compared to prior 30-day period">
      <span className="dashboard-trend-arrow" aria-hidden>
        {arrow}
      </span>
      <span className="dashboard-trend-pct">{trend.label}</span>
    </span>
  )
}

export function DashboardSummaryCard({ label, value, icon, trend, footnote, highlight }: Props) {
  return (
    <article className={`dashboard-summary-card${highlight ? ' dashboard-summary-card-primary' : ''}`}>
      <div className="dashboard-summary-card-top">
        <div className="dashboard-summary-icon" aria-hidden>
          {icon}
        </div>
        <TrendBadge trend={trend} />
      </div>
      <div className="dashboard-summary-value">{value}</div>
      <div className="dashboard-summary-label">{label}</div>
      {footnote ? <p className="dashboard-summary-footnote">{footnote}</p> : null}
    </article>
  )
}

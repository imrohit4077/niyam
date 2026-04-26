import type { ReactNode } from 'react'
import type { TrendDirection } from './dashboardUtils'

function TrendBadge({ direction, label }: { direction: TrendDirection; label: string }) {
  const sym = direction === 'up' ? '↑' : direction === 'down' ? '↓' : '→'
  const cls =
    direction === 'up'
      ? 'dashboard-kpi-trend-up'
      : direction === 'down'
        ? 'dashboard-kpi-trend-down'
        : 'dashboard-kpi-trend-flat'
  return (
    <span className={`dashboard-kpi-trend ${cls}`} title={label}>
      <span className="dashboard-kpi-trend-arrow" aria-hidden>
        {sym}
      </span>
      {label}
    </span>
  )
}

export function DashboardSummaryCard({
  label,
  value,
  trendLabel,
  trendDirection,
  icon,
  highlight,
}: {
  label: string
  value: string | number
  trendLabel: string
  trendDirection: TrendDirection
  icon: ReactNode
  highlight?: boolean
}) {
  return (
    <article className={`dashboard-kpi-card dashboard-kpi-card-v2 ${highlight ? 'dashboard-kpi-primary' : ''}`}>
      <div className="dashboard-kpi-card-top">
        <span className="dashboard-kpi-icon" aria-hidden>
          {icon}
        </span>
        <TrendBadge direction={trendDirection} label={trendLabel} />
      </div>
      <span className="dashboard-kpi-label">{label}</span>
      <strong className="dashboard-kpi-value">{value}</strong>
    </article>
  )
}

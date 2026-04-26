import type { ReactNode } from 'react'

export type TrendDirection = 'up' | 'down' | 'flat'

export type DashboardSummaryCardProps = {
  label: string
  value: string | number
  icon: ReactNode
  /** e.g. "+12%" or "—" */
  trendLabel: string
  trendDirection: TrendDirection
  /** Short context under the trend */
  trendHint?: string
  /** Primary accent card (first in row) */
  primary?: boolean
}

function TrendIcon({ direction }: { direction: TrendDirection }) {
  if (direction === 'flat') {
    return (
      <span className="dashboard-kpi-trend-icon dashboard-kpi-trend-flat" aria-hidden>
        →
      </span>
    )
  }
  return (
    <span
      className={`dashboard-kpi-trend-icon ${direction === 'up' ? 'dashboard-kpi-trend-up' : 'dashboard-kpi-trend-down'}`}
      aria-hidden
    >
      {direction === 'up' ? '↑' : '↓'}
    </span>
  )
}

export function DashboardSummaryCard({
  label,
  value,
  icon,
  trendLabel,
  trendDirection,
  trendHint,
  primary,
}: DashboardSummaryCardProps) {
  return (
    <article className={`dashboard-kpi-card dashboard-kpi-stat ${primary ? 'dashboard-kpi-primary' : ''}`}>
      <div className="dashboard-kpi-stat-top">
        <span className="dashboard-kpi-icon" aria-hidden>
          {icon}
        </span>
        <span className="dashboard-kpi-label">{label}</span>
      </div>
      <strong className="dashboard-kpi-value">{value}</strong>
      <div className="dashboard-kpi-trend-row">
        <TrendIcon direction={trendDirection} />
        <span className="dashboard-kpi-trend-label">{trendLabel}</span>
        {trendHint ? <span className="dashboard-kpi-trend-hint">{trendHint}</span> : null}
      </div>
    </article>
  )
}

import type { ReactNode } from 'react'
import type { TrendDirection } from './dashboardTrends'

export type DashboardSummaryCardProps = {
  label: string
  value: string | number
  icon: ReactNode
  trendPercent: number | null
  trendDirection: TrendDirection
  subtitle?: string
  primary?: boolean
}

function TrendBadge({ percent, direction }: { percent: number | null; direction: TrendDirection }) {
  if (percent == null) {
    return (
      <span className="dashboard-kpi-trend dashboard-kpi-trend--flat" aria-label="No comparison data">
        —
      </span>
    )
  }
  if (direction === 'flat') {
    return (
      <span className="dashboard-kpi-trend dashboard-kpi-trend--flat" aria-label="Unchanged vs prior week">
        → {percent}%
      </span>
    )
  }
  const arrow = direction === 'up' ? '↑' : '↓'
  const sign = percent > 0 ? '+' : ''
  return (
    <span
      className={`dashboard-kpi-trend dashboard-kpi-trend--${direction}`}
      aria-label={`${sign}${percent}% vs prior week`}
    >
      {arrow} {sign}
      {Math.abs(percent)}%
    </span>
  )
}

export function DashboardSummaryCard({
  label,
  value,
  icon,
  trendPercent,
  trendDirection,
  subtitle,
  primary,
}: DashboardSummaryCardProps) {
  return (
    <article className={`dashboard-kpi-card${primary ? ' dashboard-kpi-primary' : ''}`}>
      <div className="dashboard-kpi-card-top">
        <span className="dashboard-kpi-icon" aria-hidden="true">
          {icon}
        </span>
        <TrendBadge percent={trendPercent} direction={trendDirection} />
      </div>
      <span>{label}</span>
      <strong>{value}</strong>
      {subtitle ? <p>{subtitle}</p> : null}
    </article>
  )
}

import type { ReactNode } from 'react'

export type TrendDirection = 'up' | 'down' | 'flat'

export type DashboardSummaryCardProps = {
  label: string
  value: string | number
  icon: ReactNode
  trendPercent: number | null
  trendDirection: TrendDirection
  sublabel?: string
  highlight?: boolean
}

function TrendBadge({ percent, direction }: { percent: number | null; direction: TrendDirection }) {
  if (percent === null || direction === 'flat') {
    return (
      <span className="dashboard-kpi-trend dashboard-kpi-trend-neutral" title="Not enough history to compare">
        —
      </span>
    )
  }
  const arrow = direction === 'up' ? '↑' : '↓'
  const sign = percent > 0 ? '+' : ''
  const cls =
    direction === 'up'
      ? 'dashboard-kpi-trend dashboard-kpi-trend-up'
      : 'dashboard-kpi-trend dashboard-kpi-trend-down'
  return (
    <span className={cls} title="Vs prior 30-day period">
      {arrow} {sign}
      {Math.abs(percent)}%
    </span>
  )
}

export default function DashboardSummaryCard({
  label,
  value,
  icon,
  trendPercent,
  trendDirection,
  sublabel,
  highlight,
}: DashboardSummaryCardProps) {
  return (
    <article className={`dashboard-kpi-card dashboard-kpi-card-modern${highlight ? ' dashboard-kpi-primary' : ''}`}>
      <div className="dashboard-kpi-card-top">
        <span className="dashboard-kpi-icon" aria-hidden>
          {icon}
        </span>
        <TrendBadge percent={trendPercent} direction={trendDirection} />
      </div>
      <span className="dashboard-kpi-label">{label}</span>
      <strong className="dashboard-kpi-value">{value}</strong>
      {sublabel ? <p className="dashboard-kpi-sublabel">{sublabel}</p> : null}
    </article>
  )
}

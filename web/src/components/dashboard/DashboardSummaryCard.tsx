import type { ReactNode } from 'react'

export type TrendDirection = 'up' | 'down' | 'flat'

export type DashboardSummaryCardProps = {
  label: string
  value: string | number
  icon: ReactNode
  trendPercent: number | null
  trendDirection: TrendDirection
  subtitle?: string
  variant?: 'default' | 'primary'
}

function TrendBadge({ percent, direction }: { percent: number | null; direction: TrendDirection }) {
  if (percent === null || direction === 'flat') {
    return (
      <span className="dashboard-kpi-trend dashboard-kpi-trend-neutral" title="Insufficient prior-period data">
        —
      </span>
    )
  }
  const arrow = direction === 'up' ? '↑' : '↓'
  const sign = percent > 0 ? '+' : ''
  return (
    <span
      className={`dashboard-kpi-trend dashboard-kpi-trend-${direction === 'up' ? 'up' : 'down'}`}
      title="Compared to previous 30 days"
    >
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
  subtitle,
  variant = 'default',
}: DashboardSummaryCardProps) {
  return (
    <article className={`dashboard-kpi-card dashboard-kpi-card-modern ${variant === 'primary' ? 'dashboard-kpi-primary' : ''}`}>
      <div className="dashboard-kpi-card-top">
        <span className="dashboard-kpi-icon" aria-hidden>
          {icon}
        </span>
        <TrendBadge percent={trendPercent} direction={trendDirection} />
      </div>
      <span className="dashboard-kpi-label">{label}</span>
      <strong className="dashboard-kpi-value">{value}</strong>
      {subtitle ? <p className="dashboard-kpi-subtitle">{subtitle}</p> : null}
    </article>
  )
}

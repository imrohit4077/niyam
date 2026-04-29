import type { ReactNode } from 'react'

export type TrendDirection = 'up' | 'down' | 'flat'

export type DashboardKpiCardProps = {
  label: string
  value: string | number
  icon: ReactNode
  trendPercent: number | null
  trendDirection: TrendDirection
  trendLabel?: string
  subtitle?: string
  emphasize?: boolean
}

function TrendBadge({
  percent,
  direction,
  label,
}: {
  percent: number | null
  direction: TrendDirection
  label?: string
}) {
  if (percent === null) {
    return (
      <span className="dashboard-kpi-trend dashboard-kpi-trend--muted" title={label}>
        —
      </span>
    )
  }
  const arrow = direction === 'up' ? '↑' : direction === 'down' ? '↓' : '→'
  const mod = direction === 'up' ? 'up' : direction === 'down' ? 'down' : 'flat'
  return (
    <span className={`dashboard-kpi-trend dashboard-kpi-trend--${mod}`} title={label}>
      <span className="dashboard-kpi-trend-arrow" aria-hidden>
        {arrow}
      </span>
      {percent}%
    </span>
  )
}

export default function DashboardKpiCard({
  label,
  value,
  icon,
  trendPercent,
  trendDirection,
  trendLabel,
  subtitle,
  emphasize,
}: DashboardKpiCardProps) {
  return (
    <article className={`dashboard-kpi-card${emphasize ? ' dashboard-kpi-primary' : ''}`}>
      <div className="dashboard-kpi-card-head">
        <span className="dashboard-kpi-icon" aria-hidden>
          {icon}
        </span>
        <span className="dashboard-kpi-label">{label}</span>
      </div>
      <div className="dashboard-kpi-value-row">
        <strong>{value}</strong>
        <TrendBadge percent={trendPercent} direction={trendDirection} label={trendLabel} />
      </div>
      {subtitle ? <p>{subtitle}</p> : null}
    </article>
  )
}

import type { ReactNode } from 'react'

export type DashboardTrend = {
  direction: 'up' | 'down' | 'flat'
  /** Absolute percentage point change vs comparison period (0–100 scale). */
  percent: number
  /** Short comparison hint, e.g. "vs prior 28 days". */
  periodLabel?: string
}

function TrendBadge({ trend }: { trend: DashboardTrend }) {
  const { direction, percent, periodLabel } = trend
  const rounded = Math.round(percent)
  if (direction === 'flat' || rounded === 0) {
    return (
      <span className="dashboard-kpi-trend dashboard-kpi-trend-flat" title={periodLabel}>
        <span className="dashboard-kpi-trend-arrow" aria-hidden>
          —
        </span>
        <span className="dashboard-kpi-trend-pct">0%</span>
        {periodLabel ? <span className="dashboard-kpi-trend-hint">{periodLabel}</span> : null}
      </span>
    )
  }
  const arrow = direction === 'up' ? '↑' : '↓'
  const sign = direction === 'up' ? '+' : '−'
  return (
    <span
      className={`dashboard-kpi-trend dashboard-kpi-trend-${direction === 'up' ? 'up' : 'down'}`}
      title={periodLabel}
    >
      <span className="dashboard-kpi-trend-arrow" aria-hidden>
        {arrow}
      </span>
      <span className="dashboard-kpi-trend-pct">
        {sign}
        {rounded}%
      </span>
      {periodLabel ? <span className="dashboard-kpi-trend-hint">{periodLabel}</span> : null}
    </span>
  )
}

export function DashboardKpiCard({
  label,
  value,
  subtitle,
  icon,
  trend,
  variant = 'default',
}: {
  label: string
  value: string | number
  subtitle?: string
  icon: ReactNode
  trend?: DashboardTrend
  variant?: 'default' | 'primary'
}) {
  return (
    <article className={`dashboard-kpi-card dashboard-kpi-card-modern ${variant === 'primary' ? 'dashboard-kpi-primary' : ''}`}>
      <div className="dashboard-kpi-card-top">
        <span className="dashboard-kpi-icon" aria-hidden>
          {icon}
        </span>
        {trend ? <TrendBadge trend={trend} /> : null}
      </div>
      <span className="dashboard-kpi-label">{label}</span>
      <strong className="dashboard-kpi-value">{value}</strong>
      {subtitle ? <p className="dashboard-kpi-subtitle">{subtitle}</p> : null}
    </article>
  )
}

import type { ReactNode } from 'react'

export type KpiTrend = {
  direction: 'up' | 'down' | 'flat'
  percent: number
  /** Short label shown next to trend, e.g. "vs prior 30d" */
  label?: string
}

type DashboardKpiCardProps = {
  title: string
  value: ReactNode
  icon: ReactNode
  trend?: KpiTrend
  subtitle?: string
  variant?: 'default' | 'primary'
}

function TrendBadge({ trend }: { trend: KpiTrend }) {
  const arrow = trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'
  const sign = trend.direction === 'down' && trend.percent !== 0 ? '' : trend.percent > 0 ? '+' : ''
  const pct = trend.direction === 'flat' && trend.percent === 0 ? '0%' : `${sign}${trend.percent}%`
  const cls =
    trend.direction === 'up'
      ? 'dashboard-kpi-trend dashboard-kpi-trend--up'
      : trend.direction === 'down'
        ? 'dashboard-kpi-trend dashboard-kpi-trend--down'
        : 'dashboard-kpi-trend dashboard-kpi-trend--flat'

  return (
    <span className={cls} title={trend.label}>
      {arrow} {pct}
      {trend.label ? <span className="dashboard-kpi-trend-label">{trend.label}</span> : null}
    </span>
  )
}

export function DashboardKpiCard({ title, value, icon, trend, subtitle, variant = 'default' }: DashboardKpiCardProps) {
  const cls = variant === 'primary' ? 'dashboard-kpi-card dashboard-kpi-primary' : 'dashboard-kpi-card'

  return (
    <article className={cls}>
      <div className="dashboard-kpi-card-head">
        <span className="dashboard-kpi-icon" aria-hidden>
          {icon}
        </span>
        {trend ? <TrendBadge trend={trend} /> : null}
      </div>
      <span className="dashboard-kpi-title">{title}</span>
      <strong className="dashboard-kpi-value">{value}</strong>
      {subtitle ? <p>{subtitle}</p> : null}
    </article>
  )
}

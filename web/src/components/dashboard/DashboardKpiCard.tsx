import type { ReactNode } from 'react'

export type KpiTrend = {
  direction: 'up' | 'down' | 'flat'
  /** e.g. "+12%" or "0%" */
  label: string
}

function trendClass(t: KpiTrend) {
  if (t.direction === 'up') return 'dashboard-kpi-trend dashboard-kpi-trend--up'
  if (t.direction === 'down') return 'dashboard-kpi-trend dashboard-kpi-trend--down'
  return 'dashboard-kpi-trend dashboard-kpi-trend--flat'
}

export function DashboardKpiCard({
  icon,
  label,
  value,
  trend,
  footer,
  primary,
}: {
  icon: ReactNode
  label: string
  value: string | number
  trend: KpiTrend
  footer: string
  primary?: boolean
}) {
  const arrow = trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'
  return (
    <article className={`dashboard-kpi-card dashboard-kpi-card-modern${primary ? ' dashboard-kpi-primary' : ''}`}>
      <div className="dashboard-kpi-card-head">
        <span className="dashboard-kpi-icon" aria-hidden>
          {icon}
        </span>
        <span className="dashboard-kpi-label">{label}</span>
      </div>
      <strong className="dashboard-kpi-value">{value}</strong>
      <div className="dashboard-kpi-card-foot">
        <span className={trendClass(trend)} title="Compared to prior 30 days">
          {arrow} {trend.label}
        </span>
        <p className="dashboard-kpi-footnote">{footer}</p>
      </div>
    </article>
  )
}

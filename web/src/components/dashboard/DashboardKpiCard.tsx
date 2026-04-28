import type { ReactNode } from 'react'

export type KpiTrend = {
  direction: 'up' | 'down' | 'flat'
  /** e.g. "+12%" or "0%" */
  label: string
}

type DashboardKpiCardProps = {
  icon: ReactNode
  label: string
  value: string | number
  trend?: KpiTrend | null
  /** Short supporting line under the value */
  hint?: string
  primary?: boolean
}

export function DashboardKpiCard({ icon, label, value, trend, hint, primary }: DashboardKpiCardProps) {
  return (
    <article className={`dashboard-kpi-card${primary ? ' dashboard-kpi-primary' : ''}`}>
      <div className="dashboard-kpi-card-top">
        <span className="dashboard-kpi-icon" aria-hidden>
          {icon}
        </span>
        <span className="dashboard-kpi-label">{label}</span>
      </div>
      <strong className="dashboard-kpi-value">{value}</strong>
      <div className="dashboard-kpi-footer">
        {trend && (
          <span
            className={`dashboard-kpi-trend dashboard-kpi-trend--${trend.direction}`}
            title="Compared to prior 7 days"
          >
            {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'} {trend.label}
          </span>
        )}
        {hint ? <p className="dashboard-kpi-hint">{hint}</p> : null}
      </div>
    </article>
  )
}

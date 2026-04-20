import type { ReactNode } from 'react'

export type DashboardTrend = {
  direction: 'up' | 'down' | 'flat'
  /** e.g. "12%" or "New" */
  label: string
}

type Props = {
  label: string
  value: string | number
  hint?: string
  icon: ReactNode
  trend?: DashboardTrend | null
  primary?: boolean
}

export default function DashboardKpiCard({ label, value, hint, icon, trend, primary }: Props) {
  return (
    <article className={`dashboard-kpi-card dashboard-kpi-card-modern${primary ? ' dashboard-kpi-primary' : ''}`}>
      <div className="dashboard-kpi-card-top">
        <span className="dashboard-kpi-card-label">{label}</span>
        <span className="dashboard-kpi-card-icon" aria-hidden>
          {icon}
        </span>
      </div>
      <strong className="dashboard-kpi-card-value">{value}</strong>
      <div className="dashboard-kpi-card-bottom">
        {trend && (
          <span
            className={`dashboard-kpi-trend dashboard-kpi-trend--${trend.direction}`}
            title="Compared to the prior period"
          >
            {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'} {trend.label}
          </span>
        )}
        {hint ? <p className="dashboard-kpi-card-hint">{hint}</p> : null}
      </div>
    </article>
  )
}

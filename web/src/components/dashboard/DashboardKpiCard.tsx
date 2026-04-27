import type { ReactNode } from 'react'

export type TrendDirection = 'up' | 'down' | 'flat'

export type KpiTrend = {
  direction: TrendDirection
  label: string
}

type Props = {
  label: string
  value: ReactNode
  icon: ReactNode
  trend?: KpiTrend
  subtitle?: string
  primary?: boolean
}

export default function DashboardKpiCard({ label, value, icon, trend, subtitle, primary }: Props) {
  return (
    <article className={`dashboard-kpi-card dashboard-kpi-card--modern ${primary ? 'dashboard-kpi-primary' : ''}`}>
      <div className="dashboard-kpi-card-top">
        <div className="dashboard-kpi-icon" aria-hidden>
          {icon}
        </div>
        {trend ? (
          <div
            className={`dashboard-kpi-trend dashboard-kpi-trend--${trend.direction}`}
            title={trend.label}
          >
            {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'}{' '}
            {trend.label}
          </div>
        ) : null}
      </div>
      <div className="dashboard-kpi-label">{label}</div>
      <strong className="dashboard-kpi-value">{value}</strong>
      {subtitle ? <p className="dashboard-kpi-subtitle">{subtitle}</p> : null}
    </article>
  )
}

import type { ReactNode } from 'react'

export type SummaryKpiCardProps = {
  icon: ReactNode
  label: string
  value: string | number
  trend: { arrow: '↑' | '↓' | '→'; label: string; positive: boolean }
  subtitle?: string
  primary?: boolean
}

export function SummaryKpiCard({ icon, label, value, trend, subtitle, primary }: SummaryKpiCardProps) {
  return (
    <article className={`dashboard-kpi-card dashboard-kpi-card-v2 ${primary ? 'dashboard-kpi-primary' : ''}`}>
      <div className="dashboard-kpi-card-top">
        <span className="dashboard-kpi-icon" aria-hidden>
          {icon}
        </span>
        <span className="dashboard-kpi-label">{label}</span>
      </div>
      <strong className="dashboard-kpi-value">{value}</strong>
      <div className="dashboard-kpi-footer">
        <span
          className={`dashboard-kpi-trend ${trend.positive ? 'dashboard-kpi-trend-up' : 'dashboard-kpi-trend-down'}`}
          title="Compared to the prior 28 days"
        >
          <span className="dashboard-kpi-trend-arrow" aria-hidden>
            {trend.arrow}
          </span>
          {trend.label}
        </span>
        {subtitle ? <p className="dashboard-kpi-sub">{subtitle}</p> : null}
      </div>
    </article>
  )
}

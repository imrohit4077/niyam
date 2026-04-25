import type { ReactNode } from 'react'
import type { TrendParts } from './dashboardUtils'

type Props = {
  label: string
  value: string | number
  icon: ReactNode
  trend: TrendParts
  subtitle?: string
  primary?: boolean
  loading?: boolean
}

export function DashboardKpiCard({ label, value, icon, trend, subtitle, primary, loading }: Props) {
  if (loading) {
    return (
      <article className={`dashboard-kpi-card dashboard-kpi-card-skeleton ${primary ? 'dashboard-kpi-primary' : ''}`}>
        <span className="dashboard-kpi-skel-line dashboard-kpi-skel-w40" />
        <span className="dashboard-kpi-skel-line dashboard-kpi-skel-value" />
        <span className="dashboard-kpi-skel-line dashboard-kpi-skel-w70" />
      </article>
    )
  }

  const trendClass =
    trend.arrow === '—'
      ? 'dashboard-kpi-trend-neutral'
      : trend.positive
        ? 'dashboard-kpi-trend-up'
        : 'dashboard-kpi-trend-down'

  return (
    <article className={`dashboard-kpi-card ${primary ? 'dashboard-kpi-primary' : ''}`}>
      <div className="dashboard-kpi-card-top">
        <span className="dashboard-kpi-icon" aria-hidden>
          {icon}
        </span>
        <span className="dashboard-kpi-label">{label}</span>
      </div>
      <strong className="dashboard-kpi-value">{value}</strong>
      <div className="dashboard-kpi-footer">
        {subtitle ? <p>{subtitle}</p> : null}
        <span className={`dashboard-kpi-trend ${trendClass}`}>
          <span className="dashboard-kpi-trend-arrow" aria-hidden>
            {trend.arrow}
          </span>
          <span>{trend.pctLabel}</span>
          <span className="dashboard-kpi-trend-hint">vs prior 30d</span>
        </span>
      </div>
    </article>
  )
}

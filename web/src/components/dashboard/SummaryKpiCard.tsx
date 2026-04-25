import type { ReactNode } from 'react'
import type { TrendDirection } from '../../utils/dashboardTrends'

type SummaryKpiCardProps = {
  title: string
  value: string | number
  subtitle?: string
  icon: ReactNode
  trendLabel: string
  trendDirection: TrendDirection
  primary?: boolean
}

export function SummaryKpiCard({ title, value, subtitle, icon, trendLabel, trendDirection, primary }: SummaryKpiCardProps) {
  const trendClass =
    trendDirection === 'up'
      ? 'dashboard-kpi-trend--up'
      : trendDirection === 'down'
        ? 'dashboard-kpi-trend--down'
        : trendDirection === 'flat'
          ? 'dashboard-kpi-trend--flat'
          : 'dashboard-kpi-trend--neutral'

  return (
    <article className={`dashboard-kpi-card dashboard-kpi-card--rich ${primary ? 'dashboard-kpi-primary' : ''}`}>
      <div className="dashboard-kpi-card-top">
        <span className="dashboard-kpi-card-icon" aria-hidden>
          {icon}
        </span>
        <span className={`dashboard-kpi-trend ${trendClass}`}>{trendLabel}</span>
      </div>
      <span className="dashboard-kpi-card-title">{title}</span>
      <strong className="dashboard-kpi-card-value">{value}</strong>
      {subtitle ? <p className="dashboard-kpi-card-sub">{subtitle}</p> : null}
    </article>
  )
}

import type { ReactNode } from 'react'
import type { TrendDisplay } from './trendUtils'

type SummaryStatCardProps = {
  label: string
  value: number | string
  icon: ReactNode
  trend?: TrendDisplay
  sublabel?: string
  highlight?: boolean
}

export function SummaryStatCard({ label, value, icon, trend, sublabel, highlight }: SummaryStatCardProps) {
  return (
    <article className={`dashboard-kpi-card dashboard-kpi-stat ${highlight ? 'dashboard-kpi-primary' : ''}`}>
      <div className="dashboard-kpi-stat-top">
        <span className="dashboard-kpi-stat-icon" aria-hidden>
          {icon}
        </span>
        <span className="dashboard-kpi-stat-label">{label}</span>
      </div>
      <strong className="dashboard-kpi-stat-value">{value}</strong>
      {trend && (
        <p className={`dashboard-kpi-trend ${trend.favorable ? 'dashboard-kpi-trend-favorable' : 'dashboard-kpi-trend-neutral'}`}>
          <span className="dashboard-kpi-trend-arrow" aria-hidden>
            {trend.arrow}
          </span>
          <span>{trend.pctLabel}</span>
          <span className="dashboard-kpi-trend-vs">vs prior month</span>
        </p>
      )}
      {sublabel && <p className="dashboard-kpi-stat-sublabel">{sublabel}</p>}
    </article>
  )
}

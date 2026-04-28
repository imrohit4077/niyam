import type { ReactNode } from 'react'
import type { SummaryTrend } from './dashboardFormat'

export type { SummaryTrend }

type Props = {
  label: string
  value: string | number
  icon: ReactNode
  trend: SummaryTrend
  loading?: boolean
  primary?: boolean
}

export function DashboardSummaryCard({ label, value, icon, trend, loading, primary }: Props) {
  if (loading) {
    return (
      <article className={`dashboard-kpi-card dashboard-kpi-skeleton ${primary ? 'dashboard-kpi-primary' : ''}`}>
        <span className="dashboard-kpi-skeleton-line dashboard-kpi-skeleton-line--short" />
        <span className="dashboard-kpi-skeleton-line dashboard-kpi-skeleton-line--value" />
        <span className="dashboard-kpi-skeleton-line dashboard-kpi-skeleton-line--trend" />
      </article>
    )
  }

  return (
    <article className={`dashboard-kpi-card ${primary ? 'dashboard-kpi-primary' : ''}`}>
      <div className="dashboard-kpi-card-top">
        <span className="dashboard-kpi-label">{label}</span>
        <span className="dashboard-kpi-icon" aria-hidden>
          {icon}
        </span>
      </div>
      <strong className="dashboard-kpi-value">{value}</strong>
      <p className="dashboard-kpi-trend">
        <span className={`dashboard-kpi-trend-arrow dashboard-kpi-trend--${trend.tone}`}>
          {trend.arrow} {trend.pctLabel}
        </span>
        <span className="dashboard-kpi-trend-caption">{trend.caption}</span>
      </p>
    </article>
  )
}

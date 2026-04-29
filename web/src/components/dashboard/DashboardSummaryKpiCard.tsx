import type { ReactNode } from 'react'

export type TrendDirection = 'up' | 'down' | 'flat'

export interface DashboardSummaryKpiCardProps {
  label: string
  value: string | number
  subtitle?: string
  icon: ReactNode
  trend?: {
    direction: TrendDirection
    percent: number
    label: string
  }
  featured?: boolean
  loading?: boolean
}

export default function DashboardSummaryKpiCard({
  label,
  value,
  subtitle,
  icon,
  trend,
  featured,
  loading,
}: DashboardSummaryKpiCardProps) {
  if (loading) {
    return (
      <article className={`dashboard-kpi-card dashboard-kpi-card-v2 ${featured ? 'dashboard-kpi-primary' : ''}`}>
        <div className="dashboard-kpi-card-head">
          <span className="dashboard-kpi-icon-wrap dashboard-skeleton-icon" aria-hidden />
          <div className="dashboard-kpi-skeleton-label dashboard-skeleton" />
        </div>
        <div className="dashboard-kpi-skeleton-value dashboard-skeleton" />
        <div className="dashboard-kpi-skeleton-sub dashboard-skeleton" />
      </article>
    )
  }

  const trendClass =
    trend?.direction === 'up'
      ? 'dashboard-kpi-trend--up'
      : trend?.direction === 'down'
        ? 'dashboard-kpi-trend--down'
        : 'dashboard-kpi-trend--flat'

  const arrow = trend?.direction === 'up' ? '↑' : trend?.direction === 'down' ? '↓' : '→'

  return (
    <article className={`dashboard-kpi-card dashboard-kpi-card-v2 ${featured ? 'dashboard-kpi-primary' : ''}`}>
      <div className="dashboard-kpi-card-head">
        <span className="dashboard-kpi-icon-wrap" aria-hidden>
          {icon}
        </span>
        <span className="dashboard-kpi-label">{label}</span>
      </div>
      <strong className="dashboard-kpi-value">{value}</strong>
      <div className="dashboard-kpi-footer">
        {trend && trend.percent > 0 && (
          <span className={`dashboard-kpi-trend ${trendClass}`} title={trend.label}>
            <span className="dashboard-kpi-trend-arrow" aria-hidden>
              {arrow}
            </span>
            <span className="dashboard-kpi-trend-pct">{trend.percent}%</span>
          </span>
        )}
        {trend && trend.percent === 0 && trend.direction === 'flat' && (
          <span className="dashboard-kpi-trend dashboard-kpi-trend--flat" title={trend.label}>
            —
          </span>
        )}
        {subtitle && <p className="dashboard-kpi-subtitle">{subtitle}</p>}
      </div>
    </article>
  )
}

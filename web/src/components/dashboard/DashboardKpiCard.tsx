import type { ReactNode } from 'react'

export type DashboardKpiTrend = {
  direction: 'up' | 'down' | 'flat'
  label: string
}

type Props = {
  icon: ReactNode
  label: string
  value: string | number
  trend?: DashboardKpiTrend | null
  subtitle?: string
  variant?: 'primary' | 'default'
}

export function DashboardKpiCard({ icon, label, value, trend, subtitle, variant = 'default' }: Props) {
  const trendClass =
    trend?.direction === 'up'
      ? 'dashboard-kpi-trend--up'
      : trend?.direction === 'down'
        ? 'dashboard-kpi-trend--down'
        : 'dashboard-kpi-trend--flat'

  return (
    <article className={`dashboard-kpi-card dashboard-kpi-card-rich ${variant === 'primary' ? 'dashboard-kpi-primary' : ''}`}>
      <div className="dashboard-kpi-card-top">
        <span className="dashboard-kpi-icon" aria-hidden>
          {icon}
        </span>
        <span className="dashboard-kpi-label">{label}</span>
      </div>
      <strong className="dashboard-kpi-value">{value}</strong>
      {trend && (
        <span className={`dashboard-kpi-trend ${trendClass}`} title={trend.label}>
          {trend.label}
        </span>
      )}
      {subtitle ? <p className="dashboard-kpi-subtitle">{subtitle}</p> : null}
    </article>
  )
}

export function DashboardKpiCardSkeleton() {
  return (
    <div className="dashboard-kpi-card dashboard-kpi-card-rich dashboard-kpi-skeleton" aria-hidden>
      <div className="dashboard-kpi-skeleton-icon" />
      <div className="dashboard-kpi-skeleton-line dashboard-kpi-skeleton-line--sm" />
      <div className="dashboard-kpi-skeleton-line dashboard-kpi-skeleton-line--lg" />
      <div className="dashboard-kpi-skeleton-line dashboard-kpi-skeleton-line--md" />
    </div>
  )
}

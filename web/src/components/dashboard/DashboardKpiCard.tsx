import type { ReactNode } from 'react'

export type KpiTrend = {
  direction: 'up' | 'down' | 'flat'
  percent: number
}

type Props = {
  label: string
  value: string | number
  icon: ReactNode
  trend?: KpiTrend | null
  trendLabel?: string
  variant?: 'default' | 'primary'
}

export function DashboardKpiCard({ label, value, icon, trend, trendLabel, variant = 'default' }: Props) {
  const arrow = trend?.direction === 'up' ? '↑' : trend?.direction === 'down' ? '↓' : '→'
  const trendClass =
    trend?.direction === 'up'
      ? 'dashboard-kpi-trend--up'
      : trend?.direction === 'down'
        ? 'dashboard-kpi-trend--down'
        : 'dashboard-kpi-trend--flat'

  return (
    <article className={`dashboard-kpi-card dashboard-kpi-card-modern ${variant === 'primary' ? 'dashboard-kpi-primary' : ''}`}>
      <div className="dashboard-kpi-card-top">
        <span className="dashboard-kpi-icon" aria-hidden>
          {icon}
        </span>
        <span className="dashboard-kpi-label">{label}</span>
      </div>
      <strong className="dashboard-kpi-value">{value}</strong>
      {trend != null && (
        <p className={`dashboard-kpi-trend ${trendClass}`}>
          <span className="dashboard-kpi-trend-arrow" aria-hidden>
            {arrow}
          </span>
          <span>
            {trend.percent}%
            {trendLabel ? ` ${trendLabel}` : ' vs prior period'}
          </span>
        </p>
      )}
    </article>
  )
}

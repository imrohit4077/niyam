import type { ReactNode } from 'react'
import type { TrendDirection } from './dashboardUtils'

type Props = {
  icon: ReactNode
  label: string
  value: string | number
  hint?: string
  trend: { direction: TrendDirection; label: string }
  trendTitle?: string
  variant?: 'primary' | 'default'
}

export function DashboardSummaryCard({ icon, label, value, hint, trend, trendTitle, variant = 'default' }: Props) {
  const arrow = trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'
  const trendClass =
    trend.direction === 'up'
      ? 'dashboard-summary-trend--up'
      : trend.direction === 'down'
        ? 'dashboard-summary-trend--down'
        : 'dashboard-summary-trend--flat'

  return (
    <article className={`dashboard-summary-card ${variant === 'primary' ? 'dashboard-summary-card--primary' : ''}`}>
      <div className="dashboard-summary-card-top">
        <div className="dashboard-summary-icon" aria-hidden>
          {icon}
        </div>
        <span className={`dashboard-summary-trend ${trendClass}`} title={trendTitle ?? 'vs prior month'}>
          <span className="dashboard-summary-trend-arrow">{arrow}</span>
          <span>{trend.label}</span>
        </span>
      </div>
      <span className="dashboard-summary-label">{label}</span>
      <strong className="dashboard-summary-value">{value}</strong>
      {hint ? <p className="dashboard-summary-hint">{hint}</p> : null}
    </article>
  )
}

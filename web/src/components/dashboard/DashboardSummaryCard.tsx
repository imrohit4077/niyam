import type { ReactNode } from 'react'
import type { TrendDirection } from './dashboardPeriodStats'

export type { TrendDirection } from './dashboardPeriodStats'

export type DashboardSummaryCardProps = {
  label: string
  value: string | number
  icon: ReactNode
  trend?: {
    direction: TrendDirection
    label: string
  }
  primary?: boolean
}

export function DashboardSummaryCard({ label, value, icon, trend, primary }: DashboardSummaryCardProps) {
  return (
    <article className={`dashboard-summary-card${primary ? ' dashboard-summary-card--primary' : ''}`}>
      <div className="dashboard-summary-card__top">
        <span className="dashboard-summary-card__icon" aria-hidden>
          {icon}
        </span>
        {trend && (
          <span
            className={`dashboard-summary-card__trend dashboard-summary-card__trend--${trend.direction}`}
            title={trend.label}
          >
            {trend.direction === 'up' && '↑'}
            {trend.direction === 'down' && '↓'}
            {trend.direction === 'flat' && '→'}
            <span className="dashboard-summary-card__trend-text">{trend.label}</span>
          </span>
        )}
      </div>
      <span className="dashboard-summary-card__label">{label}</span>
      <strong className="dashboard-summary-card__value">{value}</strong>
    </article>
  )
}

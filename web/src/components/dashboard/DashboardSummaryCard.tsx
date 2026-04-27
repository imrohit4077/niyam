import type { ReactNode } from 'react'
import type { TrendDirection } from './dashboardSummaryUtils'

type Props = {
  icon: ReactNode
  label: string
  value: string | number
  trend: { direction: TrendDirection; label: string }
  hint?: string
  highlight?: boolean
}

export function DashboardSummaryCard({ icon, label, value, trend, hint, highlight }: Props) {
  return (
    <article className={`dashboard-summary-card${highlight ? ' dashboard-summary-card--primary' : ''}`}>
      <div className="dashboard-summary-card__top">
        <span className="dashboard-summary-card__icon" aria-hidden>
          {icon}
        </span>
        <span
          className={`dashboard-summary-card__trend dashboard-summary-card__trend--${trend.direction}`}
          title="vs prior month"
        >
          {trend.label}
        </span>
      </div>
      <span className="dashboard-summary-card__label">{label}</span>
      <strong className="dashboard-summary-card__value">{value}</strong>
      {hint ? <p className="dashboard-summary-card__hint">{hint}</p> : null}
    </article>
  )
}

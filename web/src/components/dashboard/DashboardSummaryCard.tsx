import type { ReactNode } from 'react'

export type SummaryTrend = {
  arrow: string
  pctLabel: string
  direction: 'up' | 'down' | 'flat'
  sublabel: string
}

type Props = {
  label: string
  value: string | number
  icon: ReactNode
  trend?: SummaryTrend | null
  hint?: string
  primary?: boolean
}

export function DashboardSummaryCard({ label, value, icon, trend, hint, primary }: Props) {
  return (
    <article className={`dashboard-summary-card${primary ? ' dashboard-summary-card--primary' : ''}`}>
      <div className="dashboard-summary-card__top">
        <span className="dashboard-summary-card__icon" aria-hidden>
          {icon}
        </span>
        {trend && (
          <span
            className={`dashboard-summary-card__trend dashboard-summary-card__trend--${trend.direction}`}
            title={`${trend.arrow} ${trend.pctLabel} ${trend.sublabel}`}
          >
            <span className="dashboard-summary-card__trend-arrow">{trend.arrow}</span>
            <span className="dashboard-summary-card__trend-pct">{trend.pctLabel}</span>
          </span>
        )}
      </div>
      <span className="dashboard-summary-card__label">{label}</span>
      <strong className="dashboard-summary-card__value">{value}</strong>
      {hint ? <p className="dashboard-summary-card__hint">{hint}</p> : null}
    </article>
  )
}

import type { ReactNode } from 'react'

export type DashboardTrend = {
  direction: 'up' | 'down' | 'flat'
  label: string
}

type Props = {
  label: string
  value: string | number
  icon: ReactNode
  trend?: DashboardTrend | null
  hint?: string
  primary?: boolean
  loading?: boolean
}

export function DashboardSummaryCard({ label, value, icon, trend, hint, primary, loading }: Props) {
  return (
    <article className={`dashboard-summary-card${primary ? ' dashboard-summary-card--primary' : ''}`}>
      <div className="dashboard-summary-card__top">
        <span className="dashboard-summary-card__icon" aria-hidden>
          {icon}
        </span>
        {trend && !loading ? (
          <span
            className={`dashboard-summary-card__trend dashboard-summary-card__trend--${trend.direction}`}
            title={trend.label}
          >
            {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'} {trend.label}
          </span>
        ) : null}
      </div>
      <span className="dashboard-summary-card__label">{label}</span>
      {loading ? (
        <span className="dashboard-summary-card__value dashboard-summary-card__skeleton-line dashboard-summary-card__skeleton-line--lg" />
      ) : (
        <strong className="dashboard-summary-card__value">{value}</strong>
      )}
      {hint && !loading ? <p className="dashboard-summary-card__hint">{hint}</p> : null}
    </article>
  )
}

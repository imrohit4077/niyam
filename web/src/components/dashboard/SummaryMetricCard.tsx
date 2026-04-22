import type { ReactNode } from 'react'

export type SummaryTrend = {
  arrow: '↑' | '↓' | '→'
  label: string
  positive?: boolean
}

type Props = {
  label: string
  value: string | number
  hint?: string
  trend?: SummaryTrend | null
  icon: ReactNode
  variant?: 'default' | 'primary'
  loading?: boolean
}

export function SummaryMetricCard({ label, value, hint, trend, icon, variant = 'default', loading }: Props) {
  const primary = variant === 'primary'
  return (
    <article className={`dashboard-summary-card ${primary ? 'dashboard-summary-card--primary' : ''}`}>
      <div className="dashboard-summary-card__top">
        <span className={`dashboard-summary-card__icon ${primary ? 'dashboard-summary-card__icon--primary' : ''}`} aria-hidden>
          {icon}
        </span>
        {trend && !loading ? (
          <span
            className={`dashboard-summary-trend ${
              trend.positive === true
                ? 'dashboard-summary-trend--up'
                : trend.positive === false
                  ? 'dashboard-summary-trend--down'
                  : 'dashboard-summary-trend--flat'
            }`}
            title="Compared to prior 14 days"
          >
            <span className="dashboard-summary-trend__arrow">{trend.arrow}</span>
            <span className="dashboard-summary-trend__label">{trend.label}</span>
          </span>
        ) : null}
      </div>
      <span className="dashboard-summary-card__label">{label}</span>
      {loading ? (
        <div className="dashboard-summary-card__skeleton-value" aria-hidden />
      ) : (
        <strong className="dashboard-summary-card__value">{value}</strong>
      )}
      {hint && !loading ? <p className="dashboard-summary-card__hint">{hint}</p> : null}
    </article>
  )
}

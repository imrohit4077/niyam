import type { ReactNode } from 'react'

type Props = {
  label: string
  value: string | number
  icon: ReactNode
  trend: { arrow: '↑' | '↓' | '—'; label: string; positive: boolean }
  trendCaption?: string
  primary?: boolean
  loading?: boolean
}

export function DashboardSummaryCard({ label, value, icon, trend, trendCaption, primary, loading }: Props) {
  if (loading) {
    return (
      <article className={`dashboard-summary-card ${primary ? 'dashboard-summary-card--primary' : ''}`}>
        <div className="dashboard-summary-card__top">
          <span className="dashboard-summary-card__icon skeleton-block" aria-hidden />
          <span className="dashboard-summary-card__trend skeleton-block skeleton-block--short" aria-hidden />
        </div>
        <span className="dashboard-summary-card__label skeleton-block skeleton-block--label" aria-hidden />
        <strong className="dashboard-summary-card__value skeleton-block skeleton-block--value" aria-hidden />
      </article>
    )
  }

  const trendClass =
    trend.arrow === '—'
      ? 'dashboard-summary-card__trend--neutral'
      : trend.positive
        ? 'dashboard-summary-card__trend--up'
        : 'dashboard-summary-card__trend--down'

  return (
    <article className={`dashboard-summary-card ${primary ? 'dashboard-summary-card--primary' : ''}`}>
      <div className="dashboard-summary-card__top">
        <span className="dashboard-summary-card__icon" aria-hidden>
          {icon}
        </span>
        <span className={`dashboard-summary-card__trend ${trendClass}`} title={trendCaption}>
          <span className="dashboard-summary-card__trend-arrow">{trend.arrow}</span>
          <span className="dashboard-summary-card__trend-pct">{trend.label}</span>
        </span>
      </div>
      <span className="dashboard-summary-card__label">{label}</span>
      <strong className="dashboard-summary-card__value">{value}</strong>
      {trendCaption ? <p className="dashboard-summary-card__caption">{trendCaption}</p> : null}
    </article>
  )
}

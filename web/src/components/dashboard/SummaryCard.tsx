import type { ReactNode } from 'react'

export type SummaryTrend = {
  direction: 'up' | 'down' | 'flat'
  label: string
}

type SummaryCardProps = {
  icon?: ReactNode
  label?: string
  value?: string | number
  trend?: SummaryTrend | null
  primary?: boolean
  loading?: boolean
}

export function SummaryCard({ icon, label, value, trend, primary, loading }: SummaryCardProps) {
  if (loading) {
    return (
      <article className={`dashboard-summary-card ${primary ? 'dashboard-summary-card--primary' : ''} dashboard-summary-card--skeleton`}>
        <div className="dashboard-summary-card__top">
          <span className="dashboard-summary-card__icon-skel" aria-hidden />
          <span className="dashboard-summary-card__label-skel" />
        </div>
        <span className="dashboard-summary-card__value-skel" />
        <span className="dashboard-summary-card__trend-skel" />
      </article>
    )
  }

  const trendClass =
    trend?.direction === 'up'
      ? 'dashboard-trend--up'
      : trend?.direction === 'down'
        ? 'dashboard-trend--down'
        : 'dashboard-trend--flat'

  return (
    <article className={`dashboard-summary-card ${primary ? 'dashboard-summary-card--primary' : ''}`}>
      <div className="dashboard-summary-card__top">
        <span className="dashboard-summary-card__icon" aria-hidden>
          {icon}
        </span>
        <span className="dashboard-summary-card__label">{label}</span>
      </div>
      <strong className="dashboard-summary-card__value">{value}</strong>
      {trend ? (
        <p className={`dashboard-summary-card__trend ${trendClass}`} title="Compared to prior period">
          {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'} {trend.label}
        </p>
      ) : (
        <p className="dashboard-summary-card__trend dashboard-trend--flat">—</p>
      )}
    </article>
  )
}

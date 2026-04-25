import type { ReactNode } from 'react'

export type DashboardSummaryCardProps = {
  label: string
  value: string | number
  /** Short context under the value (not the trend). */
  hint?: string
  icon: ReactNode
  trend: { direction: 'up' | 'down' | 'flat'; label: string }
  /** Screen reader / tooltip for what the trend measures */
  trendDescription?: string
  variant?: 'default' | 'primary'
  loading?: boolean
}

export default function DashboardSummaryCard({
  label,
  value,
  hint,
  icon,
  trend,
  trendDescription,
  variant = 'default',
  loading,
}: DashboardSummaryCardProps) {
  const trendClass =
    trend.direction === 'up'
      ? 'dashboard-summary-trend--up'
      : trend.direction === 'down'
        ? 'dashboard-summary-trend--down'
        : 'dashboard-summary-trend--flat'

  if (loading) {
    return (
      <article className={`dashboard-summary-card dashboard-summary-card--skeleton ${variant === 'primary' ? 'dashboard-summary-card--primary' : ''}`}>
        <div className="dashboard-summary-card__top">
          <span className="dashboard-summary-skeleton dashboard-summary-skeleton--icon" />
          <span className="dashboard-summary-skeleton dashboard-summary-skeleton--trend" />
        </div>
        <span className="dashboard-summary-skeleton dashboard-summary-skeleton--label" />
        <span className="dashboard-summary-skeleton dashboard-summary-skeleton--value" />
        <span className="dashboard-summary-skeleton dashboard-summary-skeleton--hint" />
      </article>
    )
  }

  const arrow = trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : ''

  return (
    <article className={`dashboard-summary-card ${variant === 'primary' ? 'dashboard-summary-card--primary' : ''}`}>
      <div className="dashboard-summary-card__top">
        <span className="dashboard-summary-card__icon" aria-hidden>
          {icon}
        </span>
        <span className={`dashboard-summary-trend ${trendClass}`} title={trendDescription}>
          {arrow && <span className="dashboard-summary-trend__arrow">{arrow}</span>}
          <span>{trend.label}</span>
        </span>
      </div>
      <span className="dashboard-summary-card__label">{label}</span>
      <strong className="dashboard-summary-card__value">{value}</strong>
      {hint ? <p className="dashboard-summary-card__hint">{hint}</p> : null}
    </article>
  )
}

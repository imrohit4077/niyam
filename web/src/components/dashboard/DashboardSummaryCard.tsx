import type { ReactNode } from 'react'

type TrendDirection = 'up' | 'down' | 'flat'

export function DashboardSummaryCard({
  icon,
  label,
  value,
  trendLabel,
  trendDirection,
  sublabel,
  primary,
}: {
  icon: ReactNode
  label: string
  value: string | number
  trendLabel: string
  trendDirection: TrendDirection
  sublabel?: string
  primary?: boolean
}) {
  const arrow = trendDirection === 'up' ? '↑' : trendDirection === 'down' ? '↓' : '→'
  return (
    <article className={`dashboard-summary-card${primary ? ' dashboard-summary-card--primary' : ''}`}>
      <div className="dashboard-summary-card__top">
        <span className="dashboard-summary-card__icon" aria-hidden>
          {icon}
        </span>
        <span className="dashboard-summary-card__label">{label}</span>
      </div>
      <strong className="dashboard-summary-card__value">{value}</strong>
      <div className={`dashboard-summary-card__trend dashboard-summary-card__trend--${trendDirection}`}>
        <span className="dashboard-summary-card__trend-arrow" aria-hidden>
          {arrow}
        </span>
        <span>{trendLabel}</span>
      </div>
      {sublabel ? <p className="dashboard-summary-card__sub">{sublabel}</p> : null}
    </article>
  )
}

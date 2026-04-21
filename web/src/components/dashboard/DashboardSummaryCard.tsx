import type { ReactNode } from 'react'
import type { TrendDirection } from './dashboardUtils'

const BRAND = '#0ea5e9'

type Props = {
  title: string
  value: string | number
  icon: ReactNode
  trendDirection: TrendDirection
  trendLabel: string
  trendHint?: string
  primary?: boolean
  loading?: boolean
}

function TrendIcon({ direction }: { direction: TrendDirection }) {
  if (direction === 'up') return <span aria-hidden>↑</span>
  if (direction === 'down') return <span aria-hidden>↓</span>
  return <span aria-hidden>→</span>
}

export function DashboardSummaryCard({
  title,
  value,
  icon,
  trendDirection,
  trendLabel,
  trendHint = 'vs prior 30 days',
  primary,
  loading,
}: Props) {
  return (
    <article className={`dashboard-summary-card ${primary ? 'dashboard-summary-card--primary' : ''}`}>
      {loading ? (
        <>
          <div className="dashboard-summary-card__top">
            <span className="dashboard-skeleton dashboard-skeleton--icon" />
            <span className="dashboard-skeleton dashboard-skeleton--line-sm" />
          </div>
          <div className="dashboard-skeleton dashboard-skeleton--value" />
          <div className="dashboard-skeleton dashboard-skeleton--line" />
        </>
      ) : (
        <>
          <div className="dashboard-summary-card__top">
            <span className="dashboard-summary-card__icon" style={{ color: primary ? 'rgba(255,255,255,0.95)' : BRAND }}>
              {icon}
            </span>
            <span
              className={`dashboard-summary-card__trend dashboard-summary-card__trend--${trendDirection}`}
              title={trendHint}
            >
              <TrendIcon direction={trendDirection} /> {trendLabel}
            </span>
          </div>
          <strong className="dashboard-summary-card__value">{value}</strong>
          <span className="dashboard-summary-card__title">{title}</span>
          <span className="dashboard-summary-card__hint">{trendHint}</span>
        </>
      )}
    </article>
  )
}

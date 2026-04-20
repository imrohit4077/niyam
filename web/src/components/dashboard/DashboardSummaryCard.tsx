import type { ReactNode } from 'react'
import type { TrendDirection } from './dashboardUtils'

type Props = {
  label: string
  value: string | number
  icon: ReactNode
  trendLabel: string
  trendDirection: TrendDirection
  caption?: string
  highlight?: boolean
}

function TrendGlyph({ direction }: { direction: TrendDirection }) {
  if (direction === 'up') return <span aria-hidden>↑</span>
  if (direction === 'down') return <span aria-hidden>↓</span>
  return <span aria-hidden>→</span>
}

export function DashboardSummaryCard({ label, value, icon, trendLabel, trendDirection, caption, highlight }: Props) {
  return (
    <article className={`dashboard-summary-card${highlight ? ' dashboard-summary-card--primary' : ''}`}>
      <div className="dashboard-summary-card-top">
        <div className="dashboard-summary-card-icon" aria-hidden>
          {icon}
        </div>
        <span
          className={`dashboard-summary-trend dashboard-summary-trend--${trendDirection}`}
          title="Compared to the prior 30-day period"
        >
          <TrendGlyph direction={trendDirection} /> {trendLabel}
        </span>
      </div>
      <span className="dashboard-summary-label">{label}</span>
      <strong className="dashboard-summary-value">{value}</strong>
      {caption ? <p className="dashboard-summary-caption">{caption}</p> : null}
    </article>
  )
}

export function DashboardSummaryCardSkeleton() {
  return (
    <div className="dashboard-summary-card dashboard-summary-card--skeleton">
      <div className="dashboard-skeleton dashboard-skeleton-icon" />
      <div className="dashboard-skeleton dashboard-skeleton-line dashboard-skeleton-line--short" />
      <div className="dashboard-skeleton dashboard-skeleton-line dashboard-skeleton-line--value" />
      <div className="dashboard-skeleton dashboard-skeleton-line dashboard-skeleton-line--caption" />
    </div>
  )
}

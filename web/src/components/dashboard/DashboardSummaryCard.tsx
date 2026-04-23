import type { ReactNode } from 'react'
import type { TrendDirection } from './dashboardMetrics'

type Props = {
  label: string
  value: string | number
  hint?: string
  trendDirection: TrendDirection
  trendLabel: string
  trendSubtitle?: string
  icon: ReactNode
  variant?: 'default' | 'primary'
  loading?: boolean
}

function TrendChevron({ direction }: { direction: TrendDirection }) {
  if (direction === 'flat') {
    return (
      <span className="dashboard-summary-trend-icon dashboard-summary-trend-icon--flat" aria-hidden>
        —
      </span>
    )
  }
  return (
    <span
      className={`dashboard-summary-trend-icon dashboard-summary-trend-icon--${direction}`}
      aria-hidden
    >
      {direction === 'up' ? '↑' : '↓'}
    </span>
  )
}

export default function DashboardSummaryCard({
  label,
  value,
  hint,
  trendDirection,
  trendLabel,
  trendSubtitle,
  icon,
  variant = 'default',
  loading,
}: Props) {
  return (
    <article className={`dashboard-summary-card${variant === 'primary' ? ' dashboard-summary-card--primary' : ''}`}>
      {loading ? (
        <div className="dashboard-summary-skeleton" aria-hidden>
          <span className="dashboard-summary-skeleton-icon" />
          <span className="dashboard-summary-skeleton-line dashboard-summary-skeleton-line--short" />
          <span className="dashboard-summary-skeleton-line dashboard-summary-skeleton-line--value" />
          <span className="dashboard-summary-skeleton-line dashboard-summary-skeleton-line--mid" />
        </div>
      ) : (
        <>
          <div className="dashboard-summary-card-top">
            <div className="dashboard-summary-icon-wrap" aria-hidden>
              {icon}
            </div>
            <div className="dashboard-summary-trend" title={trendSubtitle}>
              <TrendChevron direction={trendDirection} />
              <span className="dashboard-summary-trend-pct">{trendLabel}</span>
            </div>
          </div>
          <span className="dashboard-summary-label">{label}</span>
          <strong className="dashboard-summary-value">{value}</strong>
          {hint ? <p className="dashboard-summary-hint">{hint}</p> : null}
          {trendSubtitle ? <p className="dashboard-summary-trend-caption">{trendSubtitle}</p> : null}
        </>
      )}
    </article>
  )
}

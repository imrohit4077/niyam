import type { ReactNode } from 'react'
import type { TrendResult } from './dashboardUtils'
import { formatTrendLabel } from './dashboardUtils'

type Props = {
  label: string
  value: string | number
  trend: TrendResult
  /** Shown under the trend when not loading */
  hint?: string
  icon: ReactNode
  loading?: boolean
  primary?: boolean
}

export function SummaryStatCard({ label, value, trend, hint, icon, loading, primary }: Props) {
  const trendClass =
    trend.direction === 'up' ? 'dashboard-summary-trend--up' : trend.direction === 'down' ? 'dashboard-summary-trend--down' : 'dashboard-summary-trend--flat'
  const arrow = trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : ''

  return (
    <article className={`dashboard-summary-card${primary ? ' dashboard-summary-card--primary' : ''}`}>
      <div className="dashboard-summary-card-top">
        <span className="dashboard-summary-icon" aria-hidden>
          {icon}
        </span>
        <span className="dashboard-summary-label">{label}</span>
      </div>
      {loading ? (
        <div className="dashboard-summary-skeleton">
          <span className="dashboard-skeleton-line dashboard-skeleton-line--lg" />
          <span className="dashboard-skeleton-line dashboard-skeleton-line--sm" />
        </div>
      ) : (
        <>
          <strong className="dashboard-summary-value">{value}</strong>
          <div className="dashboard-summary-footer">
            <span className={`dashboard-summary-trend ${trendClass}`} title="vs prior 30 days">
              {arrow} {formatTrendLabel(trend)}
            </span>
            {hint ? <span className="dashboard-summary-hint">{hint}</span> : null}
          </div>
        </>
      )}
    </article>
  )
}

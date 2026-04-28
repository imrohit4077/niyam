import type { ReactNode } from 'react'
import { TrendIndicator } from './TrendIndicator'

type SummaryStatCardProps = {
  label: string
  value: string | number
  icon: ReactNode
  /** Current-period count for trend vs previous period. */
  trendCurrent?: number
  trendPrevious?: number
  trendInvert?: boolean
  footnote?: string
  loading?: boolean
  primary?: boolean
}

export function SummaryStatCard({
  label,
  value,
  icon,
  trendCurrent,
  trendPrevious,
  trendInvert,
  footnote,
  loading,
  primary,
}: SummaryStatCardProps) {
  const showTrend = trendCurrent != null && trendPrevious != null

  if (loading) {
    return (
      <article className={`dashboard-summary-card ${primary ? 'dashboard-summary-card-primary' : ''} dashboard-summary-card-skeleton`}>
        <div className="dashboard-summary-card-top">
          <span className="dashboard-summary-skeleton-icon" />
          <span className="dashboard-summary-skeleton-trend" />
        </div>
        <span className="dashboard-summary-skeleton-label" />
        <span className="dashboard-summary-skeleton-value" />
        <span className="dashboard-summary-skeleton-foot" />
      </article>
    )
  }

  return (
    <article className={`dashboard-summary-card ${primary ? 'dashboard-summary-card-primary' : ''}`}>
      <div className="dashboard-summary-card-top">
        <span className="dashboard-summary-icon" aria-hidden>
          {icon}
        </span>
        {showTrend ? (
          <TrendIndicator current={trendCurrent} previous={trendPrevious} invert={trendInvert} />
        ) : null}
      </div>
      <span className="dashboard-summary-label">{label}</span>
      <strong className="dashboard-summary-value">{value}</strong>
      {footnote ? <p className="dashboard-summary-foot">{footnote}</p> : null}
    </article>
  )
}

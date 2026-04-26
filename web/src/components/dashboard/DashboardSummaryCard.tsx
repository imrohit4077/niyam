import type { ReactNode } from 'react'
import type { TrendResult } from './dashboardFormat'

export type TrendSentiment = 'positive_up' | 'neutral'

type Props = {
  label: string
  value: ReactNode
  icon: ReactNode
  trend: TrendResult
  /** How to color up/down vs prior period */
  trendSentiment?: TrendSentiment
  subtitle?: string
  highlight?: boolean
  loading?: boolean
}

function TrendBadge({ trend, trendSentiment }: { trend: TrendResult; trendSentiment: TrendSentiment }) {
  const { direction, label } = trend
  const arrow = direction === 'up' ? '↑' : direction === 'down' ? '↓' : '→'
  let cls = 'dashboard-summary-trend dashboard-summary-trend-neutral'
  if (trendSentiment === 'neutral' || direction === 'flat') {
    cls = 'dashboard-summary-trend dashboard-summary-trend-neutral'
  } else if (direction === 'up') {
    cls = 'dashboard-summary-trend dashboard-summary-trend-up'
  } else if (direction === 'down') {
    cls = 'dashboard-summary-trend dashboard-summary-trend-down'
  } else {
    cls = 'dashboard-summary-trend dashboard-summary-trend-neutral'
  }
  return (
    <span className={cls} title="vs prior 30 days">
      <span className="dashboard-summary-trend-arrow" aria-hidden>
        {arrow}
      </span>
      {label}
    </span>
  )
}

export function DashboardSummaryCard({
  label,
  value,
  icon,
  trend,
  trendSentiment = 'positive_up',
  subtitle,
  highlight,
  loading,
}: Props) {
  return (
    <article className={`dashboard-summary-card ${highlight ? 'dashboard-summary-card-primary' : ''}`}>
      <div className="dashboard-summary-card-top">
        <span className="dashboard-summary-icon" aria-hidden>
          {icon}
        </span>
        {!loading && <TrendBadge trend={trend} trendSentiment={trendSentiment} />}
        {loading && <span className="dashboard-summary-trend-skeleton" />}
      </div>
      <span className="dashboard-summary-label">{label}</span>
      {loading ? (
        <div className="dashboard-summary-value-skeleton" />
      ) : (
        <strong className="dashboard-summary-value">{value}</strong>
      )}
      {subtitle && !loading && <p className="dashboard-summary-sub">{subtitle}</p>}
    </article>
  )
}

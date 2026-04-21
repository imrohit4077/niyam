import type { ReactNode } from 'react'
import type { TrendDirection } from './trendUtils'

type DashboardSummaryCardProps = {
  label: string
  value: string | number
  icon: ReactNode
  trendLabel: string
  trendDirection: TrendDirection
  subline?: string
  loading?: boolean
  highlight?: boolean
}

export default function DashboardSummaryCard({
  label,
  value,
  icon,
  trendLabel,
  trendDirection,
  subline,
  loading,
  highlight,
}: DashboardSummaryCardProps) {
  if (loading) {
    return (
      <article className={`dashboard-summary-card dashboard-summary-card-skeleton ${highlight ? 'dashboard-summary-card-highlight' : ''}`}>
        <div className="dashboard-summary-card-top">
          <span className="dashboard-summary-skel dashboard-summary-skel-icon" />
          <span className="dashboard-summary-skel dashboard-summary-skel-trend" />
        </div>
        <span className="dashboard-summary-skel dashboard-summary-skel-label" />
        <span className="dashboard-summary-skel dashboard-summary-skel-value" />
        <span className="dashboard-summary-skel dashboard-summary-skel-sub" />
      </article>
    )
  }

  const trendClass =
    trendDirection === 'up'
      ? 'dashboard-trend-up'
      : trendDirection === 'down'
        ? 'dashboard-trend-down'
        : trendDirection === 'flat'
          ? 'dashboard-trend-flat'
          : 'dashboard-trend-neutral'

  return (
    <article className={`dashboard-summary-card ${highlight ? 'dashboard-summary-card-highlight' : ''}`}>
      <div className="dashboard-summary-card-top">
        <div className="dashboard-summary-icon" aria-hidden>
          {icon}
        </div>
        <span className={`dashboard-summary-trend ${trendClass}`} title="vs prior month">
          {trendDirection === 'up' && '↑ '}
          {trendDirection === 'down' && '↓ '}
          {trendDirection === 'flat' && '→ '}
          {trendLabel}
        </span>
      </div>
      <span className="dashboard-summary-label">{label}</span>
      <strong className="dashboard-summary-value">{value}</strong>
      {subline ? <p className="dashboard-summary-sub">{subline}</p> : null}
    </article>
  )
}

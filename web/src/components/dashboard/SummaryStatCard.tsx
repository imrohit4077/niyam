import type { ReactNode } from 'react'

export type TrendDirection = 'up' | 'down' | 'flat'

type SummaryStatCardProps = {
  label: string
  value: string | number
  icon: ReactNode
  trendDirection: TrendDirection
  trendPct: number
  trendLabel?: string
  primary?: boolean
}

export function SummaryStatCard({
  label,
  value,
  icon,
  trendDirection,
  trendPct,
  trendLabel = 'vs prior period',
  primary = false,
}: SummaryStatCardProps) {
  const arrow = trendDirection === 'up' ? '↑' : trendDirection === 'down' ? '↓' : '→'
  const trendClass =
    trendDirection === 'up'
      ? 'dashboard-summary-trend-up'
      : trendDirection === 'down'
        ? 'dashboard-summary-trend-down'
        : 'dashboard-summary-trend-flat'

  return (
    <article className={`dashboard-summary-card${primary ? ' dashboard-summary-card-primary' : ''}`}>
      <div className="dashboard-summary-card-top">
        <span className="dashboard-summary-icon" aria-hidden>
          {icon}
        </span>
        <span className="dashboard-summary-label">{label}</span>
      </div>
      <strong className="dashboard-summary-value">{value}</strong>
      <div className={`dashboard-summary-trend ${trendClass}`}>
        <span className="dashboard-summary-trend-arrow" aria-hidden>
          {arrow}
        </span>
        <span>
          {trendDirection === 'flat' && trendPct === 0 ? 'Stable' : `${trendPct}%`}
        </span>
        <span className="dashboard-summary-trend-caption">{trendLabel}</span>
      </div>
    </article>
  )
}

export function SummaryCardSkeleton() {
  return (
    <div className="dashboard-summary-card dashboard-summary-card-skeleton" aria-hidden>
      <div className="dashboard-skeleton dashboard-skeleton-icon" />
      <div className="dashboard-skeleton dashboard-skeleton-line sm" />
      <div className="dashboard-skeleton dashboard-skeleton-line lg" />
      <div className="dashboard-skeleton dashboard-skeleton-line md" />
    </div>
  )
}

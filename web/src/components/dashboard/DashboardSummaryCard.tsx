import type { ReactNode } from 'react'

export type TrendDirection = 'up' | 'down' | 'flat' | 'neutral'

export function DashboardSummaryCard({
  label,
  value,
  icon,
  trendPercent,
  trendDirection,
  trendCaption,
  primary,
}: {
  label: string
  value: string | number
  icon: ReactNode
  trendPercent: number | null
  trendDirection: TrendDirection
  trendCaption?: string
  primary?: boolean
}) {
  const arrow = trendDirection === 'up' ? '↑' : trendDirection === 'down' ? '↓' : trendDirection === 'flat' ? '→' : ''
  const trendText =
    trendDirection === 'neutral'
      ? '—'
      : trendPercent === null
        ? 'New'
        : `${arrow} ${trendPercent > 0 ? '+' : ''}${trendPercent}%`

  return (
    <article className={`dashboard-summary-card${primary ? ' dashboard-summary-card--primary' : ''}`}>
      <div className="dashboard-summary-card-top">
        <span className="dashboard-summary-card-icon" aria-hidden>
          {icon}
        </span>
        <span className="dashboard-summary-card-label">{label}</span>
      </div>
      <strong className="dashboard-summary-card-value">{value}</strong>
      <div className="dashboard-summary-card-trend">
        <span
          className={`dashboard-summary-card-trend-pct dashboard-summary-card-trend-pct--${trendDirection}`}
          title={trendCaption}
        >
          {trendText}
        </span>
        {trendCaption && trendDirection !== 'neutral' ? (
          <span className="dashboard-summary-card-trend-cap">{trendCaption}</span>
        ) : null}
      </div>
    </article>
  )
}

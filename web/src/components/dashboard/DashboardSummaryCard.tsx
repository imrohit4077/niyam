import type { ReactNode } from 'react'

export type TrendDirection = 'up' | 'down' | 'neutral'

export type DashboardSummaryCardProps = {
  label: string
  value: string | number
  icon: ReactNode
  trendPercent?: number | null
  trendDirection?: TrendDirection
  trendCaption?: string
  highlight?: boolean
  loading?: boolean
}

function TrendBadge({
  percent,
  direction,
  caption,
}: {
  percent: number | null
  direction: TrendDirection
  caption?: string
}) {
  if (direction === 'neutral' && (percent === null || percent === 0)) {
    return (
      <span className="dashboard-summary-trend dashboard-summary-trend-neutral" title={caption}>
        <span className="dashboard-summary-trend-arrow">—</span>
        {caption ? <span className="dashboard-summary-trend-cap">{caption}</span> : <span className="dashboard-summary-trend-pct">flat</span>}
      </span>
    )
  }
  if (percent === null && direction !== 'neutral') {
    const arrow = direction === 'up' ? '↑' : '↓'
    return (
      <span className={`dashboard-summary-trend dashboard-summary-trend-${direction}`} title={caption}>
        <span className="dashboard-summary-trend-arrow" aria-hidden>
          {arrow}
        </span>
        <span className="dashboard-summary-trend-pct">new</span>
        {caption ? <span className="dashboard-summary-trend-cap">{caption}</span> : null}
      </span>
    )
  }
  if (percent === null) {
    return (
      <span className="dashboard-summary-trend dashboard-summary-trend-neutral" title={caption}>
        <span className="dashboard-summary-trend-arrow">—</span>
        {caption ? <span className="dashboard-summary-trend-cap">{caption}</span> : null}
      </span>
    )
  }
  const arrow = direction === 'up' ? '↑' : '↓'
  const sign = percent > 0 ? '+' : ''
  return (
    <span
      className={`dashboard-summary-trend dashboard-summary-trend-${direction}`}
      title={caption}
    >
      <span className="dashboard-summary-trend-arrow" aria-hidden>
        {arrow}
      </span>
      <span className="dashboard-summary-trend-pct">
        {sign}
        {Math.abs(percent)}%
      </span>
      {caption ? <span className="dashboard-summary-trend-cap">{caption}</span> : null}
    </span>
  )
}

export default function DashboardSummaryCard({
  label,
  value,
  icon,
  trendPercent = null,
  trendDirection = 'neutral',
  trendCaption,
  highlight = false,
  loading = false,
}: DashboardSummaryCardProps) {
  if (loading) {
    return (
      <article className={`dashboard-summary-card ${highlight ? 'dashboard-summary-card-highlight' : ''}`}>
        <div className="dashboard-summary-card-top">
          <div className="dashboard-summary-skel dashboard-summary-skel-icon" />
          <div className="dashboard-summary-skel dashboard-summary-skel-trend" />
        </div>
        <div className="dashboard-summary-skel dashboard-summary-skel-label" />
        <div className="dashboard-summary-skel dashboard-summary-skel-value" />
      </article>
    )
  }

  return (
    <article className={`dashboard-summary-card ${highlight ? 'dashboard-summary-card-highlight' : ''}`}>
      <div className="dashboard-summary-card-top">
        <div className="dashboard-summary-icon" aria-hidden>
          {icon}
        </div>
        <TrendBadge percent={trendPercent} direction={trendDirection} caption={trendCaption} />
      </div>
      <span className="dashboard-summary-label">{label}</span>
      <strong className="dashboard-summary-value">{value}</strong>
    </article>
  )
}

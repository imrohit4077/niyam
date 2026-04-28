import type { ReactNode } from 'react'

export type DashboardStatCardProps = {
  label: string
  value: string | number
  icon: ReactNode
  trendArrow: '↑' | '↓' | '—'
  trendLabel: string
  trendPositive?: boolean
  /** When true, trend direction is inverted for coloring (e.g. fewer rejections = good). */
  invertTrendColor?: boolean
  primary?: boolean
  loading?: boolean
  /** Omit or pass false to hide the "vs prior period" hint (e.g. when trend is not applicable). */
  trendHint?: string | false
}

export function DashboardStatCard({
  label,
  value,
  icon,
  trendArrow,
  trendLabel,
  trendPositive = true,
  invertTrendColor = false,
  primary = false,
  loading = false,
  trendHint = 'vs prior period',
}: DashboardStatCardProps) {
  if (loading) {
    return (
      <article className={`dashboard-stat-card ${primary ? 'dashboard-stat-card--primary' : ''} dashboard-stat-card--skeleton`}>
        <div className="dashboard-stat-card__skeleton-icon" />
        <div className="dashboard-stat-card__skeleton-line dashboard-stat-card__skeleton-line--sm" />
        <div className="dashboard-stat-card__skeleton-line dashboard-stat-card__skeleton-line--lg" />
        <div className="dashboard-stat-card__skeleton-line dashboard-stat-card__skeleton-line--xs" />
      </article>
    )
  }

  const isUp = trendArrow === '↑'
  const isDown = trendArrow === '↓'
  const isNeutralArrow = trendArrow === '—'
  let trendVariant: 'up' | 'down' | 'neutral' = 'neutral'
  if (!isNeutralArrow) {
    let favorable = trendPositive ? isUp : isDown
    if (invertTrendColor) favorable = !favorable
    trendVariant = favorable ? 'up' : 'down'
  }

  return (
    <article className={`dashboard-stat-card ${primary ? 'dashboard-stat-card--primary' : ''}`}>
      <div className="dashboard-stat-card__top">
        <span className="dashboard-stat-card__icon" aria-hidden>
          {icon}
        </span>
        <span className="dashboard-stat-card__label">{label}</span>
      </div>
      <strong className="dashboard-stat-card__value">{value}</strong>
      <div className="dashboard-stat-card__trend">
        <span className={`dashboard-stat-card__trend-chip dashboard-stat-card__trend-chip--${trendVariant}`}>
          <span className="dashboard-stat-card__trend-arrow">{trendArrow}</span>
          <span>{trendLabel}</span>
        </span>
        {trendHint ? <span className="dashboard-stat-card__trend-hint">{trendHint}</span> : null}
      </div>
    </article>
  )
}

import type { ReactNode } from 'react'

export type TrendDirection = 'up' | 'down' | 'neutral'

export type DashboardSummaryCardProps = {
  icon: ReactNode
  label: string
  value: string | number
  /** e.g. "↑ 12%" or "↓ 3%" — shown when trendLabel is set */
  trendLabel?: string
  trendDirection?: TrendDirection
  footnote?: string
  /** Highlights the first card (brand gradient) */
  primary?: boolean
  loading?: boolean
}

function TrendIcon({ direction }: { direction: TrendDirection }) {
  if (direction === 'neutral') return <span className="dashboard-kpi-trend-icon">→</span>
  return (
    <span className={`dashboard-kpi-trend-icon dashboard-kpi-trend-icon--${direction}`} aria-hidden>
      {direction === 'up' ? '↑' : '↓'}
    </span>
  )
}

export function DashboardSummaryCard({
  icon,
  label,
  value,
  trendLabel,
  trendDirection = 'neutral',
  footnote,
  primary,
  loading,
}: DashboardSummaryCardProps) {
  if (loading) {
    return (
      <article className={`dashboard-kpi-card dashboard-kpi-card--skeleton ${primary ? 'dashboard-kpi-primary' : ''}`}>
        <span className="dashboard-kpi-skeleton dashboard-kpi-skeleton-icon" />
        <span className="dashboard-kpi-skeleton dashboard-kpi-skeleton-label" />
        <span className="dashboard-kpi-skeleton dashboard-kpi-skeleton-value" />
        <span className="dashboard-kpi-skeleton dashboard-kpi-skeleton-foot" />
      </article>
    )
  }

  return (
    <article className={`dashboard-kpi-card ${primary ? 'dashboard-kpi-primary' : ''}`}>
      <div className="dashboard-kpi-card-top">
        <span className="dashboard-kpi-icon" aria-hidden>
          {icon}
        </span>
        {trendLabel ? (
          <span
            className={`dashboard-kpi-trend dashboard-kpi-trend--${trendDirection}`}
            title="Compared to prior period"
          >
            <TrendIcon direction={trendDirection} />
            {trendLabel}
          </span>
        ) : null}
      </div>
      <span className="dashboard-kpi-card-label">{label}</span>
      <strong className="dashboard-kpi-card-value">{value}</strong>
      {footnote ? <p className="dashboard-kpi-card-foot">{footnote}</p> : null}
    </article>
  )
}

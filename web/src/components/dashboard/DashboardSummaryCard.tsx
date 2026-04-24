import type { ReactNode } from 'react'

export type SummaryTrendDirection = 'up' | 'down' | 'neutral'

export type DashboardSummaryCardProps = {
  icon: ReactNode
  label: string
  value: string | number
  trendLabel: string
  trendDirection: SummaryTrendDirection
  subtitle?: string
  loading?: boolean
  highlight?: boolean
}

export function DashboardSummaryCard({
  icon,
  label,
  value,
  trendLabel,
  trendDirection,
  subtitle,
  loading,
  highlight,
}: DashboardSummaryCardProps) {
  return (
    <article
      className={`dashboard-summary-card${highlight ? ' dashboard-summary-card--highlight' : ''}${loading ? ' dashboard-summary-card--loading' : ''}`}
    >
      <div className="dashboard-summary-card-top">
        <span className="dashboard-summary-card-icon" aria-hidden>
          {icon}
        </span>
      </div>
      <span className="dashboard-summary-card-label">{label}</span>
      {loading ? (
        <div className="dashboard-summary-skeleton">
          <span className="dashboard-skeleton-line dashboard-skeleton-line--lg" />
          <span className="dashboard-skeleton-line dashboard-skeleton-line--sm" />
        </div>
      ) : (
        <>
          <strong className="dashboard-summary-card-value">{value}</strong>
          <div className="dashboard-summary-card-foot">
            <span className={`dashboard-summary-trend dashboard-summary-trend--${trendDirection}`}>{trendLabel}</span>
            {subtitle ? <span className="dashboard-summary-card-sub">{subtitle}</span> : null}
          </div>
        </>
      )}
    </article>
  )
}

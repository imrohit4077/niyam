import type { ReactNode } from 'react'
import type { TrendResult } from './dashboardHelpers'
import { formatTrendArrow, formatTrendPercent } from './dashboardHelpers'

type SummaryStatCardProps = {
  icon: ReactNode
  label: string
  value: string | number
  subtitle?: string
  trend: TrendResult | null
  loading?: boolean
  emphasis?: boolean
}

export function SummaryStatCard({
  icon,
  label,
  value,
  subtitle,
  trend,
  loading,
  emphasis,
}: SummaryStatCardProps) {
  return (
    <article
      className={`dashboard-summary-card${emphasis ? ' dashboard-summary-card-primary' : ''}`}
    >
      <div className="dashboard-summary-card-top">
        <span className="dashboard-summary-icon" aria-hidden>
          {icon}
        </span>
        <span className="dashboard-summary-label">{label}</span>
      </div>
      {loading ? (
        <div className="dashboard-skeleton dashboard-skeleton-value" />
      ) : (
        <strong className="dashboard-summary-value">{value}</strong>
      )}
      <div className="dashboard-summary-footer">
        {loading ? (
          <div className="dashboard-skeleton dashboard-skeleton-foot" />
        ) : (
          <>
            {trend ? (
              <span
                className={`dashboard-trend dashboard-trend-${trend.direction}`}
                title="Compared to prior period"
              >
                <span className="dashboard-trend-arrow">{formatTrendArrow(trend)}</span>
                <span className="dashboard-trend-pct">{formatTrendPercent(trend)}</span>
              </span>
            ) : (
              <span className="dashboard-trend dashboard-trend-muted">—</span>
            )}
            {subtitle ? <span className="dashboard-summary-sub">{subtitle}</span> : null}
          </>
        )}
      </div>
    </article>
  )
}

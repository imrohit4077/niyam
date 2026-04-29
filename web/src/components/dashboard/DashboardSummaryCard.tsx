import type { ReactNode } from 'react'
import type { SummaryTrend } from './dashboardTrend'

export type { SummaryTrend }

type DashboardSummaryCardProps = {
  label: string
  value: string | number
  icon: ReactNode
  trend?: SummaryTrend | null
  trendCaption?: string
  primary?: boolean
  loading?: boolean
}

function TrendBadge({ trend, caption }: { trend: SummaryTrend; caption?: string }) {
  const cls =
    trend.tone === 'up'
      ? 'dashboard-summary-trend dashboard-summary-trend--up'
      : trend.tone === 'down'
        ? 'dashboard-summary-trend dashboard-summary-trend--down'
        : 'dashboard-summary-trend dashboard-summary-trend--neutral'
  return (
    <div className={cls}>
      <span className="dashboard-summary-trend-arrow" aria-hidden>
        {trend.arrow}
      </span>
      <span className="dashboard-summary-trend-pct">{trend.pctLabel}</span>
      {caption ? <span className="dashboard-summary-trend-cap">{caption}</span> : null}
    </div>
  )
}

export function DashboardSummaryCard({
  label,
  value,
  icon,
  trend,
  trendCaption,
  primary,
  loading,
}: DashboardSummaryCardProps) {
  return (
    <article className={`dashboard-summary-card${primary ? ' dashboard-summary-card--primary' : ''}`}>
      <div className="dashboard-summary-card-top">
        <span className="dashboard-summary-icon" aria-hidden>
          {icon}
        </span>
        {loading ? (
          <div className="dashboard-summary-skeleton-value" />
        ) : (
          <strong className="dashboard-summary-value">{value}</strong>
        )}
      </div>
      <span className="dashboard-summary-label">{label}</span>
      {loading ? (
        <div className="dashboard-summary-skeleton-trend" />
      ) : trend ? (
        <TrendBadge trend={trend} caption={trendCaption} />
      ) : null}
    </article>
  )
}

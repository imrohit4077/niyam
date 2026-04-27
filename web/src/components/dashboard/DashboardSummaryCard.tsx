import type { ReactNode } from 'react'

export type SummaryTrend = {
  direction: 'up' | 'down' | 'flat'
  /** Percent change vs prior period; null when not meaningful */
  pct: number | null
}

function formatTrend(trend: SummaryTrend | null | undefined): string {
  if (!trend || trend.pct == null) return '—'
  if (trend.direction === 'flat' && trend.pct === 0) return '0%'
  const sign = trend.pct > 0 ? '+' : ''
  return `${sign}${trend.pct}%`
}

export function DashboardSummaryCard({
  label,
  value,
  icon,
  trend,
  subtitle,
}: {
  label: string
  value: string | number
  icon: ReactNode
  subtitle?: string
  trend?: SummaryTrend | null
}) {
  const arrow = trend?.direction === 'up' ? '↑' : trend?.direction === 'down' ? '↓' : trend?.direction === 'flat' ? '' : ''
  const trendClass =
    trend?.direction === 'up'
      ? 'dashboard-summary-card-trend-up'
      : trend?.direction === 'down'
        ? 'dashboard-summary-card-trend-down'
        : 'dashboard-summary-card-trend-flat'

  return (
    <article className="dashboard-summary-card">
      <div className="dashboard-summary-card-top">
        <div className="dashboard-summary-card-icon" aria-hidden>
          {icon}
        </div>
        {trend && (
          <span className={`dashboard-summary-card-trend ${trendClass}`} title="Vs prior 30 days">
            {arrow}
            {formatTrend(trend)}
          </span>
        )}
      </div>
      <span className="dashboard-summary-card-label">{label}</span>
      <strong className="dashboard-summary-card-value">{value}</strong>
      {subtitle ? <p className="dashboard-summary-card-subtitle">{subtitle}</p> : null}
    </article>
  )
}

export function DashboardSummaryCardSkeleton() {
  return (
    <div className="dashboard-summary-card dashboard-summary-card-skeleton" aria-hidden>
      <div className="dashboard-summary-card-top">
        <div className="dashboard-skeleton-block dashboard-skeleton-icon" />
        <div className="dashboard-skeleton-block dashboard-skeleton-trend" />
      </div>
      <div className="dashboard-skeleton-block dashboard-skeleton-label" />
      <div className="dashboard-skeleton-block dashboard-skeleton-value" />
      <div className="dashboard-skeleton-block dashboard-skeleton-subtitle" />
    </div>
  )
}

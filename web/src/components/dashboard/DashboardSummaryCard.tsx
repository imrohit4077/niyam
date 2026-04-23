import type { ReactNode } from 'react'

export type SummaryTrend = {
  label: string
  direction: 'up' | 'down' | 'flat'
  /** Display string, e.g. "12%", "New", or "—" */
  pctLabel: string
}

type Props = {
  label: string
  value: ReactNode
  subtitle?: string
  icon: ReactNode
  trend?: SummaryTrend
  highlight?: boolean
}

export function DashboardSummaryCard({ label, value, subtitle, icon, trend, highlight }: Props) {
  const arrow = trend?.direction === 'up' ? '↑' : trend?.direction === 'down' ? '↓' : trend ? '→' : ''
  const trendClass =
    trend?.direction === 'up'
      ? 'dashboard-summary-trend--up'
      : trend?.direction === 'down'
        ? 'dashboard-summary-trend--down'
        : 'dashboard-summary-trend--flat'

  return (
    <article className={`dashboard-summary-card${highlight ? ' dashboard-summary-card--primary' : ''}`}>
      <div className="dashboard-summary-card-top">
        <div className="dashboard-summary-icon" aria-hidden>
          {icon}
        </div>
        {trend && (
          <span className={`dashboard-summary-trend ${trendClass}`} title={trend.label}>
            <span className="dashboard-summary-trend-arrow">{arrow}</span>
            <span className="dashboard-summary-trend-pct">{trend.pctLabel}</span>
          </span>
        )}
      </div>
      <span className="dashboard-summary-label">{label}</span>
      <strong className="dashboard-summary-value">{value}</strong>
      {subtitle ? <p className="dashboard-summary-sub">{subtitle}</p> : null}
    </article>
  )
}

export function DashboardSummaryGridSkeleton() {
  return (
    <div className="dashboard-summary-grid" aria-busy="true" aria-label="Loading summary">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="dashboard-summary-card dashboard-summary-card--skeleton">
          <div className="dashboard-skeleton dashboard-skeleton-icon" />
          <div className="dashboard-skeleton dashboard-skeleton-line dashboard-skeleton-line--short" />
          <div className="dashboard-skeleton dashboard-skeleton-line dashboard-skeleton-line--value" />
          <div className="dashboard-skeleton dashboard-skeleton-line dashboard-skeleton-line--sub" />
        </div>
      ))}
    </div>
  )
}

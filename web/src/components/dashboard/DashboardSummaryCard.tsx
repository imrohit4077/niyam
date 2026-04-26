import type { ReactNode } from 'react'

export type SummaryTrend = {
  /** Percentage change vs comparison period (always non-negative magnitude for display). */
  pct: number
  up: boolean
  /** When true, show neutral dash instead of arrow (insufficient baseline). */
  flat?: boolean
}

type DashboardSummaryCardProps = {
  title: string
  value: string | number
  icon: ReactNode
  trend?: SummaryTrend
  footnote?: string
  /** First card can use primary styling */
  variant?: 'default' | 'primary'
}

export function DashboardSummaryCard({ title, value, icon, trend, footnote, variant = 'default' }: DashboardSummaryCardProps) {
  const trendContent =
    trend == null ? null : trend.flat || trend.pct === 0 ? (
      <span className="dashboard-summary-trend dashboard-summary-trend-neutral">— vs prior period</span>
    ) : (
      <span className={`dashboard-summary-trend ${trend.up ? 'dashboard-summary-trend-up' : 'dashboard-summary-trend-down'}`}>
        {trend.up ? '↑' : '↓'} {trend.pct}%
      </span>
    )

  return (
    <article className={`dashboard-summary-card ${variant === 'primary' ? 'dashboard-summary-card-primary' : ''}`}>
      <div className="dashboard-summary-card-top">
        <span className="dashboard-summary-icon" aria-hidden>
          {icon}
        </span>
        <div className="dashboard-summary-card-heading">
          <span className="dashboard-summary-title">{title}</span>
          {trendContent}
        </div>
      </div>
      <strong className="dashboard-summary-value">{value}</strong>
      {footnote ? <p className="dashboard-summary-footnote">{footnote}</p> : null}
    </article>
  )
}

export function DashboardSummaryGrid({ children }: { children: ReactNode }) {
  return <div className="dashboard-summary-grid">{children}</div>
}

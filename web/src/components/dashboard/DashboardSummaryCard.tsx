import type { ReactNode } from 'react'

export type SummaryTrend = {
  /** Percentage change vs comparison period (0–100+). */
  pct: number
  up: boolean
  /** When true, show neutral dash instead of arrow (e.g. no prior data). */
  flat?: boolean
}

type Props = {
  label: string
  value: string | number
  icon: ReactNode
  trend?: SummaryTrend
  /** Shown as tooltip on the trend chip. */
  trendTitle?: string
  /** Small caption under the value (e.g. comparison window). */
  hint?: string
  /** Primary card uses brand gradient (one per row). */
  primary?: boolean
}

export function DashboardSummaryCard({
  label,
  value,
  icon,
  trend,
  trendTitle = 'Change vs prior period',
  hint,
  primary,
}: Props) {
  const trendContent =
    trend == null ? null : trend.flat || trend.pct === 0 ? (
      <span className="dashboard-summary-trend dashboard-summary-trend-neutral" title={trendTitle}>
        — <span className="dashboard-summary-trend-pct">0%</span>
      </span>
    ) : (
      <span
        className={`dashboard-summary-trend ${trend.up ? 'dashboard-summary-trend-up' : 'dashboard-summary-trend-down'}`}
        title={trendTitle}
      >
        {trend.up ? '↑' : '↓'} <span className="dashboard-summary-trend-pct">{trend.pct}%</span>
      </span>
    )

  return (
    <article className={`dashboard-summary-card ${primary ? 'dashboard-summary-card-primary' : ''}`}>
      <div className="dashboard-summary-card-top">
        <div className="dashboard-summary-icon" aria-hidden>
          {icon}
        </div>
        {trendContent}
      </div>
      <span className="dashboard-summary-label">{label}</span>
      <strong className="dashboard-summary-value">{value}</strong>
      {hint ? <p className="dashboard-summary-hint">{hint}</p> : null}
    </article>
  )
}

import type { ReactNode } from 'react'

export type TrendDirection = 'up' | 'down' | 'flat'

export type DashboardSummaryCardProps = {
  icon: ReactNode
  label: string
  value: string | number
  /** Secondary line under the value (e.g. context, not the trend) */
  hint?: string
  trendDirection: TrendDirection
  /** Human trend label, e.g. "12% vs last month" or "+3" */
  trendLabel: string
  /** First card can use primary styling */
  variant?: 'default' | 'primary'
}

export function DashboardSummaryCard({
  icon,
  label,
  value,
  hint,
  trendDirection,
  trendLabel,
  variant = 'default',
}: DashboardSummaryCardProps) {
  const arrow = trendDirection === 'up' ? '↑' : trendDirection === 'down' ? '↓' : '→'
  const trendClass =
    trendDirection === 'up'
      ? 'dashboard-summary-trend--up'
      : trendDirection === 'down'
        ? 'dashboard-summary-trend--down'
        : 'dashboard-summary-trend--flat'

  return (
    <article className={`dashboard-summary-card ${variant === 'primary' ? 'dashboard-summary-card--primary' : ''}`}>
      <div className="dashboard-summary-card-top">
        <span className="dashboard-summary-icon" aria-hidden>
          {icon}
        </span>
        <span className="dashboard-summary-label">{label}</span>
      </div>
      <strong className="dashboard-summary-value">{value}</strong>
      <div className="dashboard-summary-meta">
        <span className={`dashboard-summary-trend ${trendClass}`} title={trendLabel}>
          <span className="dashboard-summary-trend-arrow" aria-hidden>
            {arrow}
          </span>
          <span className="dashboard-summary-trend-text">{trendLabel}</span>
        </span>
        {hint ? <span className="dashboard-summary-hint">{hint}</span> : null}
      </div>
    </article>
  )
}

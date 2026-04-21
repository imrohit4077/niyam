import type { ReactNode } from 'react'

export type DashboardTrend = {
  direction: 'up' | 'down' | 'flat'
  /** Whole number or one decimal, e.g. 12 or 4.5 */
  pct: number
  /** Screen-reader label, e.g. "vs prior month" */
  label: string
}

type DashboardSummaryCardProps = {
  icon: ReactNode
  label: string
  value: number | string
  trend?: DashboardTrend | null
  sublabel?: string
  highlight?: boolean
}

export function DashboardSummaryCard({ icon, label, value, trend, sublabel, highlight }: DashboardSummaryCardProps) {
  const trendSymbol = trend?.direction === 'up' ? '↑' : trend?.direction === 'down' ? '↓' : '→'
  const trendClass =
    trend?.direction === 'up'
      ? 'dashboard-summary-trend--up'
      : trend?.direction === 'down'
        ? 'dashboard-summary-trend--down'
        : 'dashboard-summary-trend--flat'

  return (
    <article className={`dashboard-summary-card${highlight ? ' dashboard-summary-card--primary' : ''}`}>
      <div className="dashboard-summary-card-top">
        <span className="dashboard-summary-icon" aria-hidden>
          {icon}
        </span>
        {trend != null && (
          <span className={`dashboard-summary-trend ${trendClass}`} title={trend.label}>
            {trendSymbol} {trend.pct}%
          </span>
        )}
      </div>
      <span className="dashboard-summary-label">{label}</span>
      <strong className="dashboard-summary-value">{value}</strong>
      {sublabel ? <p className="dashboard-summary-sublabel">{sublabel}</p> : null}
    </article>
  )
}

import type { ReactNode } from 'react'
import type { TrendResult } from './dashboardUtils'

type Props = {
  label: string
  value: string | number
  icon: ReactNode
  trend: TrendResult
  hint?: string
  primary?: boolean
}

export function DashboardSummaryCard({ label, value, icon, trend, hint, primary }: Props) {
  const arrow = trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'
  const trendClass =
    trend.direction === 'up'
      ? 'dashboard-summary-trend--up'
      : trend.direction === 'down'
        ? 'dashboard-summary-trend--down'
        : 'dashboard-summary-trend--flat'

  return (
    <article className={`dashboard-summary-card${primary ? ' dashboard-summary-card--primary' : ''}`}>
      <div className="dashboard-summary-card-top">
        <span className="dashboard-summary-icon" aria-hidden>
          {icon}
        </span>
        <span className="dashboard-summary-label">{label}</span>
      </div>
      <strong className="dashboard-summary-value">{value}</strong>
      <div className="dashboard-summary-footer">
        <span className={`dashboard-summary-trend ${trendClass}`} title="vs prior 30 days">
          <span className="dashboard-summary-trend-arrow" aria-hidden>
            {arrow}
          </span>
          <span>{trend.label}</span>
        </span>
        {hint ? <span className="dashboard-summary-hint">{hint}</span> : null}
      </div>
    </article>
  )
}

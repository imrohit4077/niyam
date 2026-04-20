import type { ReactNode } from 'react'
import type { PeriodTrend } from './dashboardMetrics'

type DashboardSummaryCardProps = {
  label: string
  value: string | number
  icon: ReactNode
  trend?: PeriodTrend
  /** Shown under the value when no trend or as secondary line */
  hint?: string
  primary?: boolean
}

export function DashboardSummaryCard({ label, value, icon, trend, hint, primary }: DashboardSummaryCardProps) {
  const arrow = trend?.direction === 'up' ? '↑' : trend?.direction === 'down' ? '↓' : '→'
  const trendClass =
    trend?.direction === 'up'
      ? 'dashboard-kpi-trend--up'
      : trend?.direction === 'down'
        ? 'dashboard-kpi-trend--down'
        : 'dashboard-kpi-trend--flat'

  return (
    <article className={`dashboard-kpi-card${primary ? ' dashboard-kpi-primary' : ''}`}>
      <div className="dashboard-kpi-card-top">
        <span className="dashboard-kpi-label">{label}</span>
        <span className="dashboard-kpi-icon" aria-hidden>
          {icon}
        </span>
      </div>
      <strong className="dashboard-kpi-value">{value}</strong>
      <div className="dashboard-kpi-card-foot">
        {trend && (
          <span className={`dashboard-kpi-trend ${trendClass}`} title="Vs prior 30 days">
            <span className="dashboard-kpi-trend-arrow" aria-hidden>
              {arrow}
            </span>
            {trend.label}
          </span>
        )}
        {hint && <p className="dashboard-kpi-hint">{hint}</p>}
      </div>
    </article>
  )
}

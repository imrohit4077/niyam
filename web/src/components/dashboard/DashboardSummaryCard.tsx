import type { ReactNode } from 'react'
import type { TrendDirection } from './dashboardTrend'

type DashboardSummaryCardProps = {
  icon: ReactNode
  label: string
  value: string | number
  trend?: { direction: TrendDirection; label: string; caption?: string }
  variant?: 'default' | 'primary'
  sublabel?: string
}

export function DashboardSummaryCard({
  icon,
  label,
  value,
  trend,
  variant = 'default',
  sublabel,
}: DashboardSummaryCardProps) {
  const trendArrow = trend?.direction === 'up' ? '↑' : trend?.direction === 'down' ? '↓' : '→'

  return (
    <article className={`dashboard-summary-card ${variant === 'primary' ? 'dashboard-summary-card--primary' : ''}`}>
      <div className="dashboard-summary-card-top">
        <span className="dashboard-summary-card-icon" aria-hidden>
          {icon}
        </span>
        {trend && (
          <span
            className={`dashboard-summary-trend dashboard-summary-trend--${trend.direction}`}
            title={trend.caption ?? 'vs prior 30 days'}
          >
            <span className="dashboard-summary-trend-arrow" aria-hidden>
              {trendArrow}
            </span>
            <span className="dashboard-summary-trend-pct">{trend.label}</span>
          </span>
        )}
      </div>
      <span className="dashboard-summary-card-label">{label}</span>
      <strong className="dashboard-summary-card-value">{value}</strong>
      {sublabel && <p className="dashboard-summary-card-sublabel">{sublabel}</p>}
    </article>
  )
}

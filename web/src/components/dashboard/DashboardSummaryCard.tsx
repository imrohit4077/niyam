import type { ReactNode } from 'react'
import { formatTrendPercent, type TrendDirection } from './dashboardWorkspaceMetrics'

type DashboardSummaryCardProps = {
  label: string
  value: string | number
  icon: ReactNode
  trend?: { direction: TrendDirection; percent: number; caption?: string }
  sublabel?: string
  primary?: boolean
}

export function DashboardSummaryCard({ label, value, icon, trend, sublabel, primary }: DashboardSummaryCardProps) {
  const arrow = trend?.direction === 'up' ? '↑' : trend?.direction === 'down' ? '↓' : ''
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
      <div className="dashboard-kpi-card-bottom">
        {trend && (
          <span className={`dashboard-kpi-trend ${trendClass}`} title={trend.caption}>
            {trend.direction !== 'flat' && <span className="dashboard-kpi-trend-arrow">{arrow}</span>}
            <span className="dashboard-kpi-trend-pct">{formatTrendPercent(trend.percent, trend.direction)}</span>
          </span>
        )}
        {sublabel && <p className="dashboard-kpi-sublabel">{sublabel}</p>}
      </div>
    </article>
  )
}

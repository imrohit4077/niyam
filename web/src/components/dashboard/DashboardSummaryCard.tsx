import type { ReactNode } from 'react'
import type { TrendDirection } from './dashboardUtils'

type Props = {
  label: string
  value: string | number
  icon: ReactNode
  trend?: { direction: TrendDirection; label: string }
  /** Tooltip on the trend badge (e.g. what the % measures) */
  trendHint?: string
  sublabel?: string
  variant?: 'default' | 'primary'
}

function TrendBadge({ direction, label, title }: { direction: TrendDirection; label: string; title?: string }) {
  const sym = direction === 'up' ? '↑' : direction === 'down' ? '↓' : '→'
  return (
    <span className={`dashboard-kpi-trend dashboard-kpi-trend--${direction}`} title={title ?? 'vs prior period'}>
      <span className="dashboard-kpi-trend-arrow" aria-hidden>
        {sym}
      </span>
      {label}
    </span>
  )
}

export function DashboardSummaryCard({ label, value, icon, trend, trendHint, sublabel, variant = 'default' }: Props) {
  return (
    <article className={`dashboard-kpi-card ${variant === 'primary' ? 'dashboard-kpi-primary' : ''}`}>
      <div className="dashboard-kpi-card-top">
        <span className="dashboard-kpi-icon" aria-hidden>
          {icon}
        </span>
        {trend ? <TrendBadge direction={trend.direction} label={trend.label} title={trendHint} /> : null}
      </div>
      <span className="dashboard-kpi-label">{label}</span>
      <strong className="dashboard-kpi-value">{value}</strong>
      {sublabel ? <p className="dashboard-kpi-sublabel">{sublabel}</p> : null}
    </article>
  )
}

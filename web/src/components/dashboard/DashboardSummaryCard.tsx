import type { ReactNode } from 'react'

export type SummaryTrend = {
  direction: 'up' | 'down' | 'flat'
  /** e.g. "+12%" or "—" */
  label: string
}

export function DashboardSummaryCard({
  icon,
  label,
  value,
  trend,
  subtitle,
  primary,
}: {
  icon: ReactNode
  label: string
  value: string | number
  trend?: SummaryTrend | null
  subtitle?: string
  primary?: boolean
}) {
  return (
    <article className={`dashboard-summary-card ${primary ? 'dashboard-summary-card-primary' : ''}`}>
      <div className="dashboard-summary-card-top">
        <span className="dashboard-summary-icon" aria-hidden>
          {icon}
        </span>
        {trend != null && trend.label !== '' && (
          <span
            className={`dashboard-summary-trend dashboard-summary-trend-${trend.direction}`}
            title="vs prior period"
          >
            {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'} {trend.label}
          </span>
        )}
      </div>
      <span className="dashboard-summary-label">{label}</span>
      <strong className="dashboard-summary-value">{value}</strong>
      {subtitle ? <p className="dashboard-summary-subtitle">{subtitle}</p> : null}
    </article>
  )
}

import type { ReactNode } from 'react'

export function DashboardSummaryCard({
  icon,
  label,
  value,
  trend,
  primary,
}: {
  icon: ReactNode
  label: string
  value: string | number
  trend: { symbol: string; label: string; direction: 'up' | 'down' | 'flat' }
  primary?: boolean
}) {
  return (
    <article className={`dashboard-summary-card${primary ? ' dashboard-summary-card--primary' : ''}`}>
      <div className="dashboard-summary-card-top">
        <span className="dashboard-summary-icon" aria-hidden>
          {icon}
        </span>
        <span className="dashboard-summary-label">{label}</span>
      </div>
      <strong className="dashboard-summary-value">{value}</strong>
      <div className={`dashboard-summary-trend dashboard-summary-trend--${trend.direction}`}>
        <span className="dashboard-summary-trend-symbol">{trend.symbol}</span>
        <span className="dashboard-summary-trend-label">{trend.label}</span>
      </div>
    </article>
  )
}

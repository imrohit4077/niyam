import type { ReactNode } from 'react'

export type SummaryTrend = {
  direction: 'up' | 'down' | 'flat'
  label: string
}

type Props = {
  label: string
  value: string | number
  icon: ReactNode
  trend?: SummaryTrend
  primary?: boolean
}

export default function DashboardSummaryCard({ label, value, icon, trend, primary }: Props) {
  return (
    <article className={`dashboard-summary-card${primary ? ' dashboard-summary-card--primary' : ''}`}>
      <div className="dashboard-summary-card-top">
        <span className="dashboard-summary-card-icon" aria-hidden>
          {icon}
        </span>
        {trend && (
          <span
            className={`dashboard-summary-trend dashboard-summary-trend--${trend.direction}`}
            title={trend.label}
          >
            {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'}{' '}
            {trend.label}
          </span>
        )}
      </div>
      <strong className="dashboard-summary-card-value">{value}</strong>
      <span className="dashboard-summary-card-label">{label}</span>
    </article>
  )
}

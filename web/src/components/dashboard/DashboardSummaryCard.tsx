import type { ReactNode } from 'react'

export type SummaryTrend = {
  direction: 'up' | 'down' | 'flat'
  /** e.g. "+12%" or "New" */
  label: string
}

type Props = {
  icon: ReactNode
  label: string
  value: string | number
  subtitle?: string
  trend?: SummaryTrend | null
  variant?: 'default' | 'primary'
}

export default function DashboardSummaryCard({ icon, label, value, subtitle, trend, variant = 'default' }: Props) {
  const trendClass =
    trend == null
      ? ''
      : trend.direction === 'up'
        ? 'dashboard-summary-trend--up'
        : trend.direction === 'down'
          ? 'dashboard-summary-trend--down'
          : 'dashboard-summary-trend--flat'

  return (
    <article className={`dashboard-summary-card ${variant === 'primary' ? 'dashboard-summary-card--primary' : ''}`}>
      <div className="dashboard-summary-card-top">
        <span className="dashboard-summary-icon" aria-hidden>
          {icon}
        </span>
        {trend != null && trend.label ? (
          <span className={`dashboard-summary-trend ${trendClass}`} title="Compared to prior period">
            {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'} {trend.label}
          </span>
        ) : null}
      </div>
      <span className="dashboard-summary-label">{label}</span>
      <strong className="dashboard-summary-value">{value}</strong>
      {subtitle ? <p className="dashboard-summary-subtitle">{subtitle}</p> : null}
    </article>
  )
}

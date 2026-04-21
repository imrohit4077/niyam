import type { ReactNode } from 'react'

export type SummaryTrend = {
  direction: 'up' | 'down' | 'flat' | 'neutral'
  label: string
}

type Props = {
  label: string
  value: string | number
  icon: ReactNode
  trend?: SummaryTrend
  subtitle?: string
  highlight?: boolean
}

function TrendBadge({ trend }: { trend: SummaryTrend }) {
  const arrow = trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : trend.direction === 'flat' ? '→' : '—'
  const mod =
    trend.direction === 'up'
      ? 'dashboard-summary-trend--up'
      : trend.direction === 'down'
        ? 'dashboard-summary-trend--down'
        : trend.direction === 'flat'
          ? 'dashboard-summary-trend--flat'
          : 'dashboard-summary-trend--neutral'
  return (
    <span className={`dashboard-summary-trend ${mod}`} title="Compared to prior period">
      <span className="dashboard-summary-trend-arrow" aria-hidden>
        {arrow}
      </span>
      <span className="dashboard-summary-trend-label">{trend.label}</span>
    </span>
  )
}

export function DashboardSummaryCard({ label, value, icon, trend, subtitle, highlight }: Props) {
  return (
    <article className={`dashboard-summary-card ${highlight ? 'dashboard-summary-card--primary' : ''}`}>
      <div className="dashboard-summary-card-top">
        <span className="dashboard-summary-icon" aria-hidden>
          {icon}
        </span>
        {trend ? <TrendBadge trend={trend} /> : null}
      </div>
      <span className="dashboard-summary-label">{label}</span>
      <strong className="dashboard-summary-value">{value}</strong>
      {subtitle ? <p className="dashboard-summary-subtitle">{subtitle}</p> : null}
    </article>
  )
}

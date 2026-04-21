import type { ReactNode } from 'react'
import type { TrendResult } from './dashboardUtils'

type SummaryMetricCardProps = {
  label: string
  value: ReactNode
  icon: ReactNode
  trend: TrendResult
  sublabel?: string
  loading?: boolean
  highlight?: boolean
}

function TrendBadge({ trend }: { trend: TrendResult }) {
  const arrow = trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'
  const mod =
    trend.direction === 'up'
      ? 'dashboard-summary-trend--up'
      : trend.direction === 'down'
        ? 'dashboard-summary-trend--down'
        : 'dashboard-summary-trend--flat'
  return (
    <span className={`dashboard-summary-trend ${mod}`} title="vs prior 30 days">
      <span className="dashboard-summary-trend-arrow" aria-hidden>
        {arrow}
      </span>
      <span className="dashboard-summary-trend-pct">{trend.label}</span>
    </span>
  )
}

export function SummaryMetricCardSkeleton() {
  return (
    <article className="dashboard-summary-card dashboard-summary-card--skeleton" aria-busy="true">
      <div className="dashboard-summary-card-top">
        <span className="dashboard-summary-skel dashboard-summary-skel-icon" />
        <span className="dashboard-summary-skel dashboard-summary-skel-trend" />
      </div>
      <span className="dashboard-summary-skel dashboard-summary-skel-value" />
      <span className="dashboard-summary-skel dashboard-summary-skel-label" />
    </article>
  )
}

export function SummaryMetricCard({ label, value, icon, trend, sublabel, loading, highlight }: SummaryMetricCardProps) {
  if (loading) {
    return <SummaryMetricCardSkeleton />
  }
  return (
    <article className={`dashboard-summary-card${highlight ? ' dashboard-summary-card--primary' : ''}`}>
      <div className="dashboard-summary-card-top">
        <span className="dashboard-summary-icon" aria-hidden>
          {icon}
        </span>
        <TrendBadge trend={trend} />
      </div>
      <strong className="dashboard-summary-value">{value}</strong>
      <span className="dashboard-summary-label">{label}</span>
      {sublabel ? <p className="dashboard-summary-sublabel">{sublabel}</p> : null}
    </article>
  )
}

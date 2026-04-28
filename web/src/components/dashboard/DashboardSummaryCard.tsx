import type { ReactNode } from 'react'
import type { TrendDirection } from '../../lib/dashboardMetrics'

export type SummaryCardProps = {
  icon: ReactNode
  label: string
  value: string | number
  /** Short secondary line (not the trend). */
  hint?: string
  trend: { direction: TrendDirection; label: string }
  variant?: 'default' | 'primary'
  loading?: boolean
}

function TrendBadge({ trend }: { trend: SummaryCardProps['trend'] }) {
  const arrow = trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'
  const cls =
    trend.direction === 'up'
      ? 'dashboard-summary-trend-up'
      : trend.direction === 'down'
        ? 'dashboard-summary-trend-down'
        : 'dashboard-summary-trend-flat'
  return (
    <span className={`dashboard-summary-trend ${cls}`} title="vs prior 30 days">
      {arrow} {trend.label}
    </span>
  )
}

export function DashboardSummaryCard({ icon, label, value, hint, trend, variant = 'default', loading }: SummaryCardProps) {
  return (
    <article className={`dashboard-summary-card ${variant === 'primary' ? 'dashboard-summary-card-primary' : ''}`}>
      <div className="dashboard-summary-card-top">
        <span className="dashboard-summary-icon" aria-hidden>
          {icon}
        </span>
        <span className="dashboard-summary-label">{label}</span>
      </div>
      {loading ? (
        <div className="dashboard-summary-skeleton" aria-busy>
          <span className="dashboard-skeleton-line dashboard-skeleton-line-lg" />
          <span className="dashboard-skeleton-line dashboard-skeleton-line-sm" />
        </div>
      ) : (
        <>
          <strong className="dashboard-summary-value">{value}</strong>
          <div className="dashboard-summary-meta">
            {hint ? <span className="dashboard-summary-hint">{hint}</span> : null}
            <TrendBadge trend={trend} />
          </div>
        </>
      )}
    </article>
  )
}

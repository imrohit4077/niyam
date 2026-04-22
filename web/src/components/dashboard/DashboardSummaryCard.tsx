import type { ReactNode } from 'react'
import type { TrendDirection } from './dashboardUtils'

function TrendBadge({ direction, pct }: { direction: TrendDirection; pct: number | null }) {
  if (direction === 'flat' && pct === 0) {
    return <span className="dashboard-kpi-trend dashboard-kpi-trend-flat">— 0%</span>
  }
  const arrow = direction === 'up' ? '↑' : direction === 'down' ? '↓' : '→'
  const label = pct == null ? 'New' : `${pct}%`
  return (
    <span className={`dashboard-kpi-trend dashboard-kpi-trend-${direction}`}>
      {arrow} {label}
    </span>
  )
}

type Props = {
  label: string
  value: string | number
  hint?: string
  icon: ReactNode
  trendDirection: TrendDirection
  trendPct: number | null
  variant?: 'default' | 'primary'
  skeleton?: boolean
}

export default function DashboardSummaryCard({
  label,
  value,
  hint,
  icon,
  trendDirection,
  trendPct,
  variant = 'default',
  skeleton,
}: Props) {
  if (skeleton) {
    return (
      <article className="dashboard-summary-card dashboard-summary-card-skeleton" aria-busy="true">
        <div className="dashboard-summary-card-top">
          <span className="dashboard-summary-icon dashboard-skeleton-block" />
          <span className="dashboard-skeleton-line dashboard-skeleton-line-short" />
        </div>
        <div className="dashboard-skeleton-line dashboard-skeleton-line-value" />
        <div className="dashboard-skeleton-line dashboard-skeleton-line-hint" />
      </article>
    )
  }

  return (
    <article className={`dashboard-summary-card ${variant === 'primary' ? 'dashboard-summary-card-primary' : ''}`}>
      <div className="dashboard-summary-card-top">
        <span className="dashboard-summary-icon" aria-hidden>
          {icon}
        </span>
        <TrendBadge direction={trendDirection} pct={trendPct} />
      </div>
      <span className="dashboard-summary-label">{label}</span>
      <strong className="dashboard-summary-value">{value}</strong>
      {hint ? <p className="dashboard-summary-hint">{hint}</p> : null}
    </article>
  )
}

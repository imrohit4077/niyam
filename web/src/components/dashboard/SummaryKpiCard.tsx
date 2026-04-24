import type { ReactNode } from 'react'

export type TrendDirection = 'up' | 'down' | 'flat'

export type SummaryKpiCardProps = {
  label: string
  value: string | number
  icon: ReactNode
  trend?: { direction: TrendDirection; label: string } | null
  subtitle?: string
  highlight?: boolean
  loading?: boolean
}

function TrendBadge({ direction, label }: { direction: TrendDirection; label: string }) {
  const arrow = direction === 'up' ? '↑' : direction === 'down' ? '↓' : '→'
  const cls =
    direction === 'up'
      ? 'dashboard-kpi-trend-up'
      : direction === 'down'
        ? 'dashboard-kpi-trend-down'
        : 'dashboard-kpi-trend-flat'
  return (
    <span className={`dashboard-kpi-trend ${cls}`} title={label}>
      <span className="dashboard-kpi-trend-arrow" aria-hidden>
        {arrow}
      </span>
      <span className="dashboard-kpi-trend-label">{label}</span>
    </span>
  )
}

export function SummaryKpiCardSkeleton() {
  return (
    <article className="dashboard-kpi-card dashboard-kpi-card-rich" aria-busy="true">
      <div className="dashboard-kpi-card-top">
        <span className="dashboard-kpi-icon dashboard-kpi-icon-skeleton" />
        <span className="dashboard-kpi-trend-skeleton" />
      </div>
      <span className="dashboard-kpi-label-skeleton" />
      <span className="dashboard-kpi-value-skeleton" />
      <span className="dashboard-kpi-sub-skeleton" />
    </article>
  )
}

export function SummaryKpiCard({ label, value, icon, trend, subtitle, highlight, loading }: SummaryKpiCardProps) {
  if (loading) return <SummaryKpiCardSkeleton />

  return (
    <article className={`dashboard-kpi-card dashboard-kpi-card-rich ${highlight ? 'dashboard-kpi-primary' : ''}`}>
      <div className="dashboard-kpi-card-top">
        <span className={`dashboard-kpi-icon ${highlight ? 'dashboard-kpi-icon-on-primary' : ''}`}>{icon}</span>
        {trend ? <TrendBadge direction={trend.direction} label={trend.label} /> : null}
      </div>
      <span className="dashboard-kpi-card-label">{label}</span>
      <strong className="dashboard-kpi-card-value">{value}</strong>
      {subtitle ? <p className="dashboard-kpi-card-sub">{subtitle}</p> : null}
    </article>
  )
}

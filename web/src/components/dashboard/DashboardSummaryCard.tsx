import type { ReactNode } from 'react'
import type { TrendDirection } from './helpers'

function TrendBadge({ direction, percent }: { direction: TrendDirection; percent: number }) {
  if (direction === 'flat' || percent === 0) {
    return <span className="dashboard-kpi-trend dashboard-kpi-trend-flat">— 0%</span>
  }
  const arrow = direction === 'up' ? '↑' : '↓'
  const cls =
    direction === 'up' ? 'dashboard-kpi-trend dashboard-kpi-trend-up' : 'dashboard-kpi-trend dashboard-kpi-trend-down'
  return (
    <span className={cls}>
      {arrow} {percent}%
    </span>
  )
}

export function DashboardSummaryCard({
  icon,
  label,
  value,
  subtitle,
  trendDirection,
  trendPercent,
  primary,
}: {
  icon: ReactNode
  label: string
  value: string | number
  subtitle: string
  trendDirection: TrendDirection
  trendPercent: number
  primary?: boolean
}) {
  return (
    <article className={`dashboard-kpi-card dashboard-kpi-card-rich ${primary ? 'dashboard-kpi-primary' : ''}`}>
      <div className="dashboard-kpi-card-top">
        <div className="dashboard-kpi-icon" aria-hidden>
          {icon}
        </div>
        <TrendBadge direction={trendDirection} percent={trendPercent} />
      </div>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{subtitle}</p>
    </article>
  )
}

export function DashboardSummaryCardSkeleton() {
  return (
    <article className="dashboard-kpi-card dashboard-kpi-card-rich dashboard-kpi-skeleton" aria-busy="true">
      <div className="dashboard-kpi-card-top">
        <div className="dashboard-kpi-skel-icon" />
        <div className="dashboard-kpi-skel-trend" />
      </div>
      <div className="dashboard-kpi-skel-line dashboard-kpi-skel-line-short" />
      <div className="dashboard-kpi-skel-line dashboard-kpi-skel-line-value" />
      <div className="dashboard-kpi-skel-line dashboard-kpi-skel-line-sub" />
    </article>
  )
}

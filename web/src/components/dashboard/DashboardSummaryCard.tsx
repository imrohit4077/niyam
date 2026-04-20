import type { ReactNode } from 'react'
import { formatTrendPercent } from './dashboardMetrics'

export function DashboardSummaryCard({
  label,
  value,
  subtitle,
  icon,
  trendPercent,
  trendLabel,
  invertTrendColors,
  highlight,
}: {
  label: string
  value: string | number
  subtitle?: string
  icon: ReactNode
  trendPercent: number
  trendLabel?: string
  invertTrendColors?: boolean
  highlight?: boolean
}) {
  const { direction, text, positiveOutcome } = formatTrendPercent(trendPercent, invertTrendColors)
  const trendClass =
    direction === 'flat'
      ? 'dashboard-summary-trend-flat'
      : positiveOutcome
        ? 'dashboard-summary-trend-up'
        : 'dashboard-summary-trend-down'
  const arrow = direction === 'flat' ? '→' : direction === 'up' ? '↑' : '↓'

  return (
    <article className={`dashboard-summary-card${highlight ? ' dashboard-summary-card-highlight' : ''}`}>
      <div className="dashboard-summary-card-top">
        <div className="dashboard-summary-icon" aria-hidden>
          {icon}
        </div>
        <div className={`dashboard-summary-trend ${trendClass}`} title={trendLabel}>
          <span className="dashboard-summary-trend-arrow">{arrow}</span>
          <span className="dashboard-summary-trend-pct">{text}</span>
        </div>
      </div>
      <span className="dashboard-summary-label">{label}</span>
      <strong className="dashboard-summary-value">{value}</strong>
      {subtitle ? <p className="dashboard-summary-sub">{subtitle}</p> : null}
    </article>
  )
}

export function DashboardPanelSkeleton({ chartHeight = 260 }: { chartHeight?: number }) {
  return (
    <div className="dashboard-skeleton-panel" aria-busy="true" aria-label="Loading">
      <div className="dashboard-skeleton-line dashboard-skeleton-line-short" />
      <div className="dashboard-skeleton-chart" style={{ height: chartHeight }} />
    </div>
  )
}

export function DashboardKpiRowSkeleton() {
  return (
    <div className="dashboard-summary-grid" aria-busy="true" aria-label="Loading summary">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="dashboard-summary-card dashboard-summary-card-skeleton">
          <div className="dashboard-skeleton-circle" />
          <div className="dashboard-skeleton-line dashboard-skeleton-line-medium" />
          <div className="dashboard-skeleton-line dashboard-skeleton-line-value" />
          <div className="dashboard-skeleton-line dashboard-skeleton-line-long" />
        </div>
      ))}
    </div>
  )
}

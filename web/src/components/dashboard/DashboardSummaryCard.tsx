import type { ReactNode } from 'react'

export type TrendDirection = 'up' | 'down' | 'flat' | 'neutral'

export type DashboardSummaryCardProps = {
  label: string
  value: string | number
  icon: ReactNode
  trend?: {
    direction: TrendDirection
    /** e.g. "+12%" or "—" */
    label: string
    hint?: string
  }
  loading?: boolean
  highlight?: boolean
}

function TrendBadge({ trend }: { trend: NonNullable<DashboardSummaryCardProps['trend']> }) {
  const { direction, label, hint } = trend
  const arrow = direction === 'up' ? '↑' : direction === 'down' ? '↓' : direction === 'flat' ? '→' : ''
  return (
    <div className="dashboard-summary-trend" title={hint}>
      <span
        className={`dashboard-summary-trend-arrow dashboard-summary-trend--${direction}`}
        aria-hidden
      >
        {arrow}
      </span>
      <span className="dashboard-summary-trend-label">{label}</span>
    </div>
  )
}

export function DashboardSummaryCard({
  label,
  value,
  icon,
  trend,
  loading,
  highlight,
}: DashboardSummaryCardProps) {
  return (
    <article
      className={`dashboard-summary-card${highlight ? ' dashboard-summary-card--primary' : ''}${loading ? ' dashboard-summary-card--loading' : ''}`}
    >
      <div className="dashboard-summary-card-top">
        <span className="dashboard-summary-icon" aria-hidden>
          {icon}
        </span>
        {trend && !loading ? <TrendBadge trend={trend} /> : null}
      </div>
      {loading ? (
        <>
          <div className="dashboard-skeleton dashboard-skeleton-line dashboard-skeleton-line--lg" />
          <div className="dashboard-skeleton dashboard-skeleton-line dashboard-skeleton-line--sm" />
        </>
      ) : (
        <>
          <strong className="dashboard-summary-value">{value}</strong>
          <span className="dashboard-summary-label">{label}</span>
        </>
      )}
    </article>
  )
}

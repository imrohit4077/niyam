import type { ReactNode } from 'react'

export type TrendDirection = 'up' | 'down' | 'flat'

export type DashboardSummaryCardProps = {
  label: string
  value: string | number
  icon: ReactNode
  trend?: {
    direction: TrendDirection
    label: string
  }
  footnote?: string
  primary?: boolean
  loading?: boolean
}

function TrendBadge({ direction, label }: { direction: TrendDirection; label: string }) {
  const arrow = direction === 'up' ? '↑' : direction === 'down' ? '↓' : '→'
  const cls =
    direction === 'up'
      ? 'dashboard-summary-trend dashboard-summary-trend--up'
      : direction === 'down'
        ? 'dashboard-summary-trend dashboard-summary-trend--down'
        : 'dashboard-summary-trend dashboard-summary-trend--flat'
  return (
    <span className={cls} title={label}>
      <span className="dashboard-summary-trend-arrow" aria-hidden>
        {arrow}
      </span>
      <span className="dashboard-summary-trend-text">{label}</span>
    </span>
  )
}

export default function DashboardSummaryCard({
  label,
  value,
  icon,
  trend,
  footnote,
  primary,
  loading,
}: DashboardSummaryCardProps) {
  return (
    <article className={`dashboard-summary-card${primary ? ' dashboard-summary-card--primary' : ''}`}>
      <span className="dashboard-summary-card-label">{label}</span>
      <div className="dashboard-summary-card-mid">
        <span className="dashboard-summary-card-icon" aria-hidden>
          {icon}
        </span>
        {trend && !loading ? <TrendBadge direction={trend.direction} label={trend.label} /> : null}
      </div>
      {loading ? (
        <>
          <div className="dashboard-skeleton dashboard-skeleton-line dashboard-skeleton-line--lg" />
          <div className="dashboard-skeleton dashboard-skeleton-line dashboard-skeleton-line--sm" />
        </>
      ) : (
        <>
          <strong className="dashboard-summary-card-value">{value}</strong>
          {footnote ? <p className="dashboard-summary-card-foot">{footnote}</p> : null}
        </>
      )}
    </article>
  )
}

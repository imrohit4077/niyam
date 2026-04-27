import type { ReactNode } from 'react'

export type TrendDirection = 'up' | 'down' | 'flat'

export type DashboardSummaryCardProps = {
  label: string
  value: string | number
  icon: ReactNode
  trend?: { direction: TrendDirection; percent: number } | null
  trendLabel?: string
  primary?: boolean
  loading?: boolean
}

function TrendBadge({ direction, percent, label }: { direction: TrendDirection; percent: number; label?: string }) {
  const arrow = direction === 'up' ? '↑' : direction === 'down' ? '↓' : '→'
  const abs = Math.abs(percent)
  const text =
    direction === 'flat' || abs < 0.05
      ? 'Flat'
      : `${arrow} ${abs.toFixed(abs >= 10 ? 0 : 1)}%`
  const cls =
    direction === 'up'
      ? 'dashboard-summary-trend dashboard-summary-trend--up'
      : direction === 'down'
        ? 'dashboard-summary-trend dashboard-summary-trend--down'
        : 'dashboard-summary-trend dashboard-summary-trend--flat'

  return (
    <span className={cls} title={label}>
      {text}
    </span>
  )
}

export function DashboardSummaryCard({
  label,
  value,
  icon,
  trend,
  trendLabel,
  primary,
  loading,
}: DashboardSummaryCardProps) {
  return (
    <article
      className={`dashboard-summary-card${primary ? ' dashboard-summary-card--primary' : ''}${loading ? ' dashboard-summary-card--loading' : ''}`}
    >
      <div className="dashboard-summary-card-top">
        <span className="dashboard-summary-icon" aria-hidden>
          {icon}
        </span>
        {!loading && trend ? <TrendBadge direction={trend.direction} percent={trend.percent} label={trendLabel} /> : null}
        {loading ? <span className="dashboard-summary-skeleton-trend" /> : null}
      </div>
      {loading ? (
        <>
          <span className="dashboard-summary-skeleton-value" />
          <span className="dashboard-summary-skeleton-label" />
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

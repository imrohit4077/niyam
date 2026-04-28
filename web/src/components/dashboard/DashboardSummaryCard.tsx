import type { ReactNode } from 'react'

export type SummaryTrend = {
  pct: number | null
  direction: 'up' | 'down' | 'flat'
  /** Short context, e.g. "vs last month" */
  periodLabel: string
}

type Props = {
  label: string
  value: string | number
  icon: ReactNode
  trend?: SummaryTrend | null
  loading?: boolean
  highlight?: boolean
}

function TrendBadge({ trend }: { trend: SummaryTrend }) {
  const { pct, direction, periodLabel } = trend
  if (pct === null) {
    const arrow = direction === 'up' ? '↑' : direction === 'down' ? '↓' : '→'
    const mod =
      direction === 'up'
        ? 'dashboard-summary-trend-up'
        : direction === 'down'
          ? 'dashboard-summary-trend-down'
          : 'dashboard-summary-trend-neutral'
    return (
      <span className={`dashboard-summary-trend ${mod}`} title={periodLabel}>
        <span className="dashboard-summary-trend-arrow">{arrow}</span>
        <span className="dashboard-summary-trend-pct">New</span>
        <span className="dashboard-summary-trend-period">{periodLabel}</span>
      </span>
    )
  }
  const arrow = direction === 'up' ? '↑' : direction === 'down' ? '↓' : '→'
  const mod =
    direction === 'up'
      ? 'dashboard-summary-trend-up'
      : direction === 'down'
        ? 'dashboard-summary-trend-down'
        : 'dashboard-summary-trend-neutral'
  return (
    <span className={`dashboard-summary-trend ${mod}`} title={`${pct > 0 ? '+' : ''}${pct}% ${periodLabel}`}>
      <span className="dashboard-summary-trend-arrow">{arrow}</span>
      <span className="dashboard-summary-trend-pct">{Math.abs(pct)}%</span>
      <span className="dashboard-summary-trend-period">{periodLabel}</span>
    </span>
  )
}

export function DashboardSummaryCard({ label, value, icon, trend, loading, highlight }: Props) {
  return (
    <article
      className={`dashboard-summary-card${highlight ? ' dashboard-summary-card-highlight' : ''}${loading ? ' dashboard-summary-card-skeleton' : ''}`}
    >
      {loading ? (
        <>
          <div className="dashboard-summary-skeleton-row">
            <span className="dashboard-summary-skeleton-icon" />
            <span className="dashboard-summary-skeleton-label" />
          </div>
          <span className="dashboard-summary-skeleton-value" />
          <span className="dashboard-summary-skeleton-trend" />
        </>
      ) : (
        <>
          <div className="dashboard-summary-top">
            <span className="dashboard-summary-icon" aria-hidden>
              {icon}
            </span>
            <span className="dashboard-summary-label">{label}</span>
          </div>
          <strong className="dashboard-summary-value">{value}</strong>
          {trend ? <TrendBadge trend={trend} /> : null}
        </>
      )}
    </article>
  )
}

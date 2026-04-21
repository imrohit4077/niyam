import type { ReactNode } from 'react'

export type TrendDirection = 'up' | 'down' | 'flat'

export type SummaryKpiCardProps = {
  label: string
  value: string | number
  icon: ReactNode
  trendPercent: number | null
  trendDirection: TrendDirection
  trendLabel?: string
  loading?: boolean
  emphasize?: boolean
}

function TrendBadge({ percent, direction, label }: { percent: number | null; direction: TrendDirection; label?: string }) {
  if (percent == null || !Number.isFinite(percent)) {
    return (
      <span className="dashboard-kpi-trend dashboard-kpi-trend-muted" title={label}>
        —
      </span>
    )
  }
  const arrow = direction === 'up' ? '↑' : direction === 'down' ? '↓' : '→'
  const sign = percent > 0 ? '+' : ''
  return (
    <span
      className={`dashboard-kpi-trend dashboard-kpi-trend-${direction}`}
      title={label ?? 'Change vs prior 30 days'}
    >
      {arrow} {sign}
      {Math.abs(percent)}%
    </span>
  )
}

export function SummaryKpiCard({
  label,
  value,
  icon,
  trendPercent,
  trendDirection,
  trendLabel,
  loading,
  emphasize,
}: SummaryKpiCardProps) {
  return (
    <article className={`dashboard-kpi-card dashboard-kpi-summary ${emphasize ? 'dashboard-kpi-primary' : ''}`}>
      <div className="dashboard-kpi-summary-top">
        <span className="dashboard-kpi-icon" aria-hidden>
          {icon}
        </span>
        {!loading && <TrendBadge percent={trendPercent} direction={trendDirection} label={trendLabel} />}
      </div>
      <div className="dashboard-kpi-summary-label">{label}</div>
      {loading ? (
        <div className="dashboard-skeleton dashboard-skeleton-kpi-value" aria-hidden />
      ) : (
        <strong>{value}</strong>
      )}
    </article>
  )
}

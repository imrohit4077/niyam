import type { ReactNode } from 'react'
import type { TrendDirection } from './trendFromDelta'

function TrendBadge({ direction, pct }: { direction: TrendDirection; pct: number | null }) {
  if (pct === null) {
    return <span className="dashboard-kpi-trend dashboard-kpi-trend-muted">—</span>
  }
  const arrow = direction === 'up' ? '↑' : direction === 'down' ? '↓' : '→'
  const tone =
    direction === 'up' ? 'dashboard-kpi-trend-up' : direction === 'down' ? 'dashboard-kpi-trend-down' : 'dashboard-kpi-trend-flat'
  return (
    <span className={`dashboard-kpi-trend ${tone}`}>
      {arrow} {direction === 'flat' ? '0%' : `${pct}%`}
    </span>
  )
}

export function SummaryStatCard({
  icon,
  label,
  value,
  trendDirection,
  trendPct,
  subtitle,
  primary,
  loading,
}: {
  icon: ReactNode
  label: string
  value: string | number
  trendDirection: TrendDirection
  trendPct: number | null
  subtitle?: string
  primary?: boolean
  loading?: boolean
}) {
  return (
    <article className={`dashboard-kpi-card ${primary ? 'dashboard-kpi-primary' : ''} ${loading ? 'dashboard-kpi-card-skeleton' : ''}`}>
      <div className="dashboard-kpi-card-top">
        <span className="dashboard-kpi-icon" aria-hidden>
          {icon}
        </span>
        {loading ? (
          <span className="dashboard-kpi-trend dashboard-kpi-trend-muted">…</span>
        ) : (
          <TrendBadge direction={trendDirection} pct={trendPct} />
        )}
      </div>
      <span>{label}</span>
      {loading ? <div className="dashboard-skeleton-line dashboard-skeleton-line-lg" /> : <strong>{value}</strong>}
      {subtitle && !loading ? <p>{subtitle}</p> : loading ? <div className="dashboard-skeleton-line dashboard-skeleton-line-sm" /> : null}
    </article>
  )
}

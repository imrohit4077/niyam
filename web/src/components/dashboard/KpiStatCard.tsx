import type { ReactNode } from 'react'

type TrendDirection = 'up' | 'down' | 'flat'

export type KpiStatCardProps = {
  label: string
  value: string | number
  icon: ReactNode
  trendPct?: number | null
  trendDirection?: TrendDirection
  sublabel?: string
  primary?: boolean
  loading?: boolean
}

function TrendBadge({ pct, direction }: { pct: number; direction: TrendDirection }) {
  const arrow = direction === 'up' ? '↑' : direction === 'down' ? '↓' : '→'
  const sign = pct > 0 ? '+' : ''
  const cls =
    direction === 'up'
      ? 'dashboard-kpi-trend dashboard-kpi-trend--up'
      : direction === 'down'
        ? 'dashboard-kpi-trend dashboard-kpi-trend--down'
        : 'dashboard-kpi-trend dashboard-kpi-trend--flat'
  return (
    <span className={cls} title="Compared to the prior period">
      {arrow} {sign}
      {Math.abs(pct)}%
    </span>
  )
}

export function KpiStatCard({
  label,
  value,
  icon,
  trendPct,
  trendDirection = 'flat',
  sublabel,
  primary,
  loading,
}: KpiStatCardProps) {
  const showTrend = trendPct != null && !loading && trendDirection !== 'flat'
  const showFlat = trendPct === 0 && !loading

  return (
    <article className={`dashboard-kpi-card dashboard-kpi-stat ${primary ? 'dashboard-kpi-primary' : ''}`}>
      <div className="dashboard-kpi-stat-head">
        <span className="dashboard-kpi-icon" aria-hidden>
          {icon}
        </span>
        <span className="dashboard-kpi-stat-label">{label}</span>
      </div>
      {loading ? (
        <div className="dashboard-kpi-skeleton-block" aria-busy="true" aria-label="Loading" />
      ) : (
        <>
          <div className="dashboard-kpi-stat-value-row">
            <strong className="dashboard-kpi-stat-value">{value}</strong>
            {showTrend && trendPct != null ? <TrendBadge pct={trendPct} direction={trendDirection} /> : null}
            {showFlat ? (
              <span className="dashboard-kpi-trend dashboard-kpi-trend--flat" title="Compared to the prior period">
                → 0%
              </span>
            ) : null}
          </div>
          {sublabel ? <p className="dashboard-kpi-stat-sublabel">{sublabel}</p> : null}
        </>
      )}
    </article>
  )
}

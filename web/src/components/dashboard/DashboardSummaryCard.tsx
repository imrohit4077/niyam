import type { ReactNode } from 'react'

export type TrendDirection = 'up' | 'down' | 'flat'

export type DashboardSummaryCardProps = {
  label: string
  value: string | number
  hint?: string
  icon: ReactNode
  trendPct: number | null
  trendDirection: TrendDirection
  trendContext?: string
  primary?: boolean
}

function formatTrendPct(direction: TrendDirection, pct: number | null) {
  if (pct == null || direction === 'flat') return '—'
  const sign = direction === 'up' ? '↑' : '↓'
  return `${sign} ${Math.abs(pct)}%`
}

export function DashboardSummaryCard({
  label,
  value,
  hint,
  icon,
  trendPct,
  trendDirection,
  trendContext = 'vs last month',
  primary,
}: DashboardSummaryCardProps) {
  const trendClass =
    trendDirection === 'up'
      ? 'dashboard-summary-trend--up'
      : trendDirection === 'down'
        ? 'dashboard-summary-trend--down'
        : 'dashboard-summary-trend--flat'

  return (
    <article className={`dashboard-summary-card${primary ? ' dashboard-summary-card--primary' : ''}`}>
      <div className="dashboard-summary-card-top">
        <div className="dashboard-summary-icon" aria-hidden>
          {icon}
        </div>
        <span className="dashboard-summary-label">{label}</span>
      </div>
      <strong className="dashboard-summary-value">{value}</strong>
      <div className={`dashboard-summary-trend ${trendClass}`}>
        <span className="dashboard-summary-trend-pct">{formatTrendPct(trendDirection, trendPct)}</span>
        <span className="dashboard-summary-trend-note">{trendContext}</span>
      </div>
      {hint ? <p className="dashboard-summary-hint">{hint}</p> : null}
    </article>
  )
}

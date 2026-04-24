import type { ReactNode } from 'react'

export type TrendDirection = 'up' | 'down' | 'flat'

export type SummaryStatCardProps = {
  label: string
  value: string | number
  icon: ReactNode
  trendPercent: number | null
  trendDirection: TrendDirection
  sublabel?: string
  primary?: boolean
}

function formatTrendPercent(pct: number | null, direction: TrendDirection) {
  if (pct == null || direction === 'flat') return '—'
  const sign = pct > 0 ? '+' : ''
  return `${sign}${pct}%`
}

export default function SummaryStatCard({
  label,
  value,
  icon,
  trendPercent,
  trendDirection,
  sublabel,
  primary,
}: SummaryStatCardProps) {
  const arrow = trendDirection === 'up' ? '↑' : trendDirection === 'down' ? '↓' : '→'
  const trendClass =
    trendDirection === 'up'
      ? 'dashboard-kpi-trend--up'
      : trendDirection === 'down'
        ? 'dashboard-kpi-trend--down'
        : 'dashboard-kpi-trend--flat'

  return (
    <article className={`dashboard-kpi-card${primary ? ' dashboard-kpi-primary' : ''}`}>
      <div className="dashboard-kpi-card-top">
        <span className="dashboard-kpi-label">{label}</span>
        <span className="dashboard-kpi-icon" aria-hidden>
          {icon}
        </span>
      </div>
      <strong>{value}</strong>
      <div className="dashboard-kpi-card-bottom">
        <span className={`dashboard-kpi-trend ${trendClass}`} title="Compared to prior period">
          <span className="dashboard-kpi-trend-arrow" aria-hidden>
            {arrow}
          </span>
          {formatTrendPercent(trendPercent, trendDirection)}
        </span>
        {sublabel ? <p>{sublabel}</p> : null}
      </div>
    </article>
  )
}

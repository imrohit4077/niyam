import type { ReactNode } from 'react'

type SummaryStatCardProps = {
  label: string
  value: string | number
  icon: ReactNode
  trendPercent: number | null
  trendLabel?: string
  primary?: boolean
}

export function SummaryStatCard({ label, value, icon, trendPercent, trendLabel, primary }: SummaryStatCardProps) {
  let arrow: '↑' | '↓' | '—' = '—'
  let pctText = '0%'
  let trendMod = 'dashboard-stat-trend-neutral'

  if (trendPercent === null) {
    arrow = '—'
    pctText = '—'
  } else if (trendPercent > 0) {
    arrow = '↑'
    pctText = `${trendPercent}%`
    trendMod = 'dashboard-stat-trend-up'
  } else if (trendPercent < 0) {
    arrow = '↓'
    pctText = `${Math.abs(trendPercent)}%`
    trendMod = 'dashboard-stat-trend-down'
  }

  return (
    <article className={`dashboard-stat-card ${primary ? 'dashboard-stat-card-primary' : ''}`}>
      <div className="dashboard-stat-card-top">
        <span className="dashboard-stat-icon" aria-hidden>
          {icon}
        </span>
        <span className={`dashboard-stat-trend ${trendMod}`} title="vs prior 30 days">
          <span className="dashboard-stat-trend-arrow">{arrow}</span>
          <span className="dashboard-stat-trend-pct">{pctText}</span>
        </span>
      </div>
      <strong className="dashboard-stat-value">{value}</strong>
      <span className="dashboard-stat-label">{label}</span>
      {trendLabel ? <p className="dashboard-stat-caption">{trendLabel}</p> : null}
    </article>
  )
}

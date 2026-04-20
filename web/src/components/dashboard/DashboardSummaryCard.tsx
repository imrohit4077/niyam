import type { ReactNode } from 'react'

export type SummaryTrend = {
  /** Percentage change vs comparison period (can exceed ±100). */
  pct: number
  label: string
}

type Props = {
  label: string
  value: string | number
  icon: ReactNode
  trend?: SummaryTrend | null
  highlight?: boolean
}

function TrendBlock({ trend }: { trend: SummaryTrend }) {
  const { pct, label } = trend
  const flat = pct === 0 || Number.isNaN(pct)
  const up = pct > 0
  const arrow = flat ? '→' : up ? '↑' : '↓'
  const sign = flat ? '' : up ? '+' : ''
  const pctLabel = flat ? '0%' : `${sign}${pct}%`
  const toneClass = flat ? 'dashboard-summary-trend--flat' : up ? 'dashboard-summary-trend--up' : 'dashboard-summary-trend--down'

  return (
    <div className={`dashboard-summary-trend ${toneClass}`} title={label}>
      <span className="dashboard-summary-trend-arrow" aria-hidden>
        {arrow}
      </span>
      <span className="dashboard-summary-trend-pct">{pctLabel}</span>
      <span className="dashboard-summary-trend-caption">{label}</span>
    </div>
  )
}

export function DashboardSummaryCard({ label, value, icon, trend, highlight }: Props) {
  return (
    <article className={`dashboard-summary-card${highlight ? ' dashboard-summary-card--primary' : ''}`}>
      <div className="dashboard-summary-card-top">
        <div className="dashboard-summary-icon" aria-hidden>
          {icon}
        </div>
      </div>
      <span className="dashboard-summary-label">{label}</span>
      <strong className="dashboard-summary-value">{value}</strong>
      {trend ? <TrendBlock trend={trend} /> : null}
    </article>
  )
}

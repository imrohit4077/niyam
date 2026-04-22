import type { ReactNode } from 'react'

export type DashboardKpiTrend = {
  current: number
  previous: number
  /** When true, a decrease is shown as "good" (e.g. time-to-fill). */
  invert?: boolean
}

function TrendBadge({ current, previous, invert }: DashboardKpiTrend) {
  if (previous === 0 && current === 0) {
    return <span className="dashboard-kpi-trend dashboard-kpi-trend-neutral">—</span>
  }
  let pct: number
  if (previous === 0) {
    pct = current > 0 ? 100 : 0
  } else {
    pct = Math.round(((current - previous) / previous) * 100)
  }
  const up = pct > 0
  const flat = pct === 0
  const good = invert ? !up : up
  let cls = 'dashboard-kpi-trend '
  if (flat) cls += 'dashboard-kpi-trend-neutral'
  else if (good) cls += 'dashboard-kpi-trend-good'
  else cls += 'dashboard-kpi-trend-bad'

  return (
    <span className={cls} title="Compared to the previous 30-day period">
      {flat ? '→' : up ? '↑' : '↓'} {Math.abs(pct)}%
    </span>
  )
}

type Props = {
  label: string
  value: ReactNode
  icon: ReactNode
  trend?: DashboardKpiTrend | null
  subtitle?: string
  primary?: boolean
}

export default function DashboardSummaryCard({ label, value, icon, trend, subtitle, primary }: Props) {
  return (
    <article className={`dashboard-kpi-card dashboard-summary-card${primary ? ' dashboard-kpi-primary' : ''}`}>
      <div className="dashboard-summary-card-top">
        <span className="dashboard-summary-icon" aria-hidden>
          {icon}
        </span>
        {trend != null ? <TrendBadge {...trend} /> : null}
      </div>
      <span>{label}</span>
      <strong>{value}</strong>
      {subtitle ? <p>{subtitle}</p> : null}
    </article>
  )
}

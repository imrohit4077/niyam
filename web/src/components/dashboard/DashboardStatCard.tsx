import type { ReactNode } from 'react'

type Trend = {
  pct: number
  /** When true, higher values are "good" (green up); when false, invert colors for up */
  upIsGood?: boolean
}

function TrendBadge({ pct, upIsGood = true }: Trend) {
  if (pct === 0) {
    return <span className="dashboard-kpi-trend dashboard-kpi-trend-neutral">0%</span>
  }
  const up = pct > 0
  const arrow = up ? '↑' : '↓'
  const positive = up === upIsGood
  const cls = positive ? 'dashboard-kpi-trend-pos' : 'dashboard-kpi-trend-neg'
  return (
    <span className={`dashboard-kpi-trend ${cls}`}>
      {arrow} {Math.abs(pct)}%
    </span>
  )
}

type Props = {
  title: string
  value: ReactNode
  icon: ReactNode
  subtitle?: string
  trend?: Trend
  trendLabel?: string
  primary?: boolean
}

export function DashboardStatCard({ title, value, icon, subtitle, trend, trendLabel = 'vs prior month', primary }: Props) {
  return (
    <article className={`dashboard-kpi-card dashboard-kpi-stat ${primary ? 'dashboard-kpi-primary' : ''}`.trim()}>
      <div className="dashboard-kpi-stat-top">
        <span className="dashboard-kpi-icon" aria-hidden>
          {icon}
        </span>
        <span className="dashboard-kpi-card-label">{title}</span>
      </div>
      <strong className="dashboard-kpi-value">{value}</strong>
      <div className="dashboard-kpi-stat-foot">
        {subtitle ? <p>{subtitle}</p> : <p className="dashboard-kpi-stat-foot-spacer" />}
        {trend !== undefined ? (
          <div className="dashboard-kpi-trend-wrap">
            <TrendBadge pct={trend.pct} upIsGood={trend.upIsGood} />
            <span className="dashboard-kpi-trend-hint">{trendLabel}</span>
          </div>
        ) : null}
      </div>
    </article>
  )
}

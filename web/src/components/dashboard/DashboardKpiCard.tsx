import type { ReactNode } from 'react'

export type KpiTrend = {
  direction: 'up' | 'down' | 'flat'
  /** Whole percent vs comparison period (e.g. 12 means +12%). */
  percent: number
  /** Short label shown under the trend (e.g. "vs last month"). */
  caption?: string
}

type Props = {
  label: string
  value: number | string
  icon: ReactNode
  trend?: KpiTrend | null
  sublabel?: string
  primary?: boolean
  loading?: boolean
}

function TrendBadge({ trend }: { trend: KpiTrend }) {
  const arrow = trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'
  const sign = trend.percent > 0 ? '+' : ''
  const pct = `${sign}${trend.percent}%`
  const cls =
    trend.direction === 'up'
      ? 'dashboard-kpi-trend dashboard-kpi-trend--up'
      : trend.direction === 'down'
        ? 'dashboard-kpi-trend dashboard-kpi-trend--down'
        : 'dashboard-kpi-trend dashboard-kpi-trend--flat'

  return (
    <span className={cls} title={trend.caption}>
      <span className="dashboard-kpi-trend-arrow" aria-hidden>
        {arrow}
      </span>
      <span className="dashboard-kpi-trend-pct">{pct}</span>
      {trend.caption ? <span className="dashboard-kpi-trend-cap">{trend.caption}</span> : null}
    </span>
  )
}

export function DashboardKpiCard({ label, value, icon, trend, sublabel, primary, loading }: Props) {
  const rootClass = primary ? 'dashboard-kpi-card dashboard-kpi-card--rich dashboard-kpi-primary' : 'dashboard-kpi-card dashboard-kpi-card--rich'

  if (loading) {
    return (
      <article className={`${rootClass} dashboard-kpi-card--skeleton`} aria-busy="true">
        <div className="dashboard-kpi-card-top">
          <span className="dashboard-kpi-icon dashboard-skeleton dashboard-skeleton--icon" />
          <span className="dashboard-skeleton dashboard-skeleton--trend" />
        </div>
        <span className="dashboard-skeleton dashboard-skeleton--label" />
        <span className="dashboard-skeleton dashboard-skeleton--value" />
        <span className="dashboard-skeleton dashboard-skeleton--sub" />
      </article>
    )
  }

  return (
    <article className={rootClass}>
      <div className="dashboard-kpi-card-top">
        <span className="dashboard-kpi-icon" aria-hidden>
          {icon}
        </span>
        {trend ? <TrendBadge trend={trend} /> : null}
      </div>
      <span className="dashboard-kpi-card-label">{label}</span>
      <strong className="dashboard-kpi-card-value">{value}</strong>
      {sublabel ? <p className="dashboard-kpi-card-sub">{sublabel}</p> : null}
    </article>
  )
}

import type { ReactNode } from 'react'

export type DashboardTrend = {
  direction: 'up' | 'down' | 'flat' | 'new'
  /** Display string, e.g. "12%" or "—" */
  label: string
  /** Screen-reader hint */
  hint: string
}

type Props = {
  title: string
  value: string | number
  subtitle?: string
  icon: ReactNode
  trend?: DashboardTrend
  primary?: boolean
  loading?: boolean
}

function TrendBadge({ trend }: { trend: DashboardTrend }) {
  const arrow = trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : trend.direction === 'new' ? '★' : '→'
  const mod =
    trend.direction === 'up'
      ? 'dashboard-kpi-trend--up'
      : trend.direction === 'down'
        ? 'dashboard-kpi-trend--down'
        : trend.direction === 'new'
          ? 'dashboard-kpi-trend--new'
          : 'dashboard-kpi-trend--flat'

  return (
    <span className={`dashboard-kpi-trend ${mod}`} title={trend.hint}>
      <span className="dashboard-kpi-trend-arrow" aria-hidden>
        {arrow}
      </span>
      <span className="dashboard-kpi-trend-label">{trend.label}</span>
    </span>
  )
}

export function DashboardSummaryCardSkeleton() {
  return (
    <article className="dashboard-kpi-card dashboard-kpi-card--skeleton" aria-busy="true">
      <span className="dashboard-kpi-skel dashboard-kpi-skel-icon" />
      <span className="dashboard-kpi-skel dashboard-kpi-skel-line" />
      <span className="dashboard-kpi-skel dashboard-kpi-skel-value" />
      <span className="dashboard-kpi-skel dashboard-kpi-skel-sub" />
    </article>
  )
}

export function DashboardSummaryCard({ title, value, subtitle, icon, trend, primary, loading }: Props) {
  if (loading) {
    return <DashboardSummaryCardSkeleton />
  }

  return (
    <article className={`dashboard-kpi-card ${primary ? 'dashboard-kpi-primary' : ''}`}>
      <div className="dashboard-kpi-card-top">
        <span className="dashboard-kpi-icon" aria-hidden>
          {icon}
        </span>
        {trend ? <TrendBadge trend={trend} /> : null}
      </div>
      <span className="dashboard-kpi-card-title">{title}</span>
      <strong className="dashboard-kpi-card-value">{value}</strong>
      {subtitle ? <p className="dashboard-kpi-card-sub">{subtitle}</p> : null}
    </article>
  )
}

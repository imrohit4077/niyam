import type { ReactNode } from 'react'

export type SummaryTrend = {
  direction: 'up' | 'down' | 'flat'
  pct: number
  label?: string
}

type Props = {
  label: string
  value: string | number
  icon: ReactNode
  trend?: SummaryTrend | null
  subtitle?: string
  highlight?: boolean
  loading?: boolean
}

function TrendBadge({ trend }: { trend: SummaryTrend }) {
  const arrow = trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'
  const pctText = trend.pct === 0 && trend.direction === 'flat' ? '0%' : `${trend.pct}%`
  const mod =
    trend.direction === 'up'
      ? 'dashboard-kpi-trend-up'
      : trend.direction === 'down'
        ? 'dashboard-kpi-trend-down'
        : 'dashboard-kpi-trend-flat'
  return (
    <span className={`dashboard-kpi-trend ${mod}`} title={trend.label}>
      {arrow} {pctText}
    </span>
  )
}

export default function DashboardSummaryCard({ label, value, icon, trend, subtitle, highlight, loading }: Props) {
  return (
    <article className={`dashboard-kpi-card dashboard-kpi-summary ${highlight ? 'dashboard-kpi-primary' : ''}`}>
      <div className="dashboard-kpi-summary-top">
        <span className="dashboard-kpi-icon" aria-hidden>
          {icon}
        </span>
        {!loading && trend && <TrendBadge trend={trend} />}
      </div>
      <span>{label}</span>
      {loading ? (
        <div className="dashboard-skeleton dashboard-skeleton-kpi-value" />
      ) : (
        <strong>{value}</strong>
      )}
      {loading ? <div className="dashboard-skeleton dashboard-skeleton-kpi-sub" /> : subtitle ? <p>{subtitle}</p> : <p className="dashboard-kpi-spacer">&nbsp;</p>}
    </article>
  )
}

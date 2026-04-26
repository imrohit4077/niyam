import type { ReactNode } from 'react'

export function DashboardSummaryCard({
  icon,
  label,
  value,
  trendPct,
  subtitle,
  primary,
}: {
  icon: ReactNode
  label: string
  value: string | number
  trendPct: number | null
  subtitle?: string
  primary?: boolean
}) {
  const trendClass =
    trendPct === null
      ? 'dashboard-kpi-trend-neutral'
      : trendPct > 0
        ? 'dashboard-kpi-trend-up'
        : trendPct < 0
          ? 'dashboard-kpi-trend-down'
          : 'dashboard-kpi-trend-neutral'

  return (
    <article className={`dashboard-kpi-card dashboard-kpi-summary ${primary ? 'dashboard-kpi-primary' : ''}`}>
      <div className="dashboard-kpi-summary-top">
        <span className="dashboard-kpi-icon" aria-hidden>
          {icon}
        </span>
        <span className="dashboard-kpi-summary-label">{label}</span>
      </div>
      <div className="dashboard-kpi-summary-value-row">
        <strong>{value}</strong>
        <span className={`dashboard-kpi-trend ${trendClass}`} title="Vs prior 30 days (where applicable)">
          {trendPct === null ? '—' : `${trendPct > 0 ? '↑' : trendPct < 0 ? '↓' : '→'} ${Math.abs(trendPct)}%`}
        </span>
      </div>
      {subtitle ? <p>{subtitle}</p> : null}
    </article>
  )
}

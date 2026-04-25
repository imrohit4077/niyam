import type { ReactNode } from 'react'
import type { TrendResult } from './dashboardUtils'

function TrendBadge({ trend }: { trend: TrendResult }) {
  const sym = trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'
  const cls =
    trend.direction === 'up'
      ? 'dashboard-kpi-trend dashboard-kpi-trend-up'
      : trend.direction === 'down'
        ? 'dashboard-kpi-trend dashboard-kpi-trend-down'
        : 'dashboard-kpi-trend dashboard-kpi-trend-flat'
  const pctLabel = trend.direction === 'flat' ? '0%' : `${trend.percent}%`
  return (
    <span className={cls} title={trend.periodLabel}>
      {sym} {pctLabel}
    </span>
  )
}

export type SummaryKpiItem = {
  id: string
  label: string
  value: string | number
  icon: ReactNode
  trend: TrendResult
  sublabel?: string
}

export function DashboardSummaryCardsSkeleton() {
  return (
    <div className="dashboard-summary-grid" aria-busy="true">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="dashboard-summary-card dashboard-summary-card-skeleton">
          <span className="dashboard-summary-skel-icon" />
          <span className="dashboard-summary-skel-line dashboard-summary-skel-line-short" />
          <span className="dashboard-summary-skel-line dashboard-summary-skel-line-value" />
          <span className="dashboard-summary-skel-line dashboard-summary-skel-line-tiny" />
        </div>
      ))}
    </div>
  )
}

export function DashboardSummaryCards({ items }: { items: SummaryKpiItem[] }) {
  return (
    <div className="dashboard-summary-grid">
      {items.map(item => (
        <article key={item.id} className="dashboard-summary-card">
          <div className="dashboard-summary-card-top">
            <span className="dashboard-summary-icon" aria-hidden>
              {item.icon}
            </span>
            <span className="dashboard-summary-label">{item.label}</span>
          </div>
          <div className="dashboard-summary-value-row">
            <strong className="dashboard-summary-value">{item.value}</strong>
            <TrendBadge trend={item.trend} />
          </div>
          {item.sublabel ? <p className="dashboard-summary-sublabel">{item.sublabel}</p> : null}
        </article>
      ))}
    </div>
  )
}

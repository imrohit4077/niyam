import type { ReactNode } from 'react'

type TrendDirection = 'up' | 'down' | 'flat'

const ARROW: Record<TrendDirection, string> = {
  up: '↑',
  down: '↓',
  flat: '—',
}

export function DashboardKpiCard({
  label,
  value,
  icon,
  direction,
  pct,
  sublabel,
  primary,
}: {
  label: string
  value: string | number
  icon: ReactNode
  direction: TrendDirection
  pct: number | null
  sublabel: string
  primary?: boolean
}) {
  return (
    <article className={`dashboard-kpi-card${primary ? ' dashboard-kpi-primary' : ''}`}>
      <div className="dashboard-kpi-card-top">
        <span className="dashboard-kpi-card-label">{label}</span>
        <span className="dashboard-kpi-icon-wrap" aria-hidden>
          {icon}
        </span>
      </div>
      <strong>{value}</strong>
      <p className={`dashboard-kpi-trend dashboard-kpi-trend--${direction}`}>
        <span className="dashboard-kpi-trend-icon">{ARROW[direction]}</span>
        {pct == null ? (
          <span className="dashboard-kpi-trend-pct">—</span>
        ) : (
          <span className="dashboard-kpi-trend-pct">{pct}%</span>
        )}
        <span className="dashboard-kpi-trend-sub">{sublabel}</span>
      </p>
    </article>
  )
}

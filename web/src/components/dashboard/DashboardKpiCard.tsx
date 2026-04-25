import type { ReactNode } from 'react'

export type DashboardTrend = {
  current: number
  previous: number
}

function trendDisplay(t: DashboardTrend | null): { arrow: string; pctLabel: string; positive: boolean | null } {
  if (t == null) return { arrow: '', pctLabel: '', positive: null }
  const { current, previous } = t
  if (previous === 0 && current === 0) return { arrow: '', pctLabel: '—', positive: null }
  if (previous === 0) return { arrow: '↑', pctLabel: 'New', positive: true }
  const pct = Math.round(((current - previous) / previous) * 100)
  const arrow = current > previous ? '↑' : current < previous ? '↓' : '→'
  return { arrow, pctLabel: `${pct > 0 ? '+' : ''}${pct}%`, positive: current > previous ? true : current < previous ? false : null }
}

export function DashboardKpiCard({
  icon,
  label,
  value,
  subtitle,
  trend,
  highlight,
}: {
  icon: ReactNode
  label: string
  value: string | number
  subtitle?: string
  trend: DashboardTrend | null
  highlight?: boolean
}) {
  const td = trendDisplay(trend)
  return (
    <article className={`dashboard-kpi-card dashboard-kpi-stat${highlight ? ' dashboard-kpi-primary' : ''}`}>
      <div className="dashboard-kpi-card-head">
        <span className="dashboard-kpi-icon" aria-hidden>
          {icon}
        </span>
        <span className="dashboard-kpi-label">{label}</span>
      </div>
      <strong className="dashboard-kpi-value">{value}</strong>
      <div className="dashboard-kpi-footer">
        {subtitle ? <p className="dashboard-kpi-subtitle">{subtitle}</p> : <p className="dashboard-kpi-subtitle">&nbsp;</p>}
        {td.pctLabel && (
          <span
            className={
              td.positive === true
                ? 'dashboard-kpi-trend dashboard-kpi-trend--up'
                : td.positive === false
                  ? 'dashboard-kpi-trend dashboard-kpi-trend--down'
                  : 'dashboard-kpi-trend dashboard-kpi-trend--flat'
            }
            title="Compared to the prior 14-day period"
          >
            {td.arrow} {td.pctLabel}
          </span>
        )}
      </div>
    </article>
  )
}

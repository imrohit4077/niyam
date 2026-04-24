import type { ReactNode } from 'react'
import type { TrendDir } from './dashboardUtils'
import { formatTrendLabel } from './dashboardUtils'

type Props = {
  label: string
  value: string | number
  icon: ReactNode
  trendDir: TrendDir
  trendPct: number | null
  subtitle?: string
  primary?: boolean
}

export function DashboardSummaryCard({ label, value, icon, trendDir, trendPct, subtitle, primary }: Props) {
  const trendText = formatTrendLabel(trendDir, trendPct)
  const trendClass =
    trendDir === 'up'
      ? 'dashboard-kpi-trend--up'
      : trendDir === 'down'
        ? 'dashboard-kpi-trend--down'
        : 'dashboard-kpi-trend--flat'

  return (
    <article className={`dashboard-kpi-card${primary ? ' dashboard-kpi-primary' : ''}`}>
      <div className="dashboard-kpi-card-top">
        <span className="dashboard-kpi-icon" aria-hidden>
          {icon}
        </span>
        <span className="dashboard-kpi-label">{label}</span>
      </div>
      <strong className="dashboard-kpi-value">{value}</strong>
      <div className="dashboard-kpi-card-bottom">
        <span className={`dashboard-kpi-trend ${trendClass}`}>{trendText}</span>
        {subtitle ? <p className="dashboard-kpi-subtitle">{subtitle}</p> : null}
      </div>
    </article>
  )
}

import type { PeriodTrend } from './dashboardMetrics'

export type SummaryMetric = {
  id: string
  label: string
  value: string | number
  icon: string
  trend: PeriodTrend
  hint?: string
}

type Props = {
  metrics: SummaryMetric[]
  loading?: boolean
}

function TrendBadge({ trend }: { trend: PeriodTrend }) {
  const arrow = trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'
  const cls =
    trend.direction === 'up'
      ? 'dashboard-kpi-trend--up'
      : trend.direction === 'down'
        ? 'dashboard-kpi-trend--down'
        : 'dashboard-kpi-trend--flat'
  return (
    <span className={`dashboard-kpi-trend ${cls}`} title="Vs prior 30 days">
      <span className="dashboard-kpi-trend-arrow" aria-hidden>
        {arrow}
      </span>
      {trend.pctLabel}
    </span>
  )
}

function KpiSkeletonCard() {
  return (
    <article className="dashboard-kpi-card dashboard-kpi-card--skeleton" aria-hidden>
      <span className="dashboard-kpi-skel dashboard-kpi-skel--label" />
      <span className="dashboard-kpi-skel dashboard-kpi-skel--value" />
      <span className="dashboard-kpi-skel dashboard-kpi-skel--hint" />
    </article>
  )
}

export function DashboardSummaryCards({ metrics, loading }: Props) {
  if (loading) {
    return (
      <div className="dashboard-kpi-grid dashboard-kpi-grid--four">
        {Array.from({ length: 4 }, (_, i) => (
          <KpiSkeletonCard key={i} />
        ))}
      </div>
    )
  }

  return (
    <div className="dashboard-kpi-grid dashboard-kpi-grid--four">
      {metrics.map((m, idx) => (
        <article key={m.id} className={`dashboard-kpi-card ${idx === 0 ? 'dashboard-kpi-primary' : ''}`}>
          <div className="dashboard-kpi-card-top">
            <span className="dashboard-kpi-icon" aria-hidden>
              {m.icon}
            </span>
            <span>{m.label}</span>
          </div>
          <strong>{m.value}</strong>
          <div className="dashboard-kpi-footer">
            <TrendBadge trend={m.trend} />
            {m.hint ? <p>{m.hint}</p> : null}
          </div>
        </article>
      ))}
    </div>
  )
}

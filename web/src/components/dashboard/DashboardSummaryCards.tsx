import type { SummaryKpi } from './dashboardTypes'

function KpiIcon({ name }: { name: SummaryKpi['icon'] }) {
  const common = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6 }
  switch (name) {
    case 'briefcase':
      return (
        <svg {...common} aria-hidden>
          <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <rect x="3" y="7" width="18" height="13" rx="2" />
          <path d="M3 12h18" />
        </svg>
      )
    case 'calendar':
      return (
        <svg {...common} aria-hidden>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M16 3v4M8 3v4M3 11h18" />
        </svg>
      )
    case 'gift':
      return (
        <svg {...common} aria-hidden>
          <rect x="3" y="8" width="18" height="4" />
          <path d="M12 8v13M7 8h10a2 2 0 0 0 0-4c-2 0-3 2-3 2s-1-2-3-2a2 2 0 0 0 0 4z" />
        </svg>
      )
    case 'users':
    default:
      return (
        <svg {...common} aria-hidden>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      )
  }
}

function TrendBadge({ trend }: { trend: SummaryKpi['trend'] }) {
  const { direction, percent, label } = trend
  const arrow = direction === 'up' ? '↑' : direction === 'down' ? '↓' : '→'
  const pctLabel = direction === 'flat' && percent === 0 ? '0%' : `${percent > 0 ? '+' : ''}${percent}%`
  return (
    <span className={`dashboard-kpi-trend dashboard-kpi-trend--${direction}`} title={label}>
      <span className="dashboard-kpi-trend-arrow" aria-hidden>
        {arrow}
      </span>
      <span className="dashboard-kpi-trend-pct">{pctLabel}</span>
      <span className="dashboard-kpi-trend-label">{label}</span>
    </span>
  )
}

export function DashboardSummaryCards({ items }: { items: SummaryKpi[] }) {
  return (
    <div className="dashboard-kpi-grid dashboard-kpi-grid--summary">
      {items.map((kpi, idx) => (
        <article key={kpi.id} className={`dashboard-kpi-card dashboard-kpi-card--rich ${idx === 0 ? 'dashboard-kpi-primary' : ''}`}>
          <div className="dashboard-kpi-card-top">
            <span className="dashboard-kpi-icon" aria-hidden>
              <KpiIcon name={kpi.icon} />
            </span>
            <TrendBadge trend={kpi.trend} />
          </div>
          <span className="dashboard-kpi-card-label">{kpi.label}</span>
          <strong className="dashboard-kpi-card-value">{kpi.value}</strong>
          {kpi.hint ? <p className="dashboard-kpi-card-hint">{kpi.hint}</p> : null}
        </article>
      ))}
    </div>
  )
}

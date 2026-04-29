import type { TrendDirection } from './dashboardUtils'

type SummaryItem = {
  label: string
  value: number | string
  trend: { direction: TrendDirection; label: string }
  hint: string
  icon: 'candidates' | 'jobs' | 'interviews' | 'offers'
  primary?: boolean
}

function TrendBadge({ trend }: { trend: SummaryItem['trend'] }) {
  const arrow = trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'
  const mod =
    trend.direction === 'up'
      ? 'dashboard-kpi-trend-up'
      : trend.direction === 'down'
        ? 'dashboard-kpi-trend-down'
        : 'dashboard-kpi-trend-flat'
  return (
    <span className={`dashboard-kpi-trend ${mod}`} title="Vs prior period">
      <span className="dashboard-kpi-trend-arrow" aria-hidden>
        {arrow}
      </span>
      <span className="dashboard-kpi-trend-pct">{trend.label}</span>
    </span>
  )
}

function SummaryIcon({ kind }: { kind: SummaryItem['icon'] }) {
  const stroke = 'currentColor'
  const common = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke, strokeWidth: 1.75 }
  switch (kind) {
    case 'candidates':
      return (
        <svg {...common} aria-hidden>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      )
    case 'jobs':
      return (
        <svg {...common} aria-hidden>
          <rect x="2" y="7" width="20" height="14" rx="2" />
          <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
          <path d="M12 11v6M9 14h6" />
        </svg>
      )
    case 'interviews':
      return (
        <svg {...common} aria-hidden>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      )
    case 'offers':
      return (
        <svg {...common} aria-hidden>
          <path d="M12 2l2.4 7.4h7.6l-6 4.6 2.3 7-6.3-4.6-6.3 4.6 2.3-7-6-4.6h7.6z" />
        </svg>
      )
    default:
      return null
  }
}

export function DashboardSummaryCards({ items, loading }: { items: SummaryItem[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="dashboard-kpi-grid dashboard-kpi-grid-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="dashboard-kpi-card dashboard-kpi-skeleton" aria-busy>
            <span className="dashboard-kpi-skel-line dashboard-kpi-skel-line-short" />
            <span className="dashboard-kpi-skel-line dashboard-kpi-skel-value" />
            <span className="dashboard-kpi-skel-line dashboard-kpi-skel-line-long" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="dashboard-kpi-grid dashboard-kpi-grid-4">
      {items.map(item => (
        <article
          key={item.label}
          className={`dashboard-kpi-card dashboard-kpi-card-rich ${item.primary ? 'dashboard-kpi-primary' : ''}`}
        >
          <div className="dashboard-kpi-card-top">
            <span className="dashboard-kpi-icon" aria-hidden>
              <SummaryIcon kind={item.icon} />
            </span>
            <TrendBadge trend={item.trend} />
          </div>
          <span className="dashboard-kpi-label">{item.label}</span>
          <strong className="dashboard-kpi-value">{item.value}</strong>
          <p className="dashboard-kpi-hint">{item.hint}</p>
        </article>
      ))}
    </div>
  )
}

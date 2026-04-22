type SummaryCardProps = {
  label: string
  value: number | string
  trendLabel: string
  trendUp: boolean | null
  icon: 'users' | 'briefcase' | 'calendar' | 'gift'
  primary?: boolean
  loading?: boolean
}

function SummaryIcon({ kind }: { kind: SummaryCardProps['icon'] }) {
  const common = { width: 22, height: 22, viewBox: '0 0 24 24' as const, fill: 'none', stroke: 'currentColor', strokeWidth: 1.6 }
  switch (kind) {
    case 'users':
      return (
        <svg {...common} aria-hidden>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      )
    case 'briefcase':
      return (
        <svg {...common} aria-hidden>
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
          <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
        </svg>
      )
    case 'calendar':
      return (
        <svg {...common} aria-hidden>
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      )
    case 'gift':
      return (
        <svg {...common} aria-hidden>
          <polyline points="20 12 20 22 4 22 4 12" />
          <rect x="2" y="7" width="20" height="5" />
          <line x1="12" y1="22" x2="12" y2="7" />
          <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
        </svg>
      )
    default:
      return null
  }
}

function TrendBadge({ trendLabel, trendUp }: { trendLabel: string; trendUp: boolean | null }) {
  if (trendUp === null) {
    return <span className="dashboard-kpi-trend dashboard-kpi-trend-neutral">{trendLabel}</span>
  }
  return (
    <span className={`dashboard-kpi-trend ${trendUp ? 'dashboard-kpi-trend-up' : 'dashboard-kpi-trend-down'}`}>
      <span className="dashboard-kpi-trend-arrow" aria-hidden>
        {trendUp ? '↑' : '↓'}
      </span>
      {trendLabel}
    </span>
  )
}

function SummaryCard({ label, value, trendLabel, trendUp, icon, primary, loading }: SummaryCardProps) {
  return (
    <article className={`dashboard-kpi-card dashboard-kpi-card-modern ${primary ? 'dashboard-kpi-primary' : ''}`}>
      <div className="dashboard-kpi-card-top">
        <div className={`dashboard-kpi-icon-wrap ${primary ? 'dashboard-kpi-icon-wrap-primary' : ''}`}>
          <SummaryIcon kind={icon} />
        </div>
        {loading ? (
          <span className="dashboard-kpi-trend dashboard-kpi-trend-neutral dashboard-kpi-trend-skeleton" aria-hidden />
        ) : (
          <TrendBadge trendLabel={trendLabel} trendUp={trendUp} />
        )}
      </div>
      {loading ? (
        <div className="dashboard-kpi-skeleton-value" aria-hidden />
      ) : (
        <strong className="dashboard-kpi-value">{value}</strong>
      )}
      <span className="dashboard-kpi-label">{label}</span>
    </article>
  )
}

export type SummaryCardDatum = Omit<SummaryCardProps, 'loading'>

export function DashboardSummaryCards({ cards, loading }: { cards: SummaryCardDatum[]; loading?: boolean }) {
  return (
    <div className="dashboard-kpi-grid dashboard-kpi-grid-four">
      {cards.map(card => (
        <SummaryCard key={card.label} {...card} loading={loading} />
      ))}
    </div>
  )
}

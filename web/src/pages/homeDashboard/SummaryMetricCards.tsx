import type { TrendResult } from './utils'

type Card = {
  label: string
  value: number | string
  trend: TrendResult
  hint: string
  primary?: boolean
  icon: 'users' | 'briefcase' | 'calendar' | 'gift'
}

function IconUsers({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm10 0v-1a5 5 0 0 0-3.07-4.59M16 3.13a4 4 0 0 1 0 7.75"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconBriefcase({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="2" y="7" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" stroke="currentColor" strokeWidth="1.75" />
      <path d="M2 13h20" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  )
}

function IconCalendar({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

function IconGift({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M20 12v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8M2 7h20v5H2V7Zm10 13V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7Zm0 0h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CardIcon({ kind }: { kind: Card['icon'] }) {
  const cls = 'dashboard-kpi-icon-svg'
  switch (kind) {
    case 'briefcase':
      return <IconBriefcase className={cls} />
    case 'calendar':
      return <IconCalendar className={cls} />
    case 'gift':
      return <IconGift className={cls} />
    default:
      return <IconUsers className={cls} />
  }
}

function TrendBadge({ trend }: { trend: TrendResult }) {
  if (trend.flat && trend.up === null) {
    return (
      <span className="dashboard-kpi-trend dashboard-kpi-trend--flat" title="vs prior 30 days">
        — 0%
      </span>
    )
  }
  const arrow = trend.up === true ? '↑' : trend.up === false ? '↓' : '—'
  return (
    <span
      className={`dashboard-kpi-trend ${trend.up === true ? 'dashboard-kpi-trend--up' : ''} ${trend.up === false ? 'dashboard-kpi-trend--down' : ''}`}
      title="vs prior 30 days"
    >
      {arrow} {trend.pctLabel}
    </span>
  )
}

export function SummaryMetricCards({ cards, loading }: { cards: Card[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="dashboard-kpi-grid dashboard-kpi-grid--four">
        {[0, 1, 2, 3].map(i => (
          <article key={i} className="dashboard-kpi-card dashboard-kpi-skeleton" aria-hidden>
            <span className="dashboard-kpi-skeleton-line dashboard-kpi-skeleton-line--short" />
            <span className="dashboard-kpi-skeleton-line dashboard-kpi-skeleton-line--value" />
            <span className="dashboard-kpi-skeleton-line dashboard-kpi-skeleton-line--muted" />
          </article>
        ))}
      </div>
    )
  }

  return (
    <div className="dashboard-kpi-grid dashboard-kpi-grid--four">
      {cards.map(c => (
        <article key={c.label} className={`dashboard-kpi-card${c.primary ? ' dashboard-kpi-primary' : ''}`}>
          <div className="dashboard-kpi-card-top">
            <span className={`dashboard-kpi-icon${c.primary ? ' dashboard-kpi-icon--on-primary' : ''}`}>
              <CardIcon kind={c.icon} />
            </span>
            <TrendBadge trend={c.trend} />
          </div>
          <span>{c.label}</span>
          <strong>{c.value}</strong>
          <p>{c.hint}</p>
        </article>
      ))}
    </div>
  )
}

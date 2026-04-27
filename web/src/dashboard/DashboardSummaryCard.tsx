import type { TrendDirection } from './dashboardUtils'

type Props = {
  title: string
  value: string | number
  subtitle?: string
  trend?: { direction: TrendDirection; text: string }
  icon: 'candidates' | 'jobs' | 'interviews' | 'offers'
  variant?: 'primary' | 'default'
}

function Icon({ name }: { name: Props['icon'] }) {
  const stroke = 'currentColor'
  const common = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', strokeWidth: 1.75, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  switch (name) {
    case 'candidates':
      return (
        <svg {...common} aria-hidden>
          <path stroke={stroke} d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle stroke={stroke} cx="9" cy="7" r="4" />
          <path stroke={stroke} d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      )
    case 'jobs':
      return (
        <svg {...common} aria-hidden>
          <rect stroke={stroke} x="2" y="7" width="20" height="14" rx="2" ry="2" />
          <path stroke={stroke} d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
      )
    case 'interviews':
      return (
        <svg {...common} aria-hidden>
          <rect stroke={stroke} x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line stroke={stroke} x1="16" y1="2" x2="16" y2="6" />
          <line stroke={stroke} x1="8" y1="2" x2="8" y2="6" />
          <line stroke={stroke} x1="3" y1="10" x2="21" y2="10" />
        </svg>
      )
    case 'offers':
      return (
        <svg {...common} aria-hidden>
          <path stroke={stroke} d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <path stroke={stroke} d="M8 10h8M8 14h5" />
        </svg>
      )
    default:
      return null
  }
}

export function DashboardSummaryCard({ title, value, subtitle, trend, icon, variant = 'default' }: Props) {
  const trendClass =
    trend?.direction === 'up'
      ? 'dashboard-kpi-trend--up'
      : trend?.direction === 'down'
        ? 'dashboard-kpi-trend--down'
        : 'dashboard-kpi-trend--flat'

  return (
    <article className={`dashboard-kpi-card dashboard-kpi-card--modern ${variant === 'primary' ? 'dashboard-kpi-primary' : ''}`}>
      <div className="dashboard-kpi-card-top">
        <div className={`dashboard-kpi-icon ${variant === 'primary' ? 'dashboard-kpi-icon--on-primary' : ''}`} aria-hidden>
          <Icon name={icon} />
        </div>
        {trend && (
          <span className={`dashboard-kpi-trend ${trendClass}`} title="vs prior month">
            {trend.text}
          </span>
        )}
      </div>
      <span className="dashboard-kpi-card-title">{title}</span>
      <strong className="dashboard-kpi-card-value">{value}</strong>
      {subtitle ? <p className="dashboard-kpi-card-sub">{subtitle}</p> : null}
    </article>
  )
}

export function DashboardSummarySkeleton() {
  return (
    <>
      {[0, 1, 2, 3].map(i => (
        <div key={i} className="dashboard-kpi-card dashboard-kpi-card--modern dashboard-kpi-skeleton" aria-hidden>
          <div className="dashboard-kpi-skeleton-icon" />
          <div className="dashboard-kpi-skeleton-line dashboard-kpi-skeleton-line--sm" />
          <div className="dashboard-kpi-skeleton-line dashboard-kpi-skeleton-line--lg" />
          <div className="dashboard-kpi-skeleton-line dashboard-kpi-skeleton-line--md" />
        </div>
      ))}
    </>
  )
}

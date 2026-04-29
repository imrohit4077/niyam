import { type ReactNode } from 'react'

export type ActivityItem = {
  id: string
  title: string
  meta: string
  icon: 'person' | 'calendar' | 'briefcase' | 'mail' | 'check'
}

const ICONS: Record<ActivityItem['icon'], ReactNode> = {
  person: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  calendar: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  ),
  briefcase: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
    </svg>
  ),
  mail: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <path d="m22 6-10 7L2 6" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  ),
}

export function DashboardActivityFeed({ items, emptyLabel }: { items: ActivityItem[]; emptyLabel: string }) {
  if (items.length === 0) {
    return <div className="dashboard-empty dashboard-activity-empty">{emptyLabel}</div>
  }
  return (
    <ul className="dashboard-activity-list" role="list">
      {items.map(item => (
        <li key={item.id} className="dashboard-activity-item">
          <span className="dashboard-activity-icon" aria-hidden>
            {ICONS[item.icon] ?? ICONS.briefcase}
          </span>
          <div className="dashboard-activity-body">
            <span className="dashboard-activity-title">{item.title}</span>
            <span className="dashboard-activity-meta">{item.meta}</span>
          </div>
        </li>
      ))}
    </ul>
  )
}

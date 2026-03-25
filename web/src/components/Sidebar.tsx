import { useState } from 'react'
import type { ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'

export type SidebarPage =
  | 'profile'
  | 'jobs'
  | 'hiring-plans'
  | 'pipeline'
  | 'job-applications'
  | 'job-boards'
  | 'postings'
  | 'candidates'
  | 'interviews'
  | 'esign-documents'
  | 'referrals'
  | 'team'
  | 'settings-general'
  | 'settings-custom-fields'
  | 'settings-esign'

interface NavItem {
  id: SidebarPage
  label: string
  badge?: number
  icon: string
  group?: string
}

const NAV: NavItem[] = [
  { id: 'profile', label: 'My Profile', icon: 'user', group: 'Overview' },
  { id: 'jobs', label: 'Jobs', icon: 'briefcase', group: 'Jobs' },
  { id: 'hiring-plans', label: 'Hiring plans', icon: 'target', group: 'Jobs' },
  { id: 'pipeline', label: 'Pipeline', icon: 'columns', group: 'Jobs' },
  { id: 'job-boards', label: 'Job Boards', icon: 'globe', group: 'Jobs' },
  { id: 'postings', label: 'Postings', icon: 'send', group: 'Jobs' },
  { id: 'job-applications', label: 'Applications', icon: 'document', group: 'Candidates' },
  { id: 'candidates', label: 'Candidates', icon: 'people', group: 'Candidates' },
  { id: 'interviews', label: 'Interviews', icon: 'calendar', group: 'Candidates' },
  { id: 'esign-documents', label: 'Signed documents', icon: 'signature', group: 'Candidates' },
  { id: 'referrals', label: 'Referrals', icon: 'referral', group: 'Candidates' },
  { id: 'settings-general', label: 'General', icon: 'gear', group: 'Settings' },
  { id: 'settings-custom-fields', label: 'Custom fields', icon: 'fieldgrid', group: 'Settings' },
  { id: 'settings-esign', label: 'E-sign', icon: 'document', group: 'Settings' },
  { id: 'team', label: 'Team', icon: 'team', group: 'Workspace' },
]

const PATH_SEGMENTS: Record<SidebarPage, string> = {
  profile: 'profile',
  jobs: 'jobs',
  'hiring-plans': 'hiring-plans',
  pipeline: 'pipeline',
  'job-boards': 'job-boards',
  postings: 'postings',
  'job-applications': 'job-applications',
  candidates: 'candidates',
  interviews: 'interviews',
  'esign-documents': 'esign-documents',
  referrals: 'referrals',
  team: 'team',
  'settings-general': 'settings/general',
  'settings-custom-fields': 'settings/custom-fields/jobs',
  'settings-esign': 'settings/esign',
}

const ICONS: Record<string, ReactNode> = {
  user: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 12a5 5 0 100-10 5 5 0 000 10zm-7 8a7 7 0 0114 0H5z" />
    </svg>
  ),
  briefcase: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20 7h-4V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2H4a2 2 0 00-2 2v11a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zm-10-2h4v2h-4V5zm10 14H4V9h16v10z" />
    </svg>
  ),
  document: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM6 20V4h5v7h7v9H6z" />
    </svg>
  ),
  people: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
    </svg>
  ),
  calendar: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zm0 16H5V9h14v11zM7 11h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z" />
    </svg>
  ),
  team: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
    </svg>
  ),
  gear: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.49.49 0 00-.59-.22l-2.39.96a7.02 7.02 0 00-1.62-.94l-.36-2.54A.484.484 0 0014 2h-4a.484.484 0 00-.48.41l-.36 2.54a7.4 7.4 0 00-1.62.94l-2.39-.96a.48.48 0 00-.59.22L2.74 8.87a.47.47 0 00.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.47.47 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.36 1.04.67 1.62.94l.36 2.54c.05.24.27.41.48.41h4c.24 0 .44-.17.47-.41l.36-2.54a7.4 7.4 0 001.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.47.47 0 00-.12-.61l-2.01-1.58zM12 15.6a3.6 3.6 0 110-7.2 3.6 3.6 0 010 7.2z" />
    </svg>
  ),
  fieldgrid: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 0h7v7h-7v-7z" />
    </svg>
  ),
  chevron: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
    </svg>
  ),
  globe: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
    </svg>
  ),
  send: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
    </svg>
  ),
  target: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm0-14c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z" />
    </svg>
  ),
  columns: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M6 3h4v18H6V3zm8 0h4v18h-4V3z" />
    </svg>
  ),
  signature: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 8H7v2h6v-2zm0 4H7v2h6v-2zM13 9V3.5L18.5 9H13z" />
      <path d="M3 20h18v2H3z" opacity="0.85" />
    </svg>
  ),
  referral: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
    </svg>
  ),
}

const SIDEBAR_COLLAPSED_KEY = 'forge.sidebarCollapsed'

function readSidebarCollapsed(): boolean {
  try {
    return sessionStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1'
  } catch {
    return false
  }
}

interface Props {
  accountId: string
}

export default function Sidebar({ accountId }: Props) {
  const [collapsed, setCollapsed] = useState(readSidebarCollapsed)
  const { pathname } = useLocation()

  const groups = NAV.reduce<Record<string, NavItem[]>>((acc, item) => {
    const g = item.group ?? 'Other'
    if (!acc[g]) acc[g] = []
    acc[g].push(item)
    return acc
  }, {})

  const base = `/account/${accountId}`

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <button
        className="sidebar-toggle"
        onClick={() =>
          setCollapsed(c => {
            const next = !c
            try {
              sessionStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0')
            } catch {
              /* ignore quota / private mode */
            }
            return next
          })
        }
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        title={collapsed ? 'Expand' : 'Collapse'}
      >
        <span className={`sidebar-toggle-icon ${collapsed ? 'rotated' : ''}`}>
          {ICONS.chevron}
        </span>
      </button>

      <nav className="sidebar-nav">
        {Object.entries(groups).map(([group, items]) => (
          <div key={group} className="sidebar-group">
            {!collapsed && <div className="sidebar-group-label">{group}</div>}
            {items.map(item => {
              const seg = PATH_SEGMENTS[item.id]
              const to = `${base}/${seg}`
              const esignActive = item.id === 'settings-esign' && pathname.includes('/settings/esign')
              const generalActive = item.id === 'settings-general' && pathname.includes('/settings/general')
              const customFieldsActive =
                item.id === 'settings-custom-fields' && pathname.includes('/settings/custom-fields')
              return (
                <NavLink
                  key={item.id}
                  to={to}
                  end={item.id === 'profile' || item.id === 'settings-custom-fields'}
                  title={collapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    `sidebar-item ${isActive || esignActive || generalActive || customFieldsActive ? 'sidebar-item-active' : ''}`
                  }
                >
                  <span className="sidebar-item-icon">{ICONS[item.icon]}</span>
                  {!collapsed && (
                    <>
                      <span className="sidebar-item-label">{item.label}</span>
                      {item.badge != null && <span className="sidebar-badge">{item.badge}</span>}
                    </>
                  )}
                  {collapsed && item.badge != null && <span className="sidebar-badge-dot" />}
                </NavLink>
              )
            })}
          </div>
        ))}
      </nav>
    </aside>
  )
}

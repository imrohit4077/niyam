import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

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
  | 'settings-labels'
  | 'settings-communication-channels'
  | 'settings-audit-compliance'
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
  { id: 'settings-labels', label: 'Labels', icon: 'tag', group: 'Settings' },
  { id: 'settings-communication-channels', label: 'Communication', icon: 'mail', group: 'Settings' },
  { id: 'settings-audit-compliance', label: 'Audit & compliance', icon: 'shield', group: 'Settings' },
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
  'settings-labels': 'settings/labels',
  'settings-communication-channels': 'settings/communication-channels',
  'settings-audit-compliance': 'settings/audit-compliance',
  'settings-esign': 'settings/esign',
}

/** 20×20 stroke icons — high contrast on dark sidebar */
const ICONS: Record<string, ReactNode> = {
  user: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  briefcase: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7h-4V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2H4a2 2 0 00-2 2v11a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" />
    </svg>
  ),
  document: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  people: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  calendar: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  team: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  gear: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  fieldgrid: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  ),
  chevron: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  ),
  globe: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 13H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  send: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
  ),
  target: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
    </svg>
  ),
  columns: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
    </svg>
  ),
  signature: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L7.5 20.5H3v-4.5L16.732 3.732z" />
    </svg>
  ),
  referral: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
    </svg>
  ),
  tag: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
  ),
  mail: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  shield: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-4-8 4v7c0 6 8 10 8 10z" />
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
  const { user } = useAuth()

  const navItems = useMemo(() => {
    const slug = user?.role?.slug?.toLowerCase()
    const isAdmin = slug === 'admin' || slug === 'superadmin'
    return NAV.filter(
      item =>
        (item.id !== 'settings-audit-compliance' && item.id !== 'settings-communication-channels') || isAdmin,
    )
  }, [user?.role?.slug])

  const groups = navItems.reduce<Record<string, NavItem[]>>((acc, item) => {
    const g = item.group ?? 'Other'
    if (!acc[g]) acc[g] = []
    acc[g].push(item)
    return acc
  }, {})

  const base = `/account/${accountId}`

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`} aria-label="Main navigation">
      <div className="sidebar-top">
        <button
          type="button"
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
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <span className={`sidebar-toggle-icon ${collapsed ? 'rotated' : ''}`}>{ICONS.chevron}</span>
        </button>
      </div>

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
              const labelsActive = item.id === 'settings-labels' && pathname.includes('/settings/labels')
              const auditActive =
                item.id === 'settings-audit-compliance' && pathname.includes('/settings/audit-compliance')
              const commActive =
                item.id === 'settings-communication-channels' &&
                pathname.includes('/settings/communication-channels')
              return (
                <NavLink
                  key={item.id}
                  to={to}
                  end={
                    item.id === 'profile' ||
                    item.id === 'settings-custom-fields' ||
                    item.id === 'settings-labels' ||
                    item.id === 'settings-audit-compliance'
                  }
                  title={collapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    `sidebar-item ${isActive || esignActive || generalActive || customFieldsActive || labelsActive || commActive || auditActive ? 'sidebar-item-active' : ''}`
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

import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { navItemVisible, type NavId } from '../permissions'
import { Icon, Icon3D, type IconName } from '../icons'

export type SidebarPage = NavId

interface NavItem {
  id: NavId
  label: string
  badge?: number
  icon: IconName
  group?: string
}

/** Nested under Structured hiring (order matters). */
const STRUCTURED_BRANCH_IDS: NavId[] = ['hiring-structure-attributes', 'hiring-structure-stages']

/** Nested under the Jobs branch in Recruiting (order matters). */
const JOBS_BRANCH_IDS: NavId[] = ['jobs-role-kickoff', 'jobs-all', 'jobs-mine']

const NAV: NavItem[] = [
  { id: 'profile', label: 'Overview', icon: 'dashboard', group: 'Overview' },
  { id: 'jobs-role-kickoff', label: 'Role kickoff', icon: 'kickoff', group: 'Recruiting' },
  { id: 'jobs-all', label: 'All jobs', icon: 'jobs', group: 'Recruiting' },
  { id: 'jobs-mine', label: 'My jobs', icon: 'jobs', group: 'Recruiting' },
  { id: 'hiring-plans', label: 'Hiring plans', icon: 'plans', group: 'Recruiting' },
  { id: 'pipeline', label: 'Pipeline', icon: 'pipeline', group: 'Recruiting' },
  { id: 'job-boards', label: 'Job Boards', icon: 'boards', group: 'Recruiting' },
  { id: 'postings', label: 'Postings', icon: 'postings', group: 'Recruiting' },
  { id: 'hiring-structure-attributes', label: 'Attributes', icon: 'attributes', group: 'Structured hiring' },
  { id: 'hiring-structure-stages', label: 'Stages', icon: 'stages', group: 'Structured hiring' },
  { id: 'job-applications', label: 'Applications', icon: 'applications', group: 'Candidates' },
  { id: 'candidates', label: 'Candidates', icon: 'candidates', group: 'Candidates' },
  { id: 'interviews', label: 'Interviews', icon: 'interviews', group: 'Candidates' },
  { id: 'esign-documents', label: 'Signed documents', icon: 'signature', group: 'Candidates' },
  { id: 'referrals', label: 'Referrals', icon: 'referrals', group: 'Candidates' },
  { id: 'settings-general', label: 'General', icon: 'settings', group: 'Settings' },
  { id: 'settings-custom-fields', label: 'Custom fields', icon: 'fields', group: 'Settings' },
  { id: 'settings-labels', label: 'Labels', icon: 'labels', group: 'Settings' },
  { id: 'settings-communication-channels', label: 'Communication', icon: 'mail', group: 'Settings' },
  { id: 'settings-audit-compliance', label: 'Audit & compliance', icon: 'audit', group: 'Settings' },
  { id: 'settings-esign', label: 'E-sign', icon: 'esign', group: 'Settings' },
  { id: 'team', label: 'Team', icon: 'team', group: 'Workspace' },
]

const PATH_SEGMENTS: Record<NavId, string> = {
  profile: 'profile',
  'hiring-structure-attributes': 'structured-hiring/attributes',
  'hiring-structure-stages': 'structured-hiring/stages',
  'jobs-all': 'jobs/all',
  'jobs-mine': 'jobs/mine',
  'jobs-role-kickoff': 'jobs/role-kickoff',
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

const SIDEBAR_COLLAPSED_KEY = 'niyam.sidebarCollapsed'
const SIDEBAR_JOBS_BRANCH_OPEN_KEY = 'niyam.sidebarJobsBranchOpen'
const SIDEBAR_STRUCTURED_BRANCH_OPEN_KEY = 'niyam.sidebarStructuredBranchOpen'

function readSidebarCollapsed(): boolean {
  try {
    return sessionStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1'
  } catch {
    return false
  }
}

function readJobsBranchOpen(): boolean {
  try {
    const v = sessionStorage.getItem(SIDEBAR_JOBS_BRANCH_OPEN_KEY)
    if (v === '0') return false
    if (v === '1') return true
  } catch {
    /* ignore */
  }
  return true
}

function readStructuredBranchOpen(): boolean {
  try {
    const v = sessionStorage.getItem(SIDEBAR_STRUCTURED_BRANCH_OPEN_KEY)
    if (v === '0') return false
    if (v === '1') return true
  } catch {
    /* ignore */
  }
  return true
}

interface Props {
  accountId: string
  /** Off-canvas state on small screens (controlled by the layout). */
  mobileOpen?: boolean
  onRequestClose?: () => void
}

export default function Sidebar({ accountId, mobileOpen = false, onRequestClose }: Props) {
  const [collapsed, setCollapsed] = useState(readSidebarCollapsed)
  const [jobsBranchOpen, setJobsBranchOpen] = useState(readJobsBranchOpen)
  const [structuredBranchOpen, setStructuredBranchOpen] = useState(readStructuredBranchOpen)
  const { pathname } = useLocation()
  const { user } = useAuth()

  const navItems = useMemo(() => NAV.filter(item => navItemVisible(user, item.id)), [user])

  const groups = navItems.reduce<Record<string, NavItem[]>>((acc, item) => {
    const g = item.group ?? 'Other'
    if (!acc[g]) acc[g] = []
    acc[g].push(item)
    return acc
  }, {})

  const base = `/account/${accountId}`

  const underJobsPath = /\/account\/\d+\/jobs(\/|$)/.test(pathname)
  const underStructuredPath = /\/account\/\d+\/structured-hiring(\/|$)/.test(pathname)

  useEffect(() => {
    if (underJobsPath) setJobsBranchOpen(true)
  }, [underJobsPath])

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    onRequestClose?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  useEffect(() => {
    if (underStructuredPath) setStructuredBranchOpen(true)
  }, [underStructuredPath])

  const setJobsBranchOpenPersist = (open: boolean) => {
    setJobsBranchOpen(open)
    try {
      sessionStorage.setItem(SIDEBAR_JOBS_BRANCH_OPEN_KEY, open ? '1' : '0')
    } catch {
      /* ignore */
    }
  }

  const setStructuredBranchOpenPersist = (open: boolean) => {
    setStructuredBranchOpen(open)
    try {
      sessionStorage.setItem(SIDEBAR_STRUCTURED_BRANCH_OPEN_KEY, open ? '1' : '0')
    } catch {
      /* ignore */
    }
  }

  const renderNavLink = (item: NavItem, branchChild: boolean) => {
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
      item.id === 'settings-communication-channels' && pathname.includes('/settings/communication-channels')
    const jobsKickoffActive =
      item.id === 'jobs-role-kickoff' &&
      (pathname.includes('/jobs/role-kickoff') || pathname.includes('/jobs/role-kickoff/'))
    const structuredLeafActive =
      (item.id === 'hiring-structure-attributes' && pathname.includes('/structured-hiring/attributes')) ||
      (item.id === 'hiring-structure-stages' && /\/structured-hiring\/stages(\/|$)/.test(pathname))
    return (
      <NavLink
        to={to}
        end={
          item.id === 'profile' ||
          item.id === 'jobs-all' ||
          item.id === 'jobs-mine' ||
          item.id === 'hiring-structure-attributes' ||
          item.id === 'hiring-structure-stages' ||
          item.id === 'settings-custom-fields' ||
          item.id === 'settings-labels' ||
          item.id === 'settings-audit-compliance'
        }
        title={collapsed ? item.label : undefined}
        className={({ isActive }) =>
          `sidebar-item${branchChild ? ' sidebar-item--branch-child' : ''} ${isActive || esignActive || generalActive || customFieldsActive || labelsActive || commActive || auditActive || jobsKickoffActive || structuredLeafActive ? 'sidebar-item-active' : ''}`
        }
      >
        {!branchChild ? <span className="sidebar-item-icon"><Icon name={item.icon} size={18} /></span> : null}
        {!collapsed && (
          <>
            <span className="sidebar-item-label">{item.label}</span>
            {item.badge != null && <span className="sidebar-badge">{item.badge}</span>}
          </>
        )}
        {collapsed && item.badge != null && <span className="sidebar-badge-dot" />}
      </NavLink>
    )
  }

  return (
    <>
    {mobileOpen ? <div className="sidebar-scrim" onClick={onRequestClose} aria-hidden /> : null}
    <aside
      className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}${mobileOpen ? ' sidebar--mobile-open' : ''}`}
      aria-label="Main navigation"
    >
      <div className="sidebar-top">
        <Link to={`${base}/profile`} className="sidebar-brand" title="Niyam">
          <Icon3D name="brand" size={34} />
          {!collapsed ? (
            <span className="sidebar-brand-text">
              <span className="sidebar-brand-name">Niyam</span>
              <span className="sidebar-brand-tag">Hiring OS</span>
            </span>
          ) : null}
        </Link>
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
          <span className={`sidebar-toggle-icon ${collapsed ? 'rotated' : ''}`}>
            <Icon name="chevronsLeft" size={16} />
          </span>
        </button>
      </div>

      <nav className="sidebar-nav">
        {Object.entries(groups).map(([group, items]) => (
          <div key={group} className="sidebar-group">
            {!collapsed && <div className="sidebar-group-label">{group}</div>}
            {group === 'Structured hiring'
              ? (() => {
                  const structuredChildren = STRUCTURED_BRANCH_IDS.map(id => items.find(i => i.id === id)).filter(
                    (x): x is NavItem => x != null,
                  )
                  return structuredChildren.length === 0 ? null : collapsed ? (
                    <div key="structured-branch-collapsed">
                      <NavLink
                        to={`${base}/structured-hiring/attributes`}
                        className={({ isActive }) =>
                          `sidebar-item ${isActive || underStructuredPath ? 'sidebar-item-active' : ''}`
                        }
                        title="Structured hiring"
                      >
                        <span className="sidebar-item-icon"><Icon name="attributes" size={18} /></span>
                      </NavLink>
                    </div>
                  ) : (
                    <div key="structured-branch" className="sidebar-branch">
                      <button
                        type="button"
                        className={`sidebar-branch-trigger${underStructuredPath ? ' sidebar-branch-trigger--active-route' : ''}`}
                        onClick={() => setStructuredBranchOpenPersist(!structuredBranchOpen)}
                        aria-expanded={structuredBranchOpen}
                        aria-controls="sidebar-structured-branch-children"
                      >
                        <span className="sidebar-item-icon"><Icon name="attributes" size={18} /></span>
                        <span className="sidebar-item-label">Structured hiring</span>
                        <span
                          className={`sidebar-branch-chevron${structuredBranchOpen ? ' sidebar-branch-chevron--open' : ''}`}
                          aria-hidden
                        >
                          <Icon name="chevronRight" size={14} strokeWidth={2} />
                        </span>
                      </button>
                      {structuredBranchOpen ? (
                        <div id="sidebar-structured-branch-children" className="sidebar-branch-children">
                          {structuredChildren.map(item => (
                            <div key={item.id}>{renderNavLink(item, true)}</div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  )
                })()
              : group === 'Recruiting'
              ? (() => {
                  const jobsChildren = JOBS_BRANCH_IDS.map(id => items.find(i => i.id === id)).filter(
                    (x): x is NavItem => x != null,
                  )
                  const rest = items.filter(i => !JOBS_BRANCH_IDS.includes(i.id))
                  return (
                    <>
                      {jobsChildren.length > 0 ? (
                        collapsed ? (
                          <div key="jobs-branch-collapsed">
                            <NavLink
                              to={`${base}/jobs`}
                              className={({ isActive }) =>
                                `sidebar-item ${isActive || underJobsPath ? 'sidebar-item-active' : ''}`
                              }
                              title="Jobs"
                            >
                              <span className="sidebar-item-icon"><Icon name="jobs" size={18} /></span>
                            </NavLink>
                          </div>
                        ) : (
                          <div key="jobs-branch" className="sidebar-branch">
                            <button
                              type="button"
                              className={`sidebar-branch-trigger${underJobsPath ? ' sidebar-branch-trigger--active-route' : ''}`}
                              onClick={() => setJobsBranchOpenPersist(!jobsBranchOpen)}
                              aria-expanded={jobsBranchOpen}
                              aria-controls="sidebar-jobs-branch-children"
                            >
                              <span className="sidebar-item-icon"><Icon name="jobs" size={18} /></span>
                              <span className="sidebar-item-label">Jobs</span>
                              <span
                                className={`sidebar-branch-chevron${jobsBranchOpen ? ' sidebar-branch-chevron--open' : ''}`}
                                aria-hidden
                              >
                                <Icon name="chevronRight" size={14} strokeWidth={2} />
                              </span>
                            </button>
                            {jobsBranchOpen ? (
                              <div id="sidebar-jobs-branch-children" className="sidebar-branch-children">
                                {jobsChildren.map(item => (
                                  <div key={item.id}>{renderNavLink(item, true)}</div>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        )
                      ) : null}
                      {rest.map(item => (
                        <div key={item.id}>{renderNavLink(item, false)}</div>
                      ))}
                    </>
                  )
                })()
              : items.map(item => <div key={item.id}>{renderNavLink(item, false)}</div>)}
          </div>
        ))}
      </nav>

      {user?.account ? (
        <div className="sidebar-workspace" title={collapsed ? user.account.name : undefined}>
          <span className="sidebar-workspace-avatar" aria-hidden>
            {user.account.name.slice(0, 1).toUpperCase()}
          </span>
          {!collapsed ? (
            <span className="sidebar-workspace-text">
              <span className="sidebar-workspace-name">{user.account.name}</span>
              <span className="sidebar-workspace-plan">
                {user.account.plan ? `${user.account.plan} plan` : 'Workspace'}
              </span>
            </span>
          ) : null}
        </div>
      ) : null}
    </aside>
    </>
  )
}

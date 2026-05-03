import { useMemo } from 'react'
import { NavLink, Outlet, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { canAny } from '../permissions'

const NAV = [
  { path: 'organization', label: 'Organization', desc: 'Company, locale & timezone' },
  { path: 'job-setup-flow', label: 'Job setup flow', desc: 'Control visible setup sections' },
  { path: 'departments', label: 'Departments', desc: 'Teams for jobs and filters' },
  { path: 'job-locations', label: 'Job locations', desc: 'Countries for job location field' },
  { path: 'workspace', label: 'Workspace', desc: 'Slug, plan & shortcuts' },
  { path: 'appearance', label: 'Typography', desc: 'Font family & base size for the app' },
  { path: 'referrals', label: 'Referral program', desc: 'Links, notifications & HRIS webhook' },
] as const

export default function GeneralSettingsLayout() {
  const { accountId } = useParams<{ accountId: string }>()
  const { user } = useAuth()
  const base = `/account/${accountId}/settings/general`

  const generalNav = useMemo(
    () =>
      NAV.filter(item => {
        if (item.path === 'referrals') return canAny(user, [['referrals', 'view'], ['referrals', 'manage']])
        return true
      }),
    [user],
  )

  return (
    <div className="esign-shell general-settings-shell">
      <div className="esign-shell-body">
        <aside className="esign-sidenav" aria-label="General settings sections">
          <div className="esign-sidenav-head">
            <p className="esign-sidenav-kicker">Settings</p>
            <h2 className="esign-sidenav-title">General</h2>
            <p className="esign-sidenav-lead">Workspace profile, branding, and regional defaults.</p>
          </div>
          <nav className="esign-sidenav-nav">
            {generalNav.map(item => (
              <NavLink
                key={item.path}
                to={`${base}/${item.path}`}
                className={({ isActive }) => `esign-sidenav-link${isActive ? ' esign-sidenav-link--active' : ''}`}
                end
              >
                <span className="esign-sidenav-link-icon" aria-hidden>
                  {item.path === 'organization' ? (
                    <IconOrg />
                  ) : item.path === 'job-setup-flow' ? (
                    <IconFlow />
                  ) : item.path === 'departments' ? (
                    <IconDepartments />
                  ) : item.path === 'job-locations' ? (
                    <IconGlobe />
                  ) : item.path === 'workspace' ? (
                    <IconWorkspace />
                  ) : item.path === 'referrals' ? (
                    <IconReferral />
                  ) : (
                    <IconTypography />
                  )}
                </span>
                <span className="esign-sidenav-link-text">
                  <span className="esign-sidenav-link-label">{item.label}</span>
                  <span className="esign-sidenav-link-desc">{item.desc}</span>
                </span>
              </NavLink>
            ))}
          </nav>
        </aside>

        <div className="esign-shell-main">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

function IconOrg() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconDepartments() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <path d="M4 6h7v12H4zM13 10h7v8h-7z" strokeLinejoin="round" />
      <path d="M9 6V4h6v2" strokeLinecap="round" />
    </svg>
  )
}

function IconFlow() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <path d="M5 5h6v4H5zM13 15h6v4h-6zM8 9v3h8v3" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

function IconGlobe() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <circle cx={12} cy={12} r={9} />
      <path d="M3 12h18M12 3a15 15 0 000 18M12 3a15 15 0 010 18" strokeLinecap="round" />
    </svg>
  )
}

function IconWorkspace() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <rect x={3} y={3} width={7} height={9} rx={1} />
      <rect x={14} y={3} width={7} height={5} rx={1} />
      <rect x={14} y={12} width={7} height={9} rx={1} />
      <rect x={3} y={16} width={7} height={5} rx={1} />
    </svg>
  )
}

function IconTypography() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <path d="M4 7V5h16v2M9 20h6M12 5v15" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconReferral() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" strokeLinecap="round" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" />
    </svg>
  )
}


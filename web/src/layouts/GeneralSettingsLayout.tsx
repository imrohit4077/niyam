import { useMemo } from 'react'
import { NavLink, Outlet, useParams } from 'react-router-dom'
import { Icon } from '../icons'
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
  return <Icon name="building" size={18} />
}

function IconDepartments() {
  return <Icon name="folder" size={18} />
}

function IconFlow() {
  return <Icon name="stages" size={18} />
}

function IconGlobe() {
  return <Icon name="location" size={18} />
}

function IconWorkspace() {
  return <Icon name="workspace" size={18} />
}

function IconTypography() {
  return <Icon name="typography" size={18} />
}

function IconReferral() {
  return <Icon name="referrals" size={18} />
}


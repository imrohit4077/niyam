import { NavLink, Outlet, useParams } from 'react-router-dom'

const NAV = [
  { path: 'organization', label: 'Organization', desc: 'Company, locale & timezone' },
  { path: 'workspace', label: 'Workspace', desc: 'Slug, plan & shortcuts' },
  { path: 'appearance', label: 'Typography', desc: 'Font family & base size for the app' },
] as const

export default function GeneralSettingsLayout() {
  const { accountId } = useParams<{ accountId: string }>()
  const base = `/account/${accountId}/settings/general`

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
            {NAV.map(item => (
              <NavLink
                key={item.path}
                to={`${base}/${item.path}`}
                className={({ isActive }) => `esign-sidenav-link${isActive ? ' esign-sidenav-link--active' : ''}`}
                end
              >
                <span className="esign-sidenav-link-icon" aria-hidden>
                  {item.path === 'organization' ? <IconOrg /> : item.path === 'workspace' ? <IconWorkspace /> : <IconTypography />}
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


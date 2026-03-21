import { NavLink, Outlet, useParams } from 'react-router-dom'

const NAV = [
  {
    path: 'jobs',
    label: 'Job fields',
    desc: 'Metadata on requisitions',
    icon: 'job',
  },
  {
    path: 'candidates',
    label: 'Candidate fields',
    desc: 'Per application / apply form',
    icon: 'candidate',
  },
] as const

function NavIcon({ name }: { name: (typeof NAV)[number]['icon'] }) {
  const a = {
    width: 20,
    height: 20,
    viewBox: '0 0 24 24' as const,
    fill: 'none' as const,
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true as const,
  }
  if (name === 'job') {
    return (
      <svg {...a}>
        <path d="M20 7h-4V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2H4a2 2 0 00-2 2v11a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zm-10-2h4v2h-4V5z" />
      </svg>
    )
  }
  return (
    <svg {...a}>
      <path d="M12 12a4 4 0 100-8 4 4 0 000 8z" />
      <path d="M4 20a8 8 0 0116 0" />
    </svg>
  )
}

export default function CustomFieldsSettingsLayout() {
  const { accountId } = useParams<{ accountId: string }>()
  const base = `/account/${accountId}/settings/custom-fields`

  return (
    <div className="esign-shell">
      <div className="esign-shell-body">
        <aside className="esign-sidenav" aria-label="Custom fields sections">
          <div className="esign-sidenav-head">
            <p className="esign-sidenav-kicker">Settings</p>
            <h2 className="esign-sidenav-title">Custom fields</h2>
            <p className="esign-sidenav-lead">Typed attributes for jobs and candidates, like enterprise ATS custom attributes.</p>
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
                  <NavIcon name={item.icon} />
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

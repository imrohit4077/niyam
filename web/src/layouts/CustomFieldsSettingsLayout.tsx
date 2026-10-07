import { NavLink, Outlet, useParams } from 'react-router-dom'
import { Icon } from '../icons'

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
  return <Icon name={name === 'job' ? 'jobs' : 'candidates'} size={18} />
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

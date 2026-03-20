import { NavLink, Outlet, useParams } from 'react-router-dom'

export default function SettingsLayout() {
  const { accountId } = useParams<{ accountId: string }>()
  const base = `/account/${accountId}/settings`

  return (
    <div className="settings-layout">
      <nav className="settings-subnav" aria-label="Settings sections">
        <NavLink
          to={`${base}/general`}
          className={({ isActive }) => `settings-subnav-link ${isActive ? 'settings-subnav-link--active' : ''}`}
        >
          General
        </NavLink>
        <NavLink
          to={`${base}/esign`}
          className={({ isActive }) => `settings-subnav-link ${isActive ? 'settings-subnav-link--active' : ''}`}
        >
          E-sign
        </NavLink>
      </nav>
      <div className="settings-outlet">
        <Outlet />
      </div>
    </div>
  )
}

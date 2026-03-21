import { NavLink, Outlet, useLocation, useParams } from 'react-router-dom'

export default function SettingsLayout() {
  const { accountId } = useParams<{ accountId: string }>()
  const location = useLocation()
  const base = `/account/${accountId}/settings`
  const isEsignSection = location.pathname.includes('/settings/esign')
  const isEsignTemplateEditor = /\/settings\/esign\/templates\/(new|\d+\/edit)/.test(location.pathname)

  return (
    <div
      className={`settings-layout${isEsignSection ? ' settings-layout--wide' : ''}${isEsignTemplateEditor ? ' settings-layout--esign-editor' : ''}`}
    >
      <nav className="settings-subnav" aria-label="Settings sections">
        <NavLink
          to={`${base}/general`}
          className={({ isActive }) => `settings-subnav-link ${isActive ? 'settings-subnav-link--active' : ''}`}
          end
        >
          General
        </NavLink>
        <NavLink
          to={`${base}/esign`}
          className={({ isActive }) => `settings-subnav-link ${isActive ? 'settings-subnav-link--active' : ''}`}
          end={false}
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

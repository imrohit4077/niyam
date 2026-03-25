import { NavLink, Outlet, useLocation, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export default function SettingsLayout() {
  const { accountId } = useParams<{ accountId: string }>()
  const { user } = useAuth()
  const location = useLocation()
  const base = `/account/${accountId}/settings`
  const isEsignSection = location.pathname.includes('/settings/esign')
  const isGeneralNested = location.pathname.includes('/settings/general')
  const isCustomFieldsSection = location.pathname.includes('/settings/custom-fields')
  const isLabelsSection = location.pathname.includes('/settings/labels')
  const isAuditComplianceSection = location.pathname.includes('/settings/audit-compliance')
  const isEsignTemplateEditor = /\/settings\/esign\/templates\/(new|\d+\/edit)/.test(location.pathname)
  const showAuditNav =
    user?.role?.slug === 'admin' || user?.role?.slug === 'superadmin'

  return (
    <div
      className={`settings-layout${isEsignSection || isGeneralNested || isCustomFieldsSection || isLabelsSection || isAuditComplianceSection ? ' settings-layout--wide' : ''}${isEsignTemplateEditor ? ' settings-layout--esign-editor' : ''}`}
    >
      <nav className="settings-subnav" aria-label="Settings sections">
        <NavLink
          to={`${base}/general`}
          className={({ isActive }) => `settings-subnav-link ${isActive ? 'settings-subnav-link--active' : ''}`}
          end={false}
        >
          General
        </NavLink>
        <NavLink
          to={`${base}/custom-fields`}
          className={({ isActive }) => `settings-subnav-link ${isActive ? 'settings-subnav-link--active' : ''}`}
          end={false}
        >
          Custom fields
        </NavLink>
        <NavLink
          to={`${base}/labels`}
          className={({ isActive }) => `settings-subnav-link ${isActive ? 'settings-subnav-link--active' : ''}`}
          end
        >
          Labels
        </NavLink>
        {showAuditNav ? (
          <NavLink
            to={`${base}/audit-compliance`}
            className={({ isActive }) => `settings-subnav-link ${isActive ? 'settings-subnav-link--active' : ''}`}
            end
          >
            Audit & compliance
          </NavLink>
        ) : null}
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

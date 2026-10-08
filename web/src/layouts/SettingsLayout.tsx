import { NavLink, Outlet, useLocation, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { navItemVisible } from '../permissions'
import { Icon } from '../icons'

export default function SettingsLayout() {
  const { accountId } = useParams<{ accountId: string }>()
  const { user } = useAuth()
  const location = useLocation()
  const base = `/account/${accountId}/settings`
  const isEsignSection = location.pathname.includes('/settings/esign')
  const isGeneralNested = location.pathname.includes('/settings/general')
  const isCustomFieldsSection = location.pathname.includes('/settings/custom-fields')
  const isLabelsSection = location.pathname.includes('/settings/labels')
  const isCommunicationChannelsSection = location.pathname.includes('/settings/communication-channels')
  const isAuditComplianceSection = location.pathname.includes('/settings/audit-compliance')
  const isEsignTemplateEditor = /\/settings\/esign\/templates\/(new|\d+\/edit)/.test(location.pathname)
  const showGeneral = navItemVisible(user, 'settings-general')
  const showCustomFields = navItemVisible(user, 'settings-custom-fields')
  const showLabels = navItemVisible(user, 'settings-labels')
  const showComm = navItemVisible(user, 'settings-communication-channels')
  const showAudit = navItemVisible(user, 'settings-audit-compliance')
  const showEsign = navItemVisible(user, 'settings-esign')

  return (
    <div
      className={`settings-layout${isEsignSection || isGeneralNested || isCustomFieldsSection || isLabelsSection || isCommunicationChannelsSection || isAuditComplianceSection ? ' settings-layout--wide' : ''}${isEsignTemplateEditor ? ' settings-layout--esign-editor' : ''}`}
    >
      {isEsignTemplateEditor ? null : (
      <nav className="settings-subnav" aria-label="Settings sections">
        {showGeneral ? (
          <NavLink
            to={`${base}/general`}
            className={({ isActive }) => `settings-subnav-link ${isActive ? 'settings-subnav-link--active' : ''}`}
            end={false}
          >
            <Icon name="settings" size={15} />
            General
          </NavLink>
        ) : null}
        {showCustomFields ? (
          <NavLink
            to={`${base}/custom-fields`}
            className={({ isActive }) => `settings-subnav-link ${isActive ? 'settings-subnav-link--active' : ''}`}
            end={false}
          >
            <Icon name="fields" size={15} />
            Custom fields
          </NavLink>
        ) : null}
        {showLabels ? (
          <NavLink
            to={`${base}/labels`}
            className={({ isActive }) => `settings-subnav-link ${isActive ? 'settings-subnav-link--active' : ''}`}
            end
          >
            <Icon name="labels" size={15} />
            Labels
          </NavLink>
        ) : null}
        {showComm ? (
          <NavLink
            to={`${base}/communication-channels`}
            className={({ isActive }) => `settings-subnav-link ${isActive ? 'settings-subnav-link--active' : ''}`}
            end={false}
          >
            <Icon name="mail" size={15} />
            Communication channels
          </NavLink>
        ) : null}
        {showAudit ? (
          <NavLink
            to={`${base}/audit-compliance`}
            className={({ isActive }) => `settings-subnav-link ${isActive ? 'settings-subnav-link--active' : ''}`}
            end
          >
            <Icon name="audit" size={15} />
            Audit & compliance
          </NavLink>
        ) : null}
        {showEsign ? (
          <NavLink
            to={`${base}/esign`}
            className={({ isActive }) => `settings-subnav-link ${isActive ? 'settings-subnav-link--active' : ''}`}
            end={false}
          >
            <Icon name="esign" size={15} />
            E-sign
          </NavLink>
        ) : null}
      </nav>
      )}
      <div className="settings-outlet">
        <Outlet />
      </div>
    </div>
  )
}

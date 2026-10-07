import { NavLink, Outlet, useParams } from 'react-router-dom'
import { Icon } from '../icons'

const NAV = [
  {
    path: 'overview',
    label: 'Overview',
    desc: 'Why we log mutations, compliance context',
  },
  {
    path: 'audit-logs',
    label: 'Audit logs',
    desc: 'Each tracked POST / PUT / PATCH / DELETE',
  },
  {
    path: 'delivery-failures',
    label: 'Delivery failures',
    desc: 'When the worker could not persist a row',
  },
] as const

/**
 * Top-level Settings section: audit trails & compliance (not under General).
 */
export default function AuditComplianceSettingsLayout() {
  const { accountId } = useParams<{ accountId: string }>()
  const base = `/account/${accountId}/settings/audit-compliance`

  return (
    <div className="esign-shell general-settings-shell audit-compliance-settings-shell">
      <div className="esign-shell-body">
        <aside className="esign-sidenav" aria-label="Audit trails and compliance">
          <div className="esign-sidenav-head">
            <p className="esign-sidenav-kicker">Settings</p>
            <h2 className="esign-sidenav-title">Audit trails &amp; compliance</h2>
            <p className="esign-sidenav-lead">
              Write-only audit log, governance notes, and read-only feeds for this workspace.
            </p>
          </div>
          <nav className="esign-sidenav-nav" aria-label="Audit subsections">
            {NAV.map(item => (
              <NavLink
                key={item.path}
                to={`${base}/${item.path}`}
                className={({ isActive }) => `esign-sidenav-link${isActive ? ' esign-sidenav-link--active' : ''}`}
                end={item.path === 'overview'}
              >
                <span className="esign-sidenav-link-icon" aria-hidden>
                  {item.path === 'overview' ? (
                    <IconBook />
                  ) : item.path === 'audit-logs' ? (
                    <IconList />
                  ) : (
                    <IconAlert />
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
          <Outlet key={accountId} />
        </div>
      </div>
    </div>
  )
}

function IconBook() {
  return <Icon name="audit" size={18} />
}

function IconList() {
  return <Icon name="list" size={18} />
}

function IconAlert() {
  return <Icon name="alert" size={18} />
}

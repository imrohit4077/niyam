import { NavLink, Outlet, useParams } from 'react-router-dom'

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
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" strokeLinecap="round" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" strokeLinejoin="round" />
    </svg>
  )
}

function IconList() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" strokeLinecap="round" />
    </svg>
  )
}

function IconAlert() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" strokeLinejoin="round" />
      <path d="M12 9v4M12 17h.01" strokeLinecap="round" />
    </svg>
  )
}

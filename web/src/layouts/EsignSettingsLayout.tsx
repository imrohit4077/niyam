import { useCallback, useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation, useParams } from 'react-router-dom'
import { Icon } from '../icons'
import { useAuth } from '../auth/AuthContext'
import { esignApi } from '../api/esign'
import { can } from '../permissions'

const NAV = [
  {
    path: 'overview',
    label: 'Overview',
    desc: 'Signing links & worker',
    icon: 'overview',
  },
  {
    path: 'templates',
    label: 'Templates',
    desc: 'Documents & layouts',
    icon: 'templates',
  },
  {
    path: 'rules',
    label: 'Automation',
    desc: 'Pipeline triggers',
    icon: 'automation',
  },
  {
    path: 'advanced',
    label: 'Advanced',
    desc: 'Webhooks & mapping',
    icon: 'advanced',
  },
] as const

const ESIGN_NAV_ICONS = { overview: 'home', templates: 'applications', automation: 'sparkle', advanced: 'settings' } as const

function EsignNavIcon({ name }: { name: (typeof NAV)[number]['icon'] }) {
  return <Icon name={ESIGN_NAV_ICONS[name]} size={18} />
}

export default function EsignSettingsLayout() {
  const { accountId } = useParams<{ accountId: string }>()
  const location = useLocation()
  const { user, getToken } = useAuth()
  const token = getToken()
  const base = `/account/${accountId}/settings/esign`

  const esignNav = useMemo(
    () =>
      NAV.filter(item => {
        if (item.path === 'rules' || item.path === 'advanced') return can(user, 'esign', 'manage')
        return true
      }),
    [user],
  )

  const isTemplateEditor = useMemo(
    () => /\/esign\/templates\/(new|\d+\/edit)(\/|$)/.test(location.pathname),
    [location.pathname],
  )

  const [tablesMissing, setTablesMissing] = useState(false)

  const checkHealth = useCallback(async () => {
    if (!token) return
    try {
      await esignApi.listTemplates(token)
      setTablesMissing(false)
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      setTablesMissing(/migrate|500|Database error|does not exist|relation/i.test(msg))
    }
  }, [token])

  useEffect(() => {
    void checkHealth()
  }, [checkHealth])

  if (isTemplateEditor) {
    return (
      <div className="esign-shell esign-shell--editor">
        {tablesMissing && (
          <div className="esign-db-banner" role="status">
            <strong>Database setup required.</strong> Run <code>python manage.py db migrate</code> then{' '}
            <code>python manage.py db seed</code>.
          </div>
        )}
        <Outlet />
      </div>
    )
  }

  return (
    <div className="esign-shell">
      <div className="esign-shell-body">
        <aside className="esign-sidenav" aria-label="E-sign sections">
          <div className="esign-sidenav-head">
            <p className="esign-sidenav-kicker">Settings</p>
            <h2 className="esign-sidenav-title">E-sign</h2>
            <p className="esign-sidenav-lead">Offers, NDAs, and agreements signed in-app.</p>
          </div>
          <nav className="esign-sidenav-nav">
            {esignNav.map(item => (
              <NavLink
                key={item.path}
                to={`${base}/${item.path}`}
                className={({ isActive }) => `esign-sidenav-link${isActive ? ' esign-sidenav-link--active' : ''}`}
                end={item.path === 'overview' || item.path === 'rules' || item.path === 'advanced'}
              >
                <span className="esign-sidenav-link-icon">
                  <EsignNavIcon name={item.icon} />
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
          {tablesMissing && (
            <div className="esign-db-banner" role="status">
              <strong>Database setup required.</strong> Run <code>python manage.py db migrate</code> then{' '}
              <code>python manage.py db seed</code> to enable e-sign tables.
            </div>
          )}
          <Outlet />
        </div>
      </div>
    </div>
  )
}

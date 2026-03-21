import { useCallback, useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { esignApi } from '../api/esign'

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

function EsignNavIcon({ name }: { name: (typeof NAV)[number]['icon'] }) {
  const a = { width: 20, height: 20, viewBox: '0 0 24 24' as const, fill: 'none' as const, stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true as const }
  switch (name) {
    case 'overview':
      return (
        <svg {...a}>
          <path d="M4 10.5L12 4l8 6.5V20a1 1 0 01-1 1h-5v-7H10v7H5a1 1 0 01-1-1v-9.5z" />
        </svg>
      )
    case 'templates':
      return (
        <svg {...a}>
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
          <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
        </svg>
      )
    case 'automation':
      return (
        <svg {...a}>
          <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
        </svg>
      )
    case 'advanced':
      return (
        <svg {...a}>
          <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
        </svg>
      )
    default:
      return null
  }
}

export default function EsignSettingsLayout() {
  const { accountId } = useParams<{ accountId: string }>()
  const location = useLocation()
  const { getToken } = useAuth()
  const token = getToken()
  const base = `/account/${accountId}/settings/esign`

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
            {NAV.map(item => (
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

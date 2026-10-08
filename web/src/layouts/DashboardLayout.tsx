import { useCallback, useMemo, useState } from 'react'
import { Outlet, useParams, useLocation, useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import Sidebar from '../components/Sidebar'
import PageHeader from '../components/PageHeader'
import { useAuth } from '../auth/AuthContext'
import { routeMeta } from '../constants/routeMeta'
import type { DashboardOutletContext } from './DashboardOutletContext'

export default function DashboardLayout() {
  const { accountId } = useParams<{ accountId: string }>()
  const { pathname } = useLocation()
  const { user, getToken, signOut } = useAuth()
  const navigate = useNavigate()
  const token = getToken() ?? ''

  const handleSignOut = () => {
    signOut()
    navigate('/login', { replace: true })
  }

  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const closeMobileNav = useCallback(() => setMobileNavOpen(false), [])
  const meta = useMemo(() => routeMeta(pathname), [pathname])

  /** Overview, pipeline, jobs hub, job editor wizard, template studio and structured hiring render their own headings. */
  const hideMainHeader =
    /^\/account\/\d+\/profile\/?$/.test(pathname) ||
    /^\/account\/\d+\/pipeline\/?$/.test(pathname) ||
    /^\/account\/\d+\/settings\/esign\/templates\/(new|\d+\/edit)/.test(pathname) ||
    /^\/account\/\d+\/jobs\/(all|mine)\/?$/.test(pathname) ||
    /^\/account\/\d+\/jobs\/role-kickoff/.test(pathname) ||
    /^\/account\/\d+\/jobs\/new\/?$/.test(pathname) ||
    /^\/account\/\d+\/jobs\/\d+\/edit/.test(pathname) ||
    /^\/account\/\d+\/structured-hiring/.test(pathname)

  /** Full-width light gray canvas for job editor + role kickoff wizard (no :has()). */
  const jobEditorWizard =
    /^\/account\/\d+\/jobs\/new\/?$/.test(pathname) ||
    /^\/account\/\d+\/jobs\/\d+\/edit/.test(pathname) ||
    /^\/account\/\d+\/jobs\/role-kickoff\/new\/?$/.test(pathname) ||
    /^\/account\/\d+\/jobs\/role-kickoff\/\d+\/edit\/?$/.test(pathname)

  const ctx: DashboardOutletContext = useMemo(
    () => ({
      token,
      user: user!,
      accountId: accountId!,
    }),
    [token, user, accountId],
  )

  if (!user || !accountId) {
    return (
      <div className="splash">
        <div className="spinner" aria-label="Loading" />
      </div>
    )
  }

  const home = `/account/${accountId}/profile`

  return (
    <div className="app-shell">
      <Sidebar accountId={accountId} mobileOpen={mobileNavOpen} onRequestClose={closeMobileNav} />

      <div className="app-frame">
        <Header user={user} accountHomePath={home} onSignOut={handleSignOut} onToggleNav={() => setMobileNavOpen(true)} />

        <main className="main-content" id="main">
          <div
            className={`main-body${hideMainHeader ? ' main-body--flush-top' : ''}${jobEditorWizard ? ' main-body--job-editor-wizard' : ''}`}
          >
            {!hideMainHeader ? <PageHeader icon={meta.icon} title={meta.title} subtitle={meta.subtitle} /> : null}
            <Outlet context={ctx} />
          </div>

          <Footer />
        </main>
      </div>
    </div>
  )
}

import { useMemo } from 'react'
import { Outlet, useParams, useLocation, useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import Sidebar from '../components/Sidebar'
import { useAuth } from '../auth/AuthContext'
import type { DashboardOutletContext } from './DashboardOutletContext'

function deriveTitle(pathname: string): string {
  if (pathname.includes('/jobs/new')) return 'New job'
  if (/\/jobs\/\d+\/edit/.test(pathname)) return 'Edit job'
  if (pathname.match(/\/account\/\d+\/jobs\/?$/)) return 'Jobs'
  if (pathname.includes('/hiring-plans')) return 'Hiring plans'
  if (pathname.includes('/pipeline')) return 'Pipeline'
  if (pathname.includes('/job-boards')) return 'Job Boards'
  if (pathname.includes('/postings')) return 'Postings'
  if (/\/job-applications\/\d+/.test(pathname)) return 'Candidate'
  if (pathname.includes('/job-applications')) return 'Applications'
  if (pathname.includes('/esign-documents')) return 'Signed documents'
  if (pathname.includes('/candidates')) return 'Candidates'
  if (pathname.includes('/interviews')) return 'Interviews'
  if (pathname.includes('/team')) return 'Team'
  if (pathname.includes('/settings/esign/templates/new')) return 'New template'
  if (/\/settings\/esign\/templates\/\d+\/edit/.test(pathname)) return 'Edit template'
  if (pathname.match(/\/settings\/esign\/templates\/?$/)) return 'Templates'
  if (pathname.includes('/settings/esign/rules')) return 'Automation'
  if (pathname.includes('/settings/esign/advanced')) return 'E-sign advanced'
  if (pathname.includes('/settings/esign/overview')) return 'E-sign overview'
  if (pathname.includes('/settings/esign')) return 'E-sign'
  if (pathname.includes('/settings/general/organization')) return 'Organization'
  if (pathname.includes('/settings/general/workspace')) return 'Workspace'
  if (pathname.includes('/settings/general/appearance')) return 'Typography'
  if (pathname.includes('/settings/custom-fields/candidates')) return 'Candidate fields'
  if (pathname.includes('/settings/custom-fields/jobs')) return 'Job fields'
  if (pathname.includes('/settings/custom-fields')) return 'Custom fields'
  if (pathname.includes('/settings/labels')) return 'Labels'
  if (pathname.includes('/settings/audit-compliance/delivery-failures')) return 'Audit delivery failures'
  if (pathname.includes('/settings/audit-compliance/audit-logs')) return 'Audit logs'
  if (pathname.includes('/settings/audit-compliance/overview')) return 'Audit & compliance'
  if (pathname.includes('/settings/audit-compliance')) return 'Audit & compliance'
  if (pathname.includes('/settings')) return 'Settings'
  if (pathname.includes('/profile')) return 'My Profile'
  return 'ATS'
}

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

  const title = useMemo(() => deriveTitle(pathname), [pathname])

  const ctx: DashboardOutletContext = useMemo(
    () => ({
      token,
      user: user!,
      accountId: accountId!,
    }),
    [token, user, accountId],
  )

  if (!user || !accountId) return null

  const home = `/account/${accountId}/profile`

  return (
    <div className="app-shell">
      <Header user={user} variant="app" accountHomePath={home} onSignOut={handleSignOut} />

      <div className="app-body">
        <Sidebar accountId={accountId} />

        <main className="main-content">
          <div className="main-header">
            <div className="main-header-left">
              <h1 className="main-title">{title}</h1>
              {pathname.includes('/profile') && (
                <div className="main-header-meta">
                  <span className={`status-badge status-${user.status}`}>{user.status}</span>
                  {user.role && <span className="tag tag-blue">{user.role.name}</span>}
                  {user.account?.plan && <span className="tag tag-orange">{user.account.plan}</span>}
                </div>
              )}
            </div>
            {pathname.includes('/profile') && (
              <div className="main-header-user">
                <div className="main-header-avatar">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} />
                  ) : (
                    user.name
                      .split(' ')
                      .map(w => w[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()
                  )}
                </div>
                <div>
                  <div className="main-header-name">{user.name}</div>
                  <div className="main-header-email">{user.email}</div>
                </div>
              </div>
            )}
          </div>

          <div className="main-body">
            <Outlet context={ctx} />
          </div>

          <Footer />
        </main>
      </div>
    </div>
  )
}

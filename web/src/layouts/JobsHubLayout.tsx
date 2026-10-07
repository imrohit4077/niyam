import { useMemo } from 'react'
import { NavLink, Outlet, useLocation, useOutletContext, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { navItemVisible, type NavId } from '../permissions'
import PageHeader from '../components/PageHeader'
import { routeMeta } from '../constants/routeMeta'
import { Icon, type IconName } from '../icons'
import type { DashboardOutletContext } from './DashboardOutletContext'

const TABS: { to: string; label: string; end?: boolean; navId: NavId; icon: IconName }[] = [
  { to: 'role-kickoff', label: 'Role kickoff', end: false, navId: 'jobs-role-kickoff', icon: 'kickoff' },
  { to: 'all', label: 'All jobs', end: true, navId: 'jobs-all', icon: 'jobs' },
  { to: 'mine', label: 'My jobs', end: true, navId: 'jobs-mine', icon: 'profile' },
]

export default function JobsHubLayout() {
  const { accountId } = useParams<{ accountId: string }>()
  const { pathname } = useLocation()
  const { user } = useAuth()
  const dashboardCtx = useOutletContext<DashboardOutletContext | undefined>()
  const base = `/account/${accountId}/jobs`
  const tabs = useMemo(() => TABS.filter(t => navItemVisible(user, t.navId)), [user])
  /** Full page header only on the hub's list views; deeper kickoff pages keep just the tabs. */
  const isListView = /\/jobs\/(all|mine|role-kickoff)\/?$/.test(pathname)
  const meta = routeMeta(pathname)

  const subnav = (
    <nav className="jobs-hub-subnav" aria-label="Jobs sections">
      {tabs.map(tab => (
        <NavLink
          key={tab.to}
          to={`${base}/${tab.to}`}
          end={tab.end}
          className={({ isActive }) => `jobs-hub-subnav-link${isActive ? ' jobs-hub-subnav-link--active' : ''}`}
        >
          <Icon name={tab.icon} size={15} />
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )

  return (
    <div className="jobs-hub-layout">
      {isListView ? (
        <PageHeader icon={meta.icon} title={meta.title} subtitle={meta.subtitle}>
          {subnav}
        </PageHeader>
      ) : (
        subnav
      )}
      <div className="jobs-hub-outlet">
        <Outlet context={dashboardCtx} />
      </div>
    </div>
  )
}

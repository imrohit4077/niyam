import { useMemo } from 'react'
import { NavLink, Outlet, useOutletContext, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { navItemVisible, type NavId } from '../permissions'
import type { DashboardOutletContext } from './DashboardOutletContext'

const TABS: { to: string; label: string; end?: boolean; navId: NavId }[] = [
  { to: 'role-kickoff', label: 'Role kickoff', end: false, navId: 'jobs-role-kickoff' },
  { to: 'all', label: 'All jobs', end: true, navId: 'jobs-all' },
  { to: 'mine', label: 'My jobs', end: true, navId: 'jobs-mine' },
]

export default function JobsHubLayout() {
  const { accountId } = useParams<{ accountId: string }>()
  const { user } = useAuth()
  const dashboardCtx = useOutletContext<DashboardOutletContext | undefined>()
  const base = `/account/${accountId}/jobs`
  const tabs = useMemo(() => TABS.filter(t => navItemVisible(user, t.navId)), [user])

  return (
    <div className="jobs-hub-layout">
      <nav className="jobs-hub-subnav" aria-label="Jobs sections">
        {tabs.map(tab => (
          <NavLink
            key={tab.to}
            to={`${base}/${tab.to}`}
            end={tab.end}
            className={({ isActive }) => `jobs-hub-subnav-link${isActive ? ' jobs-hub-subnav-link--active' : ''}`}
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
      <div className="jobs-hub-outlet">
        <Outlet context={dashboardCtx} />
      </div>
    </div>
  )
}

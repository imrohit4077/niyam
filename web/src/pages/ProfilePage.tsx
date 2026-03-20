import { useState } from 'react'
import type { UserData } from '../api/auth'
import Header from '../components/Header'
import Footer from '../components/Footer'
import Sidebar, { type SidebarPage } from '../components/Sidebar'
import { PageView } from '../components/PageViews'

interface Props {
  user: UserData
  token: string
  onSignOut: () => void
}

const PAGE_TITLES: Record<SidebarPage, string> = {
  'profile':           'My Profile',
  'jobs':              'Jobs',
  'hiring-plans':      'Hiring plans',
  'pipeline':          'Pipeline',
  'job-boards':        'Job Boards',
  'postings':          'Postings',
  'job-applications':  'Applications',
  'candidates':        'Candidates',
  'interviews':        'Interviews',
  'team':              'Team',
  'settings':          'Settings',
}

export default function ProfilePage({ user, token, onSignOut }: Props) {
  const [page, setPage] = useState<SidebarPage>('profile')

  return (
    <div className="app-shell">
      <Header user={user} onSignOut={onSignOut} variant="app" />

      <div className="app-body">
        <Sidebar active={page} onChange={setPage} />

        <main className="main-content">
          <div className="main-header">
            <div className="main-header-left">
              <h1 className="main-title">{PAGE_TITLES[page]}</h1>
              {page === 'profile' && (
                <div className="main-header-meta">
                  <span className={`status-badge status-${user.status}`}>{user.status}</span>
                  {user.role && <span className="tag tag-blue">{user.role.name}</span>}
                  {user.account?.plan && <span className="tag tag-orange">{user.account.plan}</span>}
                </div>
              )}
            </div>
            {page === 'profile' && (
              <div className="main-header-user">
                <div className="main-header-avatar">
                  {user.avatar
                    ? <img src={user.avatar} alt={user.name} />
                    : user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
                  }
                </div>
                <div>
                  <div className="main-header-name">{user.name}</div>
                  <div className="main-header-email">{user.email}</div>
                </div>
              </div>
            )}
          </div>

          <div className="main-body">
            <PageView page={page} user={user} token={token} />
          </div>

          <Footer />
        </main>
      </div>
    </div>
  )
}

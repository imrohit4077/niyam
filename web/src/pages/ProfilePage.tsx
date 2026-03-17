import { useState } from 'react'
import type { UserData } from '../api/auth'
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
  'job-boards':        'Job Boards',
  'postings':          'Postings',
  'job-applications':  'Applications',
  'candidates':        'Candidates',
  'interviews':        'Interviews',
  'team':              'Team',
  'settings':          'Settings',
}

function BrandIcon() {
  return (
    <div className="topnav-brand-icon">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M3 13L8 3L13 13H10L8 9L6 13H3Z" fill="white" />
      </svg>
    </div>
  )
}

function UserAvatar({ name, avatar }: { name: string; avatar: string | null }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  if (avatar) return <div className="topnav-avatar"><img src={avatar} alt={name} /></div>
  return <div className="topnav-avatar">{initials}</div>
}

export default function ProfilePage({ user, token, onSignOut }: Props) {
  const [page, setPage] = useState<SidebarPage>('profile')

  return (
    <div className="app-shell">
      {/* ── Top nav ── */}
      <nav className="topnav">
        <div className="topnav-brand">
          <BrandIcon />
          ForgeAPI
        </div>
        <div className="topnav-right">
          <span className="topnav-username">{user.name}</span>
          <button className="btn-nav" onClick={onSignOut}>Sign out</button>
          <UserAvatar name={user.name} avatar={user.avatar} />
        </div>
      </nav>

      {/* ── Body: sidebar + main ── */}
      <div className="app-body">
        <Sidebar active={page} onChange={setPage} />

        <main className="main-content">
          {/* Page header */}
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

          {/* Page content */}
          <div className="main-body">
            <PageView page={page} user={user} token={token} />
          </div>
        </main>
      </div>
    </div>
  )
}

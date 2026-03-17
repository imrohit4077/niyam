import type { UserData } from '../api/auth'
import type { SidebarPage } from './Sidebar'

// ── Shared sub-components ──────────────────────────────────────────

function PanelIcon({ type }: { type: 'user' | 'building' | 'shield' | 'clock' | 'briefcase' | 'document' | 'people' | 'calendar' | 'team' | 'gear' }) {
  const paths: Record<string, string> = {
    user:      'M12 12a5 5 0 100-10 5 5 0 000 10zm-7 8a7 7 0 0114 0H5z',
    building:  'M3 21V7l9-4 9 4v14H3zm6-2h6v-4H9v4zm0-6h2V9H9v4zm4 0h2V9h-2v4z',
    shield:    'M12 2L4 5v6c0 5.25 3.5 10.15 8 11.35C16.5 21.15 20 16.25 20 11V5l-8-3z',
    clock:     'M12 2a10 10 0 100 20A10 10 0 0012 2zm1 11H7v-2h4V7h2v6z',
    briefcase: 'M20 7h-4V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2H4a2 2 0 00-2 2v11a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zm-10-2h4v2h-4V5zm10 14H4V9h16v10z',
    document:  'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM6 20V4h5v7h7v9H6z',
    people:    'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
    calendar:  'M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zm0 16H5V9h14v11zM7 11h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z',
    team:      'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z',
    gear:      'M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.49.49 0 00-.59-.22l-2.39.96a7.02 7.02 0 00-1.62-.94l-.36-2.54A.484.484 0 0014 2h-4a.484.484 0 00-.48.41l-.36 2.54a7.4 7.4 0 00-1.62.94l-2.39-.96a.48.48 0 00-.59.22L2.74 8.87a.47.47 0 00.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.47.47 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.36 1.04.67 1.62.94l.36 2.54c.05.24.27.41.48.41h4c.24 0 .44-.17.47-.41l.36-2.54a7.4 7.4 0 001.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.47.47 0 00-.12-.61l-2.01-1.58zM12 15.6a3.6 3.6 0 110-7.2 3.6 3.6 0 010 7.2z',
  }
  return (
    <svg className="panel-header-icon" width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d={paths[type]} />
    </svg>
  )
}

function Panel({ icon, title, children }: { icon: Parameters<typeof PanelIcon>[0]['type']; title: string; children: React.ReactNode }) {
  return (
    <div className="panel">
      <div className="panel-header">
        <PanelIcon type={icon} />
        <span className="panel-header-title">{title}</span>
      </div>
      <div className="panel-body">{children}</div>
    </div>
  )
}

function PanelRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="panel-row">
      <span className="panel-row-label">{label}</span>
      <span className="panel-row-value">{value}</span>
    </div>
  )
}

function EmptyView({ icon, title, sub }: { icon: Parameters<typeof PanelIcon>[0]['type']; title: string; sub: string }) {
  return (
    <div className="empty-view">
      <div className="empty-view-icon">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d={
            icon === 'briefcase' ? 'M20 7h-4V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2H4a2 2 0 00-2 2v11a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zm-10-2h4v2h-4V5zm10 14H4V9h16v10z' :
            icon === 'document'  ? 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM6 20V4h5v7h7v9H6z' :
            icon === 'people'    ? 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z' :
            icon === 'calendar'  ? 'M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zm0 16H5V9h14v11zM7 11h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z' :
            'M12 12a5 5 0 100-10 5 5 0 000 10zm-7 8a7 7 0 0114 0H5z'
          } />
        </svg>
      </div>
      <div className="empty-view-title">{title}</div>
      <div className="empty-view-sub">{sub}</div>
    </div>
  )
}

// ── Page views ─────────────────────────────────────────────────────

function ProfileView({ user }: { user: UserData }) {
  const memberSince = new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const lastLogin = user.last_login_at
    ? new Date(user.last_login_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    : '—'

  return (
    <>
      {/* Stats row */}
      <div className="stats-row">
        <div className="stat-cell active">
          <div className="stat-value">{user.id}</div>
          <div className="stat-label">User ID</div>
        </div>
        <div className="stat-cell">
          <div className="stat-value">{user.account ? '1' : '0'}</div>
          <div className="stat-label">Accounts</div>
        </div>
        <div className="stat-cell">
          <div className="stat-value">{user.role ? '1' : '0'}</div>
          <div className="stat-label">Roles</div>
        </div>
        <div className="stat-cell">
          <div className={`stat-value ${user.status !== 'active' ? 'muted' : ''}`}>
            {user.status === 'active' ? '✓' : '✗'}
          </div>
          <div className="stat-label">Active</div>
        </div>
        <div className="stat-cell">
          <div className="stat-value" style={{ fontSize: 13, paddingTop: 4 }}>
            {new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
          </div>
          <div className="stat-label">Member Since</div>
        </div>
      </div>

      <div className="panels-grid">
        <Panel icon="building" title="Account">
          {user.account ? (
            <>
              <PanelRow label="Name" value={user.account.name} />
              <PanelRow label="Slug" value={<code>{user.account.slug}</code>} />
              <PanelRow label="Plan" value={user.account.plan ? <span className="tag tag-orange">{user.account.plan}</span> : '—'} />
            </>
          ) : <div className="empty-state">No account linked</div>}
        </Panel>

        <Panel icon="shield" title="Role & Permissions">
          {user.role ? (
            <>
              <PanelRow label="Role" value={user.role.name} />
              <PanelRow label="Slug" value={<code>{user.role.slug}</code>} />
              <PanelRow label="Access" value={<span className="tag tag-green">Granted</span>} />
            </>
          ) : <div className="empty-state">No role assigned</div>}
        </Panel>

        <Panel icon="clock" title="Activity">
          <PanelRow label="Last Login" value={lastLogin} />
          <PanelRow label="Member Since" value={memberSince} />
          <PanelRow label="Status" value={<span className={`status-badge status-${user.status}`}>{user.status}</span>} />
        </Panel>
      </div>
    </>
  )
}

// Stub list view used for non-profile pages
const STUB_APPLICATIONS = [
  { id: 1, role: 'Senior Frontend Engineer', company: 'Acme Corp', stage: 'Interview', location: 'San Francisco', type: 'Full-Time' },
  { id: 2, role: 'Product Designer',         company: 'Acme Corp', stage: 'Offer',     location: 'Remote',        type: 'Full-Time' },
  { id: 3, role: 'Backend Engineer',         company: 'Acme Corp', stage: 'Applied',   location: 'New York',      type: 'Contract' },
  { id: 4, role: 'DevOps Engineer',          company: 'Acme Corp', stage: 'Screening', location: 'Austin',        type: 'Full-Time' },
]

const STUB_PROFILES = [
  { id: 1, title: 'Senior Frontend Engineer', dept: 'Engineering', openings: 2, status: 'Open' },
  { id: 2, title: 'Product Designer',         dept: 'Design',      openings: 1, status: 'Open' },
  { id: 3, title: 'Backend Engineer',         dept: 'Engineering', openings: 3, status: 'Closed' },
]

const STUB_CANDIDATES = [
  { id: 1, name: 'Jordan Lee',    role: 'Senior Frontend Engineer', stage: 'Interview',  source: 'LinkedIn' },
  { id: 2, name: 'Alex Rivera',   role: 'Product Designer',         stage: 'Offer',      source: 'Referral' },
  { id: 3, name: 'Sam Patel',     role: 'Backend Engineer',         stage: 'Applied',    source: 'Indeed' },
  { id: 4, name: 'Morgan Chen',   role: 'DevOps Engineer',          stage: 'Screening',  source: 'LinkedIn' },
  { id: 5, name: 'Taylor Brooks', role: 'Senior Frontend Engineer', stage: 'Hired',      source: 'Referral' },
]

const STUB_INTERVIEWS = [
  { id: 1, candidate: 'Jordan Lee',  role: 'Senior Frontend Engineer', date: 'Mar 20, 2026', time: '10:00 AM', type: 'Technical' },
  { id: 2, candidate: 'Alex Rivera', role: 'Product Designer',         date: 'Mar 21, 2026', time: '2:00 PM',  type: 'Culture Fit' },
  { id: 3, candidate: 'Sam Patel',   role: 'Backend Engineer',         date: 'Mar 22, 2026', time: '11:30 AM', type: 'HM Screen' },
]

const STAGE_COLORS: Record<string, string> = {
  Applied: 'tag-blue', Screening: 'tag-orange', Interview: 'tag-blue',
  Offer: 'tag-green', Hired: 'tag-green', Closed: 'tag-gray',
}

function ListHeader({ title, count, action }: { title: string; count: number; action: string }) {
  return (
    <div className="list-header">
      <div className="list-header-left">
        <span className="list-header-title">{title}</span>
        <span className="list-header-count">{count}</span>
      </div>
      <button className="btn-action">{action}</button>
    </div>
  )
}

function JobApplicationsView() {
  return (
    <>
      <ListHeader title="Job Applications" count={STUB_APPLICATIONS.length} action="+ New Application" />
      <div className="list-table">
        <div className="list-table-head">
          <div className="list-col list-col-main">Role</div>
          <div className="list-col">Stage</div>
          <div className="list-col">Location</div>
          <div className="list-col">Type</div>
        </div>
        {STUB_APPLICATIONS.map(a => (
          <div key={a.id} className="list-row">
            <div className="list-col list-col-main">
              <div className="list-row-name">{a.role}</div>
              <div className="list-row-sub">{a.company}</div>
            </div>
            <div className="list-col">
              <span className={`tag ${STAGE_COLORS[a.stage] ?? 'tag-blue'}`}>{a.stage}</span>
            </div>
            <div className="list-col list-row-sub">{a.location}</div>
            <div className="list-col list-row-sub">{a.type}</div>
          </div>
        ))}
      </div>
    </>
  )
}

function JobProfilesView() {
  return (
    <>
      <ListHeader title="Job Profiles" count={STUB_PROFILES.length} action="+ New Profile" />
      <div className="list-table">
        <div className="list-table-head">
          <div className="list-col list-col-main">Title</div>
          <div className="list-col">Department</div>
          <div className="list-col">Openings</div>
          <div className="list-col">Status</div>
        </div>
        {STUB_PROFILES.map(p => (
          <div key={p.id} className="list-row">
            <div className="list-col list-col-main">
              <div className="list-row-name">{p.title}</div>
            </div>
            <div className="list-col list-row-sub">{p.dept}</div>
            <div className="list-col">
              <span className="stat-pill">{p.openings}</span>
            </div>
            <div className="list-col">
              <span className={`tag ${p.status === 'Open' ? 'tag-green' : 'tag-gray'}`}>{p.status}</span>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

function CandidatesView() {
  return (
    <>
      <ListHeader title="Candidates" count={STUB_CANDIDATES.length} action="+ Add Candidate" />
      <div className="list-table">
        <div className="list-table-head">
          <div className="list-col list-col-main">Candidate</div>
          <div className="list-col">Role</div>
          <div className="list-col">Stage</div>
          <div className="list-col">Source</div>
        </div>
        {STUB_CANDIDATES.map(c => (
          <div key={c.id} className="list-row">
            <div className="list-col list-col-main">
              <div className="candidate-avatar">{c.name.split(' ').map(w => w[0]).join('')}</div>
              <div>
                <div className="list-row-name">{c.name}</div>
              </div>
            </div>
            <div className="list-col list-row-sub">{c.role}</div>
            <div className="list-col">
              <span className={`tag ${STAGE_COLORS[c.stage] ?? 'tag-blue'}`}>{c.stage}</span>
            </div>
            <div className="list-col list-row-sub">{c.source}</div>
          </div>
        ))}
      </div>
    </>
  )
}

function InterviewsView() {
  return (
    <>
      <ListHeader title="Interviews" count={STUB_INTERVIEWS.length} action="+ Schedule" />
      <div className="list-table">
        <div className="list-table-head">
          <div className="list-col list-col-main">Candidate</div>
          <div className="list-col">Role</div>
          <div className="list-col">Date</div>
          <div className="list-col">Type</div>
        </div>
        {STUB_INTERVIEWS.map(i => (
          <div key={i.id} className="list-row">
            <div className="list-col list-col-main">
              <div className="candidate-avatar">{i.candidate.split(' ').map(w => w[0]).join('')}</div>
              <div>
                <div className="list-row-name">{i.candidate}</div>
                <div className="list-row-sub">{i.time}</div>
              </div>
            </div>
            <div className="list-col list-row-sub">{i.role}</div>
            <div className="list-col list-row-sub">{i.date}</div>
            <div className="list-col">
              <span className="tag tag-blue">{i.type}</span>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

function TeamView() {
  return <EmptyView icon="people" title="Team Members" sub="Invite teammates to collaborate on your workspace." />
}

function SettingsView() {
  return <EmptyView icon="gear" title="Settings" sub="Workspace and account settings coming soon." />
}

// ── Router ─────────────────────────────────────────────────────────

export function PageView({ page, user }: { page: SidebarPage; user: UserData }) {
  switch (page) {
    case 'profile':          return <ProfileView user={user} />
    case 'job-applications': return <JobApplicationsView />
    case 'job-profiles':     return <JobProfilesView />
    case 'candidates':       return <CandidatesView />
    case 'interviews':       return <InterviewsView />
    case 'team':             return <TeamView />
    case 'settings':         return <SettingsView />
  }
}

import { useState, useEffect, useCallback } from 'react'
import type { UserData } from '../api/auth'
import type { SidebarPage } from './Sidebar'
import { jobsApi } from '../api/jobs'
import type { Job } from '../api/jobs'
import { boardsApi } from '../api/boards'
import type { JobBoard } from '../api/boards'
import { postingsApi } from '../api/postings'
import type { JobPosting } from '../api/postings'
import { applicationsApi } from '../api/applications'
import type { Application } from '../api/applications'

// ── Shared UI primitives ───────────────────────────────────────────

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
      <div className="panel-header"><PanelIcon type={icon} /><span className="panel-header-title">{title}</span></div>
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

function ListHeader({ title, count, onAction, actionLabel = '+ New' }: { title: string; count: number; onAction?: () => void; actionLabel?: string }) {
  return (
    <div className="list-header">
      <div className="list-header-left">
        <span className="list-header-title">{title}</span>
        <span className="list-header-count">{count}</span>
      </div>
      {onAction && <button className="btn-action" onClick={onAction}>{actionLabel}</button>}
    </div>
  )
}

function LoadingRow() {
  return <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>Loading…</div>
}

function ErrorRow({ msg }: { msg: string }) {
  return <div style={{ padding: '16px', color: 'var(--error)', fontSize: 12 }}>{msg}</div>
}

const STAGE_COLORS: Record<string, string> = {
  applied: 'tag-blue', screening: 'tag-orange', interview: 'tag-blue',
  offer: 'tag-green', hired: 'tag-green', rejected: 'tag-gray', withdrawn: 'tag-gray',
  draft: 'tag-gray', open: 'tag-green', closed: 'tag-gray', paused: 'tag-orange',
  pending: 'tag-orange', posted: 'tag-green', failed: 'tag-red',
}

// ── Modal shell ────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  )
}

// ── Profile view ───────────────────────────────────────────────────

function ProfileView({ user }: { user: UserData }) {
  const memberSince = new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const lastLogin = user.last_login_at
    ? new Date(user.last_login_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    : '—'
  return (
    <>
      <div className="stats-row">
        <div className="stat-cell active"><div className="stat-value">{user.id}</div><div className="stat-label">User ID</div></div>
        <div className="stat-cell"><div className="stat-value">{user.account ? '1' : '0'}</div><div className="stat-label">Accounts</div></div>
        <div className="stat-cell"><div className="stat-value">{user.role ? '1' : '0'}</div><div className="stat-label">Roles</div></div>
        <div className="stat-cell"><div className={`stat-value ${user.status !== 'active' ? 'muted' : ''}`}>{user.status === 'active' ? '✓' : '✗'}</div><div className="stat-label">Active</div></div>
        <div className="stat-cell"><div className="stat-value" style={{ fontSize: 13, paddingTop: 4 }}>{new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</div><div className="stat-label">Member Since</div></div>
      </div>
      <div className="panels-grid">
        <Panel icon="building" title="Account">
          {user.account ? (
            <><PanelRow label="Name" value={user.account.name} /><PanelRow label="Slug" value={<code>{user.account.slug}</code>} /><PanelRow label="Plan" value={user.account.plan ? <span className="tag tag-orange">{user.account.plan}</span> : '—'} /></>
          ) : <div className="empty-state">No account linked</div>}
        </Panel>
        <Panel icon="shield" title="Role & Permissions">
          {user.role ? (
            <><PanelRow label="Role" value={user.role.name} /><PanelRow label="Slug" value={<code>{user.role.slug}</code>} /><PanelRow label="Access" value={<span className="tag tag-green">Granted</span>} /></>
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

// ── Jobs view ──────────────────────────────────────────────────────

function JobForm({ token, job, onSave, onClose }: { token: string; job?: Job; onSave: () => void; onClose: () => void }) {
  const [form, setForm] = useState({
    title: job?.title ?? '',
    department: job?.department ?? '',
    location: job?.location ?? '',
    location_type: job?.location_type ?? 'onsite',
    employment_type: job?.employment_type ?? 'full_time',
    status: job?.status ?? 'draft',
    description: '',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    setSaving(true); setErr('')
    try {
      if (job) {
        await jobsApi.update(token, job.id, form)
      } else {
        await jobsApi.create(token, form)
      }
      onSave()
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={job ? 'Edit Job' : 'New Job'} onClose={onClose}>
      {err && <div className="auth-error">{err}</div>}
      <FormField label="Job Title *"><input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Senior Engineer" /></FormField>
      <FormField label="Department"><input value={form.department} onChange={e => set('department', e.target.value)} placeholder="Engineering" /></FormField>
      <FormField label="Location"><input value={form.location} onChange={e => set('location', e.target.value)} placeholder="San Francisco, CA" /></FormField>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <FormField label="Location Type">
          <select value={form.location_type} onChange={e => set('location_type', e.target.value)}>
            <option value="onsite">On-site</option>
            <option value="remote">Remote</option>
            <option value="hybrid">Hybrid</option>
          </select>
        </FormField>
        <FormField label="Employment Type">
          <select value={form.employment_type} onChange={e => set('employment_type', e.target.value)}>
            <option value="full_time">Full-time</option>
            <option value="part_time">Part-time</option>
            <option value="contract">Contract</option>
            <option value="internship">Internship</option>
          </select>
        </FormField>
      </div>
      <FormField label="Status">
        <select value={form.status} onChange={e => set('status', e.target.value)}>
          <option value="draft">Draft</option>
          <option value="open">Open</option>
          <option value="paused">Paused</option>
          <option value="closed">Closed</option>
        </select>
      </FormField>
      {!job && <FormField label="Description"><textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="Job description…" rows={4} style={{ width: '100%', resize: 'vertical', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 3, fontFamily: 'inherit', fontSize: 13 }} /></FormField>}
      <button className="btn-primary" onClick={submit} disabled={saving}>{saving ? 'Saving…' : job ? 'Update Job' : 'Create Job'}</button>
    </Modal>
  )
}

function JobsView({ token }: { token: string }) {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Job | undefined>()

  const load = useCallback(async () => {
    setLoading(true); setErr('')
    try { setJobs(await jobsApi.list(token)) } catch (e: unknown) { setErr(e instanceof Error ? e.message : 'Failed') } finally { setLoading(false) }
  }, [token])

  useEffect(() => { load() }, [load])

  const del = async (id: number) => {
    if (!confirm('Delete this job?')) return
    try { await jobsApi.delete(token, id); load() } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Failed') }
  }

  return (
    <>
      {(showForm || editing) && <JobForm token={token} job={editing} onSave={() => { setShowForm(false); setEditing(undefined); load() }} onClose={() => { setShowForm(false); setEditing(undefined) }} />}
      <ListHeader title="Jobs" count={jobs.length} onAction={() => setShowForm(true)} actionLabel="+ New Job" />
      <div className="list-table">
        <div className="list-table-head">
          <div className="list-col list-col-main">Title</div>
          <div className="list-col">Department</div>
          <div className="list-col">Location</div>
          <div className="list-col">Status</div>
          <div className="list-col">Actions</div>
        </div>
        {loading && <LoadingRow />}
        {err && <ErrorRow msg={err} />}
        {!loading && !err && jobs.length === 0 && <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>No jobs yet. Create your first job.</div>}
        {jobs.map(j => (
          <div key={j.id} className="list-row">
            <div className="list-col list-col-main"><div className="list-row-name">{j.title}</div><div className="list-row-sub">{j.slug}</div></div>
            <div className="list-col list-row-sub">{j.department || '—'}</div>
            <div className="list-col list-row-sub">{j.location || '—'}</div>
            <div className="list-col"><span className={`tag ${STAGE_COLORS[j.status] ?? 'tag-gray'}`}>{j.status}</span></div>
            <div className="list-col" style={{ display: 'flex', gap: 6 }}>
              <button className="btn-row-action" onClick={() => setEditing(j)}>Edit</button>
              <button className="btn-row-action btn-row-danger" onClick={() => del(j.id)}>Del</button>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

// ── Job Boards view ────────────────────────────────────────────────

function BoardForm({ token, board, onSave, onClose }: { token: string; board?: JobBoard; onSave: () => void; onClose: () => void }) {
  const [form, setForm] = useState({
    name: board?.name ?? '',
    website_url: board?.website_url ?? '',
    integration_type: board?.integration_type ?? 'manual',
    is_active: board?.is_active ?? true,
    is_premium: board?.is_premium ?? false,
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    setSaving(true); setErr('')
    try {
      if (board) { await boardsApi.update(token, board.id, form) }
      else { await boardsApi.create(token, form) }
      onSave()
    } catch (e: unknown) { setErr(e instanceof Error ? e.message : 'Failed') } finally { setSaving(false) }
  }

  return (
    <Modal title={board ? 'Edit Board' : 'New Job Board'} onClose={onClose}>
      {err && <div className="auth-error">{err}</div>}
      <FormField label="Board Name *"><input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. LinkedIn" /></FormField>
      <FormField label="Website URL"><input value={form.website_url} onChange={e => set('website_url', e.target.value)} placeholder="https://linkedin.com" /></FormField>
      <FormField label="Integration Type">
        <select value={form.integration_type} onChange={e => set('integration_type', e.target.value)}>
          <option value="manual">Manual</option>
          <option value="api">API</option>
          <option value="xml_feed">XML Feed</option>
          <option value="email">Email</option>
        </select>
      </FormField>
      <div style={{ display: 'flex', gap: 16, marginBottom: 14 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
          <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} /> Active
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
          <input type="checkbox" checked={form.is_premium} onChange={e => set('is_premium', e.target.checked)} /> Premium
        </label>
      </div>
      <button className="btn-primary" onClick={submit} disabled={saving}>{saving ? 'Saving…' : board ? 'Update Board' : 'Create Board'}</button>
    </Modal>
  )
}

function JobBoardsView({ token }: { token: string }) {
  const [boards, setBoards] = useState<JobBoard[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<JobBoard | undefined>()

  const load = useCallback(async () => {
    setLoading(true); setErr('')
    try { setBoards(await boardsApi.list(token)) } catch (e: unknown) { setErr(e instanceof Error ? e.message : 'Failed') } finally { setLoading(false) }
  }, [token])

  useEffect(() => { load() }, [load])

  const del = async (id: number) => {
    if (!confirm('Delete this board?')) return
    try { await boardsApi.delete(token, id); load() } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Failed') }
  }

  return (
    <>
      {(showForm || editing) && <BoardForm token={token} board={editing} onSave={() => { setShowForm(false); setEditing(undefined); load() }} onClose={() => { setShowForm(false); setEditing(undefined) }} />}
      <ListHeader title="Job Boards" count={boards.length} onAction={() => setShowForm(true)} actionLabel="+ New Board" />
      <div className="list-table">
        <div className="list-table-head">
          <div className="list-col list-col-main">Board</div>
          <div className="list-col">Integration</div>
          <div className="list-col">Status</div>
          <div className="list-col">Actions</div>
        </div>
        {loading && <LoadingRow />}
        {err && <ErrorRow msg={err} />}
        {!loading && !err && boards.length === 0 && <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>No boards yet.</div>}
        {boards.map(b => (
          <div key={b.id} className="list-row">
            <div className="list-col list-col-main">
              <div className="list-row-name">{b.name}</div>
              <div className="list-row-sub">{b.website_url || b.slug}</div>
            </div>
            <div className="list-col list-row-sub">{b.integration_type}</div>
            <div className="list-col">
              <span className={`tag ${b.is_active ? 'tag-green' : 'tag-gray'}`}>{b.is_active ? 'Active' : 'Inactive'}</span>
              {b.is_premium && <span className="tag tag-orange" style={{ marginLeft: 4 }}>Premium</span>}
            </div>
            <div className="list-col" style={{ display: 'flex', gap: 6 }}>
              <button className="btn-row-action" onClick={() => setEditing(b)}>Edit</button>
              <button className="btn-row-action btn-row-danger" onClick={() => del(b.id)}>Del</button>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

// ── Postings view ──────────────────────────────────────────────────

function PostingForm({ token, onSave, onClose }: { token: string; onSave: () => void; onClose: () => void }) {
  const [jobs, setJobs] = useState<import('../api/jobs').Job[]>([])
  const [boards, setBoards] = useState<JobBoard[]>([])
  const [form, setForm] = useState({ job_id: '', board_id: '' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    Promise.all([jobsApi.list(token), boardsApi.list(token, true)])
      .then(([j, b]) => { setJobs(j); setBoards(b) })
      .catch(() => {})
  }, [token])

  const submit = async () => {
    if (!form.job_id || !form.board_id) { setErr('Select a job and board'); return }
    setSaving(true); setErr('')
    try {
      await postingsApi.create(token, { job_id: Number(form.job_id), board_id: Number(form.board_id) })
      onSave()
    } catch (e: unknown) { setErr(e instanceof Error ? e.message : 'Failed') } finally { setSaving(false) }
  }

  return (
    <Modal title="Post Job to Board" onClose={onClose}>
      {err && <div className="auth-error">{err}</div>}
      <FormField label="Job *">
        <select value={form.job_id} onChange={e => setForm(f => ({ ...f, job_id: e.target.value }))}>
          <option value="">Select a job…</option>
          {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
        </select>
      </FormField>
      <FormField label="Job Board *">
        <select value={form.board_id} onChange={e => setForm(f => ({ ...f, board_id: e.target.value }))}>
          <option value="">Select a board…</option>
          {boards.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </FormField>
      <button className="btn-primary" onClick={submit} disabled={saving}>{saving ? 'Posting…' : 'Post Job'}</button>
    </Modal>
  )
}

function PostingsView({ token }: { token: string }) {
  const [postings, setPostings] = useState<JobPosting[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [showForm, setShowForm] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setErr('')
    try { setPostings(await postingsApi.list(token)) } catch (e: unknown) { setErr(e instanceof Error ? e.message : 'Failed') } finally { setLoading(false) }
  }, [token])

  useEffect(() => { load() }, [load])

  const del = async (id: number) => {
    if (!confirm('Remove this posting?')) return
    try { await postingsApi.delete(token, id); load() } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Failed') }
  }

  return (
    <>
      {showForm && <PostingForm token={token} onSave={() => { setShowForm(false); load() }} onClose={() => setShowForm(false)} />}
      <ListHeader title="Job Postings" count={postings.length} onAction={() => setShowForm(true)} actionLabel="+ Post Job" />
      <div className="list-table">
        <div className="list-table-head">
          <div className="list-col list-col-main">Job ID</div>
          <div className="list-col">Board ID</div>
          <div className="list-col">Status</div>
          <div className="list-col">Posted At</div>
          <div className="list-col">Actions</div>
        </div>
        {loading && <LoadingRow />}
        {err && <ErrorRow msg={err} />}
        {!loading && !err && postings.length === 0 && <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>No postings yet.</div>}
        {postings.map(p => (
          <div key={p.id} className="list-row">
            <div className="list-col list-col-main"><div className="list-row-name">Job #{p.job_id}</div></div>
            <div className="list-col list-row-sub">Board #{p.board_id}</div>
            <div className="list-col"><span className={`tag ${STAGE_COLORS[p.status] ?? 'tag-gray'}`}>{p.status}</span></div>
            <div className="list-col list-row-sub">{p.posted_at ? new Date(p.posted_at).toLocaleDateString() : '—'}</div>
            <div className="list-col">
              <button className="btn-row-action btn-row-danger" onClick={() => del(p.id)}>Remove</button>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

// ── Applications view ──────────────────────────────────────────────

function ApplicationForm({ token, onSave, onClose }: { token: string; onSave: () => void; onClose: () => void }) {
  const [jobs, setJobs] = useState<import('../api/jobs').Job[]>([])
  const [form, setForm] = useState({ job_id: '', candidate_name: '', candidate_email: '', candidate_phone: '', cover_letter: '' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    jobsApi.list(token).then(setJobs).catch(() => {})
  }, [token])

  const submit = async () => {
    if (!form.job_id || !form.candidate_email) { setErr('Job and email are required'); return }
    setSaving(true); setErr('')
    try {
      await applicationsApi.create(token, { job_id: Number(form.job_id), candidate_email: form.candidate_email, candidate_name: form.candidate_name, candidate_phone: form.candidate_phone, cover_letter: form.cover_letter })
      onSave()
    } catch (e: unknown) { setErr(e instanceof Error ? e.message : 'Failed') } finally { setSaving(false) }
  }

  return (
    <Modal title="New Application" onClose={onClose}>
      {err && <div className="auth-error">{err}</div>}
      <FormField label="Job *">
        <select value={form.job_id} onChange={e => set('job_id', e.target.value)}>
          <option value="">Select a job…</option>
          {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
        </select>
      </FormField>
      <FormField label="Candidate Name"><input value={form.candidate_name} onChange={e => set('candidate_name', e.target.value)} placeholder="Full name" /></FormField>
      <FormField label="Email *"><input type="email" value={form.candidate_email} onChange={e => set('candidate_email', e.target.value)} placeholder="candidate@email.com" /></FormField>
      <FormField label="Phone"><input value={form.candidate_phone} onChange={e => set('candidate_phone', e.target.value)} placeholder="+1 555 000 0000" /></FormField>
      <FormField label="Cover Letter"><textarea value={form.cover_letter} onChange={e => set('cover_letter', e.target.value)} rows={3} placeholder="Optional cover letter…" style={{ width: '100%', resize: 'vertical', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 3, fontFamily: 'inherit', fontSize: 13 }} /></FormField>
      <button className="btn-primary" onClick={submit} disabled={saving}>{saving ? 'Submitting…' : 'Submit Application'}</button>
    </Modal>
  )
}

const STAGES = ['applied', 'screening', 'interview', 'offer', 'hired', 'rejected', 'withdrawn']

function ApplicationsView({ token }: { token: string }) {
  const [apps, setApps] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [stageTarget, setStageTarget] = useState<Application | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setErr('')
    try { setApps(await applicationsApi.list(token)) } catch (e: unknown) { setErr(e instanceof Error ? e.message : 'Failed') } finally { setLoading(false) }
  }, [token])

  useEffect(() => { load() }, [load])

  const moveStage = async (app: Application, status: string) => {
    try { await applicationsApi.updateStage(token, app.id, status); load() } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Failed') }
    setStageTarget(null)
  }

  const del = async (id: number) => {
    if (!confirm('Archive this application?')) return
    try { await applicationsApi.delete(token, id); load() } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Failed') }
  }

  return (
    <>
      {showForm && <ApplicationForm token={token} onSave={() => { setShowForm(false); load() }} onClose={() => setShowForm(false)} />}
      {stageTarget && (
        <Modal title={`Move: ${stageTarget.candidate_name || stageTarget.candidate_email}`} onClose={() => setStageTarget(null)}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {STAGES.map(s => (
              <button key={s} className={`btn-action ${stageTarget.status === s ? '' : ''}`} style={{ background: stageTarget.status === s ? 'var(--navy)' : undefined }} onClick={() => moveStage(stageTarget, s)}>
                {s}
              </button>
            ))}
          </div>
        </Modal>
      )}
      <ListHeader title="Applications" count={apps.length} onAction={() => setShowForm(true)} actionLabel="+ New Application" />
      <div className="list-table">
        <div className="list-table-head">
          <div className="list-col list-col-main">Candidate</div>
          <div className="list-col">Job</div>
          <div className="list-col">Stage</div>
          <div className="list-col">Source</div>
          <div className="list-col">Actions</div>
        </div>
        {loading && <LoadingRow />}
        {err && <ErrorRow msg={err} />}
        {!loading && !err && apps.length === 0 && <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>No applications yet.</div>}
        {apps.map(a => (
          <div key={a.id} className="list-row">
            <div className="list-col list-col-main">
              <div className="candidate-avatar">{(a.candidate_name || a.candidate_email).slice(0, 2).toUpperCase()}</div>
              <div><div className="list-row-name">{a.candidate_name || '—'}</div><div className="list-row-sub">{a.candidate_email}</div></div>
            </div>
            <div className="list-col list-row-sub">Job #{a.job_id}</div>
            <div className="list-col"><span className={`tag ${STAGE_COLORS[a.status] ?? 'tag-blue'}`}>{a.status}</span></div>
            <div className="list-col list-row-sub">{a.source_type}</div>
            <div className="list-col" style={{ display: 'flex', gap: 6 }}>
              <button className="btn-row-action" onClick={() => setStageTarget(a)}>Stage</button>
              <button className="btn-row-action btn-row-danger" onClick={() => del(a.id)}>Del</button>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

// ── Candidates view (derived from applications) ────────────────────

function CandidatesView({ token }: { token: string }) {
  const [apps, setApps] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  useEffect(() => {
    applicationsApi.list(token)
      .then(setApps)
      .catch((e: unknown) => setErr(e instanceof Error ? e.message : 'Failed'))
      .finally(() => setLoading(false))
  }, [token])

  return (
    <>
      <ListHeader title="Candidates" count={apps.length} />
      <div className="list-table">
        <div className="list-table-head">
          <div className="list-col list-col-main">Candidate</div>
          <div className="list-col">Job</div>
          <div className="list-col">Stage</div>
          <div className="list-col">Source</div>
        </div>
        {loading && <LoadingRow />}
        {err && <ErrorRow msg={err} />}
        {!loading && !err && apps.length === 0 && <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>No candidates yet.</div>}
        {apps.map(a => (
          <div key={a.id} className="list-row">
            <div className="list-col list-col-main">
              <div className="candidate-avatar">{(a.candidate_name || a.candidate_email).slice(0, 2).toUpperCase()}</div>
              <div><div className="list-row-name">{a.candidate_name || '—'}</div><div className="list-row-sub">{a.candidate_email}</div></div>
            </div>
            <div className="list-col list-row-sub">Job #{a.job_id}</div>
            <div className="list-col"><span className={`tag ${STAGE_COLORS[a.status] ?? 'tag-blue'}`}>{a.status}</span></div>
            <div className="list-col list-row-sub">{a.source_type}</div>
          </div>
        ))}
      </div>
    </>
  )
}

function InterviewsView({ token }: { token: string }) {
  const [apps, setApps] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    applicationsApi.list(token, undefined, 'interview')
      .then(setApps)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [token])

  return (
    <>
      <ListHeader title="Interviews" count={apps.length} />
      <div className="list-table">
        <div className="list-table-head">
          <div className="list-col list-col-main">Candidate</div>
          <div className="list-col">Job</div>
          <div className="list-col">Stage</div>
          <div className="list-col">Applied</div>
        </div>
        {loading && <LoadingRow />}
        {!loading && apps.length === 0 && <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>No interviews scheduled.</div>}
        {apps.map(a => (
          <div key={a.id} className="list-row">
            <div className="list-col list-col-main">
              <div className="candidate-avatar">{(a.candidate_name || a.candidate_email).slice(0, 2).toUpperCase()}</div>
              <div><div className="list-row-name">{a.candidate_name || '—'}</div><div className="list-row-sub">{a.candidate_email}</div></div>
            </div>
            <div className="list-col list-row-sub">Job #{a.job_id}</div>
            <div className="list-col"><span className="tag tag-blue">Interview</span></div>
            <div className="list-col list-row-sub">{new Date(a.created_at).toLocaleDateString()}</div>
          </div>
        ))}
      </div>
    </>
  )
}

function TeamView() {
  return (
    <div className="empty-view">
      <div className="empty-view-title">Team Members</div>
      <div className="empty-view-sub">Invite teammates to collaborate on your workspace.</div>
    </div>
  )
}

function SettingsView() {
  return (
    <div className="empty-view">
      <div className="empty-view-title">Settings</div>
      <div className="empty-view-sub">Workspace and account settings coming soon.</div>
    </div>
  )
}

// ── Router ─────────────────────────────────────────────────────────

export function PageView({ page, user, token }: { page: SidebarPage; user: UserData; token: string }) {
  switch (page) {
    case 'profile':          return <ProfileView user={user} />
    case 'jobs':             return <JobsView token={token} />
    case 'job-boards':       return <JobBoardsView token={token} />
    case 'postings':         return <PostingsView token={token} />
    case 'job-applications': return <ApplicationsView token={token} />
    case 'candidates':       return <CandidatesView token={token} />
    case 'interviews':       return <InterviewsView token={token} />
    case 'team':             return <TeamView />
    case 'settings':         return <SettingsView />
  }
}

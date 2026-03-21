import { useState, useEffect, useCallback } from 'react'
import { Link, useOutletContext, useNavigate, useSearchParams } from 'react-router-dom'
import type { DashboardOutletContext } from '../layouts/DashboardOutletContext'
import { jobsApi } from '../api/jobs'
import type { Job } from '../api/jobs'
import { boardsApi } from '../api/boards'
import type { JobBoard } from '../api/boards'
import { postingsApi } from '../api/postings'
import type { JobPosting } from '../api/postings'
import { applicationsApi } from '../api/applications'
import type { Application } from '../api/applications'
import { useToast } from '../contexts/ToastContext'
import { interviewsApi, type InterviewAssignmentRow, type InterviewKitPayload } from '../api/interviews'
import { scorecardsApi, type ScorecardRow } from '../api/scorecards'
import CustomAttributeFields from './CustomAttributeFields'
import { customAttributesApi, type CustomAttributeDefinition } from '../api/customAttributes'

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
  return (
    <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
      <div className="spinner" style={{ margin: '0 auto 8px', width: 24, height: 24 }} />
      Loading...
    </div>
  )
}

function ErrorRow({ msg }: { msg: string }) {
  return <div style={{ padding: '16px 20px', color: 'var(--error)', fontSize: 13, background: 'var(--error-bg)', borderBottom: '1px solid var(--error-border)' }}>{msg}</div>
}

function EmptyRow({ text }: { text: string }) {
  return (
    <div style={{ padding: '48px 24px', textAlign: 'center' }}>
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--gray-300)" strokeWidth="1.5" style={{ marginBottom: 12 }}>
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
        <path d="M14 2v6h6M12 18v-6M9 15h6" />
      </svg>
      <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>{text}</div>
    </div>
  )
}

const STAGE_COLORS: Record<string, string> = {
  applied: 'tag-blue', screening: 'tag-orange', interview: 'tag-blue',
  offer: 'tag-green', hired: 'tag-green', rejected: 'tag-red', withdrawn: 'tag-gray',
  draft: 'tag-gray', open: 'tag-green', closed: 'tag-gray', paused: 'tag-orange',
  pending: 'tag-orange', posted: 'tag-green', failed: 'tag-red',
  scheduled: 'tag-blue', completed: 'tag-green', cancelled: 'tag-gray',
  strong_yes: 'tag-green', yes: 'tag-blue', maybe: 'tag-orange', no: 'tag-orange', strong_no: 'tag-red',
}

/** Scorecards are always tied to a candidate application / interview—not to the job posting itself. */
function CandidateInterviewScorecardsModal({
  token,
  application,
  onClose,
}: {
  token: string
  application: Application
  onClose: () => void
}) {
  const [rows, setRows] = useState<ScorecardRow[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  useEffect(() => {
    let cancelled = false
    setErr('')
    setRows([])
    setLoading(true)
    scorecardsApi
      .forApplication(token, application.id)
      .then(data => {
        if (!cancelled) setRows(data)
      })
      .catch(e => {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'Failed to load scorecards')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [token, application.id])

  const who = application.candidate_name || application.candidate_email || 'Candidate'

  return (
    <Modal title={`Interview scorecards — ${who}`} onClose={onClose}>
      <p className="interviews-lead" style={{ marginTop: 0, marginBottom: 14 }}>
        These scores are from interviewers after sessions with this candidate. They are not ratings of the job
        opening.
      </p>
      {loading && <LoadingRow />}
      {err && <ErrorRow msg={err} />}
      {!loading && !err && rows.length === 0 && (
        <p className="job-editor-muted">No interview scorecards yet for this candidate.</p>
      )}
      {!loading &&
        rows.map(sc => {
          const scores = sc.scores ?? sc.criteria_scores ?? {}
          const entries = Object.entries(scores)
          return (
            <div key={sc.id} className="scorecard-summary-card">
              <div className="scorecard-summary-head">
                <span className={`tag ${STAGE_COLORS[sc.overall_recommendation] ?? 'tag-blue'}`}>
                  {sc.overall_recommendation.replace(/_/g, ' ')}
                </span>
                {sc.criteria_average != null && (
                  <span className="scorecard-summary-avg">Avg {sc.criteria_average}</span>
                )}
                <span className="scorecard-summary-meta">
                  {sc.submitted_at ? new Date(sc.submitted_at).toLocaleString() : '—'}
                </span>
              </div>
              {entries.length > 0 && (
                <div className="scorecard-bar-list">
                  {entries.map(([k, v]) => {
                    const n = Number(v)
                    const pct = Number.isNaN(n) ? 0 : Math.min(100, (n / 5) * 100)
                    return (
                      <div key={k} className="scorecard-bar-row">
                        <span className="scorecard-bar-label">{k}</span>
                        <div className="scorecard-bar-track">
                          <div className="scorecard-bar-fill" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="scorecard-bar-val">{String(v)}</span>
                      </div>
                    )
                  })}
                </div>
              )}
              {(sc.pros || sc.cons) && (
                <div className="scorecard-pros-cons">
                  {sc.pros && (
                    <p>
                      <strong>Pros:</strong> {sc.pros}
                    </p>
                  )}
                  {sc.cons && (
                    <p>
                      <strong>Cons:</strong> {sc.cons}
                    </p>
                  )}
                </div>
              )}
              {sc.bias_flags && sc.bias_flags.length > 0 && (
                <div className="scorecard-bias-hint">
                  Bias review: flagged terms in notes — {sc.bias_flags.join(', ')}
                </div>
              )}
            </div>
          )
        })}
    </Modal>
  )
}

// ── Confirm Dialog ──────────────────────────────────────────────────

function ConfirmDialog({ title, message, onConfirm, onCancel }: {
  title: string; message: string; onConfirm: () => void; onCancel: () => void
}) {
  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
        <div className="confirm-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <div className="confirm-title">{title}</div>
        <div className="confirm-message">{message}</div>
        <div className="confirm-actions">
          <button className="btn-confirm-cancel" onClick={onCancel}>Cancel</button>
          <button className="btn-confirm-danger" onClick={onConfirm}>Confirm</button>
        </div>
      </div>
    </div>
  )
}

// ── Modal shell ────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
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

export function ProfileView() {
  const { user } = useOutletContext<DashboardOutletContext>()
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
        <div className="stat-cell"><div className="stat-value" style={{ fontSize: 14, paddingTop: 4 }}>{new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</div><div className="stat-label">Member Since</div></div>
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

export function JobsView() {
  const { token, accountId } = useOutletContext<DashboardOutletContext>()
  const navigate = useNavigate()
  const toast = useToast()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<Job | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setErr('')
    try { setJobs(await jobsApi.list(token)) } catch (e: unknown) { setErr(e instanceof Error ? e.message : 'Failed') } finally { setLoading(false) }
  }, [token])

  useEffect(() => { load() }, [load])

  const del = async (job: Job) => {
    try {
      await jobsApi.delete(token, job.id)
      toast.success('Job deleted', `"${job.title}" has been removed.`)
      load()
    } catch (e: unknown) {
      toast.error('Delete failed', e instanceof Error ? e.message : 'Failed to delete job')
    }
    setConfirmDelete(null)
  }

  return (
    <>
      {confirmDelete && (
        <ConfirmDialog
          title="Delete Job"
          message={`Are you sure you want to delete "${confirmDelete.title}"? This action cannot be undone.`}
          onConfirm={() => del(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
      <ListHeader
        title="Jobs"
        count={jobs.length}
        onAction={() => navigate(`/account/${accountId}/jobs/new`)}
        actionLabel="+ New Job"
      />
      <p className="interviews-lead" style={{ margin: '0 0 12px' }}>
        Interview scorecards are recorded per candidate (after interviews), not for the job itself. Open{' '}
        <strong>Applications</strong> or <strong>Interviews</strong> to view or submit scores.
      </p>
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
        {!loading && !err && jobs.length === 0 && <EmptyRow text="No jobs yet. Create your first job to get started." />}
        {jobs.map(j => (
          <div key={j.id} className="list-row">
            <div className="list-col list-col-main"><div><div className="list-row-name">{j.title}</div><div className="list-row-sub">{j.slug}</div></div></div>
            <div className="list-col list-row-sub">{j.department || '—'}</div>
            <div className="list-col list-row-sub">{j.location || '—'}</div>
            <div className="list-col"><span className={`tag ${STAGE_COLORS[j.status] ?? 'tag-gray'}`}>{j.status}</span></div>
            <div className="list-col" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn-row-action"
                onClick={() => navigate(`/account/${accountId}/jobs/${j.id}/edit`)}
              >
                Edit
              </button>
              {j.apply_token && (
                <>
                  <button
                    type="button"
                    className="btn-row-action"
                    title={j.status === 'open' ? 'Open candidate apply page' : 'Set status to Open so candidates can view and apply'}
                    disabled={j.status !== 'open'}
                    onClick={() => {
                      const u = `${window.location.origin}/apply/${encodeURIComponent(j.apply_token!)}`
                      window.open(u, '_blank', 'noopener,noreferrer')
                    }}
                  >
                    Apply page
                  </button>
                  <button
                    type="button"
                    className="btn-row-action"
                    title={j.status === 'open' ? 'Copy link' : 'Candidates can only apply when job status is Open'}
                    disabled={j.status !== 'open'}
                    onClick={() => {
                      const u = `${window.location.origin}/apply/${encodeURIComponent(j.apply_token!)}`
                      void navigator.clipboard.writeText(u).then(
                        () => toast.success('Apply link copied', 'Share this URL with candidates.'),
                        () => toast.error('Copy failed', 'Copy the link from the address bar after opening Apply page.'),
                      )
                    }}
                  >
                    Copy link
                  </button>
                </>
              )}
              <button type="button" className="btn-row-action btn-row-danger" onClick={() => setConfirmDelete(j)}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

// ── Job Boards view ────────────────────────────────────────────────

function BoardForm({
  token,
  board,
  onSave,
  onClose,
}: {
  token: string
  board?: JobBoard
  onSave: () => void
  onClose: () => void
}) {
  const toast = useToast()
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
      if (board) {
        await boardsApi.update(token, board.id, form)
        toast.success('Board updated', `"${form.name}" has been updated.`)
      } else {
        await boardsApi.create(token, form)
        toast.success('Board created', `"${form.name}" has been added.`)
      }
      onSave()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed'
      setErr(msg)
      toast.error('Save failed', msg)
    } finally { setSaving(false) }
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
      <div style={{ display: 'flex', gap: 20, marginBottom: 16 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', color: 'var(--text-secondary)' }}>
          <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--teal)' }} /> Active
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', color: 'var(--text-secondary)' }}>
          <input type="checkbox" checked={form.is_premium} onChange={e => set('is_premium', e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--teal)' }} /> Premium
        </label>
      </div>
      <button className="btn-primary" onClick={submit} disabled={saving}>{saving ? 'Saving...' : board ? 'Update Board' : 'Create Board'}</button>
    </Modal>
  )
}

export function JobBoardsView() {
  const { token } = useOutletContext<DashboardOutletContext>()
  const toast = useToast()
  const [boards, setBoards] = useState<JobBoard[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<JobBoard | undefined>()
  const [confirmDelete, setConfirmDelete] = useState<JobBoard | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setErr('')
    try { setBoards(await boardsApi.list(token)) } catch (e: unknown) { setErr(e instanceof Error ? e.message : 'Failed') } finally { setLoading(false) }
  }, [token])

  useEffect(() => { load() }, [load])

  const del = async (board: JobBoard) => {
    try {
      await boardsApi.delete(token, board.id)
      toast.success('Board deleted', `"${board.name}" has been removed.`)
      load()
    } catch (e: unknown) {
      toast.error('Delete failed', e instanceof Error ? e.message : 'Failed')
    }
    setConfirmDelete(null)
  }

  return (
    <>
      {confirmDelete && (
        <ConfirmDialog
          title="Delete Board"
          message={`Are you sure you want to delete "${confirmDelete.name}"? This action cannot be undone.`}
          onConfirm={() => del(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
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
        {!loading && !err && boards.length === 0 && <EmptyRow text="No boards yet. Add your first job board." />}
        {boards.map(b => (
          <div key={b.id} className="list-row">
            <div className="list-col list-col-main">
              <div><div className="list-row-name">{b.name}</div><div className="list-row-sub">{b.website_url || b.slug}</div></div>
            </div>
            <div className="list-col list-row-sub">{b.integration_type}</div>
            <div className="list-col">
              <span className={`tag ${b.is_active ? 'tag-green' : 'tag-gray'}`}>{b.is_active ? 'Active' : 'Inactive'}</span>
              {b.is_premium && <span className="tag tag-orange" style={{ marginLeft: 6 }}>Premium</span>}
            </div>
            <div className="list-col" style={{ display: 'flex', gap: 6 }}>
              <button className="btn-row-action" onClick={() => setEditing(b)}>Edit</button>
              <button className="btn-row-action btn-row-danger" onClick={() => setConfirmDelete(b)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

// ── Postings view ──────────────────────────────────────────────────

function PostingForm({
  token,
  initialPosting,
  onSave,
  onClose,
}: {
  token: string
  initialPosting?: JobPosting | null
  onSave: () => void
  onClose: () => void
}) {
  const toast = useToast()
  const [jobs, setJobs] = useState<import('../api/jobs').Job[]>([])
  const [boards, setBoards] = useState<JobBoard[]>([])
  const [step, setStep] = useState<'form' | 'preview'>('form')
  const [form, setForm] = useState({
    job_id: initialPosting ? String(initialPosting.job_id) : '',
    board_id: initialPosting ? String(initialPosting.board_id) : '',
    post_to: 'internal',
    external_url: initialPosting?.external_url ?? '',
    external_apply_url: initialPosting?.external_apply_url ?? '',
    status: initialPosting?.status ?? 'pending',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    Promise.all([jobsApi.list(token), boardsApi.list(token, true)])
      .then(([j, b]) => { setJobs(j); setBoards(b) })
      .catch(() => {})
  }, [token])

  const selectedJob = jobs.find(j => j.id === Number(form.job_id))
  const selectedBoard = boards.find(b => b.id === Number(form.board_id))

  const submit = async () => {
    if (!form.job_id || !form.board_id) { setErr('Select a job and board'); return }
    setSaving(true); setErr('')
    try {
      await postingsApi.create(token, {
        job_id: Number(form.job_id),
        board_id: Number(form.board_id),
        status: form.status,
        external_url: form.external_url || undefined,
        external_apply_url: form.external_apply_url || undefined,
      })
      toast.success('Job post saved', 'Your posting has been created. Use LIVE/OFF toggle from list.')
      onSave()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed'
      setErr(msg)
      toast.error('Posting failed', msg)
    } finally { setSaving(false) }
  }

  return (
    <Modal title={step === 'form' ? 'Create Job Post' : 'Preview Job Post'} onClose={onClose}>
      {err && <div className="auth-error">{err}</div>}
      {step === 'form' ? (
        <>
          <FormField label="Job *">
            <select value={form.job_id} onChange={e => setForm(f => ({ ...f, job_id: e.target.value }))}>
              <option value="">Select a job...</option>
              {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
            </select>
          </FormField>
          <FormField label="Post To *">
            <select value={form.post_to} onChange={e => setForm(f => ({ ...f, post_to: e.target.value }))}>
              <option value="internal">Internal</option>
              <option value="external">External</option>
            </select>
          </FormField>
          <FormField label="Board *">
            <select value={form.board_id} onChange={e => setForm(f => ({ ...f, board_id: e.target.value }))}>
              <option value="">Select a board...</option>
              {boards.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </FormField>
          <FormField label="Post Status">
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              <option value="pending">OFF (Draft)</option>
              <option value="posted">LIVE</option>
            </select>
          </FormField>
          <FormField label="External URL (optional)">
            <input value={form.external_url} onChange={e => setForm(f => ({ ...f, external_url: e.target.value }))} placeholder="https://company.com/jobs/xyz" />
          </FormField>
          <FormField label="Apply URL (optional)">
            <input value={form.external_apply_url} onChange={e => setForm(f => ({ ...f, external_apply_url: e.target.value }))} placeholder="https://company.com/apply/xyz" />
          </FormField>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-confirm-cancel" onClick={onClose}>Cancel</button>
            <button className="btn-primary" onClick={() => setStep('preview')} disabled={!form.job_id || !form.board_id}>Preview</button>
          </div>
        </>
      ) : (
        <>
          <div className="panel" style={{ marginBottom: 16 }}>
            <div className="panel-header"><span className="panel-header-title">Job Post Preview</span></div>
            <div className="panel-body">
              <div className="panel-row"><span className="panel-row-label">Job</span><span className="panel-row-value">{selectedJob?.title ?? '—'}</span></div>
              <div className="panel-row"><span className="panel-row-label">Post To</span><span className="panel-row-value">{form.post_to}</span></div>
              <div className="panel-row"><span className="panel-row-label">Board</span><span className="panel-row-value">{selectedBoard?.name ?? '—'}</span></div>
              <div className="panel-row"><span className="panel-row-label">Status</span><span className="panel-row-value"><span className={`tag ${form.status === 'posted' ? 'tag-green' : 'tag-gray'}`}>{form.status === 'posted' ? 'LIVE' : 'OFF'}</span></span></div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-confirm-cancel" onClick={() => setStep('form')}>Back</button>
            <button className="btn-primary" onClick={submit} disabled={saving}>{saving ? 'Saving...' : 'Save Post'}</button>
          </div>
        </>
      )}
    </Modal>
  )
}

export function PostingsView() {
  const { token } = useOutletContext<DashboardOutletContext>()
  const toast = useToast()
  const [postings, setPostings] = useState<JobPosting[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [boards, setBoards] = useState<JobBoard[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [duplicateFrom, setDuplicateFrom] = useState<JobPosting | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<JobPosting | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setErr('')
    try { setPostings(await postingsApi.list(token)) } catch (e: unknown) { setErr(e instanceof Error ? e.message : 'Failed') } finally { setLoading(false) }
  }, [token])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    Promise.all([jobsApi.list(token), boardsApi.list(token)])
      .then(([j, b]) => { setJobs(j); setBoards(b) })
      .catch(() => {})
  }, [token])

  const toggleLive = async (posting: JobPosting) => {
    const nextStatus = posting.status === 'posted' ? 'pending' : 'posted'
    try {
      await postingsApi.update(token, posting.id, { status: nextStatus })
      toast.success('Posting updated', `Posting is now ${nextStatus === 'posted' ? 'LIVE' : 'OFF'}.`)
      load()
    } catch (e: unknown) {
      toast.error('Toggle failed', e instanceof Error ? e.message : 'Failed')
    }
  }

  const del = async (posting: JobPosting) => {
    try {
      await postingsApi.delete(token, posting.id)
      toast.success('Posting removed', 'The job posting has been removed.')
      load()
    } catch (e: unknown) {
      toast.error('Remove failed', e instanceof Error ? e.message : 'Failed')
    }
    setConfirmDelete(null)
  }

  return (
    <>
      {confirmDelete && (
        <ConfirmDialog
          title="Remove Posting"
          message="Are you sure you want to remove this posting? This action cannot be undone."
          onConfirm={() => del(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
      {(showForm || duplicateFrom) && (
        <PostingForm
          token={token}
          initialPosting={duplicateFrom}
          onSave={() => { setShowForm(false); setDuplicateFrom(null); load() }}
          onClose={() => { setShowForm(false); setDuplicateFrom(null) }}
        />
      )}
      <ListHeader title="Job Postings" count={postings.length} onAction={() => setShowForm(true)} actionLabel="+ Post Job" />
      <div className="list-table">
        <div className="list-table-head">
          <div className="list-col list-col-main">Job</div>
          <div className="list-col">Board</div>
          <div className="list-col">Status</div>
          <div className="list-col">Posted At</div>
          <div className="list-col">Actions</div>
        </div>
        {loading && <LoadingRow />}
        {err && <ErrorRow msg={err} />}
        {!loading && !err && postings.length === 0 && <EmptyRow text="No postings yet. Post your first job to a board." />}
        {postings.map(p => (
          <div key={p.id} className="list-row">
            <div className="list-col list-col-main"><div className="list-row-name">{jobs.find(j => j.id === p.job_id)?.title ?? `Job #${p.job_id}`}</div></div>
            <div className="list-col list-row-sub">{boards.find(b => b.id === p.board_id)?.name ?? `Board #${p.board_id}`}</div>
            <div className="list-col"><span className={`tag ${p.status === 'posted' ? 'tag-green' : 'tag-gray'}`}>{p.status === 'posted' ? 'LIVE' : 'OFF'}</span></div>
            <div className="list-col list-row-sub">{p.posted_at ? new Date(p.posted_at).toLocaleDateString() : '—'}</div>
            <div className="list-col" style={{ display: 'flex', gap: 6 }}>
              <button className="btn-row-action" onClick={() => toggleLive(p)}>{p.status === 'posted' ? 'Set OFF' : 'Set LIVE'}</button>
              <button className="btn-row-action" onClick={() => setDuplicateFrom(p)}>Duplicate</button>
              <button className="btn-row-action btn-row-danger" onClick={() => setConfirmDelete(p)}>Remove</button>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

// ── Applications view ──────────────────────────────────────────────

function ApplicationForm({
  token,
  onSave,
  onClose,
}: {
  token: string
  onSave: () => void
  onClose: () => void
}) {
  const toast = useToast()
  const [jobs, setJobs] = useState<import('../api/jobs').Job[]>([])
  const [form, setForm] = useState({ job_id: '', candidate_name: '', candidate_email: '', candidate_phone: '', cover_letter: '' })
  const [custDefs, setCustDefs] = useState<CustomAttributeDefinition[]>([])
  const [custVals, setCustVals] = useState<Record<string, unknown>>({})
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    jobsApi.list(token).then(setJobs).catch(() => {})
  }, [token])

  useEffect(() => {
    customAttributesApi
      .list(token, 'application')
      .then(setCustDefs)
      .catch(() => setCustDefs([]))
  }, [token])

  useEffect(() => {
    if (!custDefs.length) return
    setCustVals(prev => {
      const next = { ...prev }
      let changed = false
      for (const d of custDefs) {
        if (d.field_type === 'boolean' && next[d.attribute_key] === undefined) {
          next[d.attribute_key] = false
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [custDefs])

  const submit = async () => {
    if (!form.job_id || !form.candidate_email) { setErr('Job and email are required'); return }
    setSaving(true); setErr('')
    try {
      await applicationsApi.create(token, {
        job_id: Number(form.job_id),
        candidate_email: form.candidate_email,
        candidate_name: form.candidate_name,
        candidate_phone: form.candidate_phone,
        cover_letter: form.cover_letter,
        custom_attributes: custDefs.length ? custVals : undefined,
      })
      toast.success('Application submitted', `Application for ${form.candidate_name || form.candidate_email} has been created.`)
      onSave()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed'
      setErr(msg)
      toast.error('Submission failed', msg)
    } finally { setSaving(false) }
  }

  return (
    <Modal title="New Application" onClose={onClose}>
      {err && <div className="auth-error">{err}</div>}
      <FormField label="Job *">
        <select value={form.job_id} onChange={e => set('job_id', e.target.value)}>
          <option value="">Select a job...</option>
          {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
        </select>
      </FormField>
      <FormField label="Candidate Name"><input value={form.candidate_name} onChange={e => set('candidate_name', e.target.value)} placeholder="Full name" /></FormField>
      <FormField label="Email *"><input type="email" value={form.candidate_email} onChange={e => set('candidate_email', e.target.value)} placeholder="candidate@email.com" /></FormField>
      <FormField label="Phone"><input value={form.candidate_phone} onChange={e => set('candidate_phone', e.target.value)} placeholder="+1 555 000 0000" /></FormField>
      <FormField label="Cover Letter"><textarea value={form.cover_letter} onChange={e => set('cover_letter', e.target.value)} rows={3} placeholder="Optional cover letter..." /></FormField>
      {custDefs.length > 0 && (
        <FormField label="Custom attributes">
          <CustomAttributeFields definitions={custDefs} values={custVals} onChange={setCustVals} disabled={saving} idPrefix="modal-cf" />
        </FormField>
      )}
      <button className="btn-primary" onClick={submit} disabled={saving}>{saving ? 'Submitting...' : 'Submit Application'}</button>
    </Modal>
  )
}

export function ApplicationsView() {
  const { token, accountId } = useOutletContext<DashboardOutletContext>()
  const toast = useToast()
  const [apps, setApps] = useState<Application[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Application | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setErr('')
    try {
      const [a, j] = await Promise.all([applicationsApi.list(token), jobsApi.list(token)])
      setApps(a)
      setJobs(j)
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { load() }, [load])

  const jobTitle = (jobId: number) => jobs.find(j => j.id === jobId)?.title ?? `Job #${jobId}`

  const del = async (app: Application) => {
    try {
      await applicationsApi.delete(token, app.id)
      toast.success('Application archived', `Application from ${app.candidate_name || app.candidate_email} has been archived.`)
      load()
    } catch (e: unknown) {
      toast.error('Archive failed', e instanceof Error ? e.message : 'Failed')
    }
    setConfirmDelete(null)
  }

  return (
    <>
      {confirmDelete && (
        <ConfirmDialog
          title="Archive Application"
          message={`Are you sure you want to archive the application from "${confirmDelete.candidate_name || confirmDelete.candidate_email}"?`}
          onConfirm={() => del(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
      {showForm && <ApplicationForm token={token} onSave={() => { setShowForm(false); load() }} onClose={() => setShowForm(false)} />}
      <ListHeader title="Applications" count={apps.length} onAction={() => setShowForm(true)} actionLabel="+ New Application" />
      <p className="interviews-lead" style={{ margin: '0 0 12px' }}>
        Open a candidate to edit details, pipeline stage, e-sign documents, and interview scorecards on a full page.
      </p>
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
        {!loading && !err && apps.length === 0 && <EmptyRow text="No applications yet. Add your first application." />}
        {apps.map(a => (
          <div key={a.id} className="list-row">
            <div className="list-col list-col-main">
              <div className="candidate-avatar">{(a.candidate_name || a.candidate_email).slice(0, 2).toUpperCase()}</div>
              <div><div className="list-row-name">{a.candidate_name || '—'}</div><div className="list-row-sub">{a.candidate_email}</div></div>
            </div>
            <div className="list-col list-row-sub">{jobTitle(a.job_id)}</div>
            <div className="list-col"><span className={`tag ${STAGE_COLORS[a.status] ?? 'tag-blue'}`}>{a.status}</span></div>
            <div className="list-col list-row-sub">{a.source_type}</div>
            <div className="list-col" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <Link className="btn-row-action" to={`/account/${accountId}/job-applications/${a.id}`} style={{ textDecoration: 'none' }}>
                Open
              </Link>
              <button type="button" className="btn-row-action btn-row-danger" onClick={() => setConfirmDelete(a)}>
                Del
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

// ── Candidates view (derived from applications) ────────────────────

export function CandidatesView() {
  const { token } = useOutletContext<DashboardOutletContext>()
  const [apps, setApps] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [scoreModalApp, setScoreModalApp] = useState<Application | null>(null)

  useEffect(() => {
    applicationsApi.list(token)
      .then(setApps)
      .catch((e: unknown) => setErr(e instanceof Error ? e.message : 'Failed'))
      .finally(() => setLoading(false))
  }, [token])

  return (
    <>
      {scoreModalApp && (
        <CandidateInterviewScorecardsModal
          token={token}
          application={scoreModalApp}
          onClose={() => setScoreModalApp(null)}
        />
      )}
      <ListHeader title="Candidates" count={apps.length} />
      <p className="interviews-lead" style={{ margin: '0 0 12px' }}>
        Interview scorecards belong to each person you interview—open <strong>Interview scores</strong> for their
        feedback.
      </p>
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
        {!loading && !err && apps.length === 0 && <EmptyRow text="No candidates yet." />}
        {apps.map(a => (
          <div key={a.id} className="list-row">
            <div className="list-col list-col-main">
              <div className="candidate-avatar">{(a.candidate_name || a.candidate_email).slice(0, 2).toUpperCase()}</div>
              <div><div className="list-row-name">{a.candidate_name || '—'}</div><div className="list-row-sub">{a.candidate_email}</div></div>
            </div>
            <div className="list-col list-row-sub">Job #{a.job_id}</div>
            <div className="list-col"><span className={`tag ${STAGE_COLORS[a.status] ?? 'tag-blue'}`}>{a.status}</span></div>
            <div className="list-col list-row-sub">{a.source_type}</div>
            <div className="list-col">
              <button type="button" className="btn-row-action" onClick={() => setScoreModalApp(a)}>
                Interview scores
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

const INTERVIEW_KIT_PARAM = 'kit'

export function InterviewsView() {
  const { token } = useOutletContext<DashboardOutletContext>()
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const [assignments, setAssignments] = useState<InterviewAssignmentRow[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [kitOpenId, setKitOpenId] = useState<number | null>(null)
  const [kitPayload, setKitPayload] = useState<InterviewKitPayload | null>(null)
  const [kitLoading, setKitLoading] = useState(false)
  const [scoreRec, setScoreRec] = useState('yes')
  const [scoreNotes, setScoreNotes] = useState('')
  const [scoreSaving, setScoreSaving] = useState(false)

  const syncKitParam = useCallback(
    (id: number | null) => {
      setSearchParams(
        prev => {
          const next = new URLSearchParams(prev)
          if (id == null) next.delete(INTERVIEW_KIT_PARAM)
          else next.set(INTERVIEW_KIT_PARAM, String(id))
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [a, j] = await Promise.all([interviewsApi.myAssignments(token), jobsApi.list(token)])
      setAssignments(a)
      setJobs(j)
    } catch {
      setAssignments([])
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    load()
  }, [load])

  const jobTitle = (jobId: number) => jobs.find(j => j.id === jobId)?.title ?? `Job #${jobId}`

  const [criterionScores, setCriterionScores] = useState<Record<string, number>>({})
  const [scorePros, setScorePros] = useState('')
  const [scoreCons, setScoreCons] = useState('')
  const [internalNotes, setInternalNotes] = useState('')

  const loadKitForRow = useCallback(
    async (row: InterviewAssignmentRow) => {
      setKitOpenId(row.id)
      setKitPayload(null)
      setKitLoading(true)
      setScoreRec('yes')
      setScoreNotes('')
      setCriterionScores({})
      setScorePros('')
      setScoreCons('')
      setInternalNotes('')
      try {
        const data = await interviewsApi.getKit(token, row.id)
        setKitPayload(data)
      } catch (e: unknown) {
        toast.error('Could not load kit', e instanceof Error ? e.message : 'Error')
        setKitOpenId(null)
        setKitPayload(null)
        syncKitParam(null)
      } finally {
        setKitLoading(false)
      }
    },
    [token, toast, syncKitParam],
  )

  const closeKit = useCallback(() => {
    setKitOpenId(null)
    setKitPayload(null)
    syncKitParam(null)
  }, [syncKitParam])

  const openKit = useCallback(
    (row: InterviewAssignmentRow) => {
      syncKitParam(row.id)
      void loadKitForRow(row)
    },
    [syncKitParam, loadKitForRow],
  )

  const kitQuery = searchParams.get(INTERVIEW_KIT_PARAM)

  useEffect(() => {
    if (loading) return
    const raw = kitQuery
    if (!raw) {
      if (kitOpenId !== null || kitPayload !== null) {
        setKitOpenId(null)
        setKitPayload(null)
        setKitLoading(false)
      }
      return
    }
    const id = Number(raw)
    if (Number.isNaN(id)) {
      syncKitParam(null)
      return
    }
    const row = assignments.find(a => a.id === id)
    if (!row) {
      if (assignments.length > 0) syncKitParam(null)
      return
    }
    if (kitOpenId === id && (kitLoading || (kitPayload && kitPayload.assignment.id === id))) return
    void loadKitForRow(row)
  }, [
    loading,
    kitQuery,
    assignments,
    kitOpenId,
    kitPayload,
    kitLoading,
    syncKitParam,
    loadKitForRow,
  ])

  useEffect(() => {
    if (!kitPayload?.scorecard_criteria) {
      setCriterionScores({})
      return
    }
    const next: Record<string, number> = {}
    for (const c of kitPayload.scorecard_criteria) {
      const max = c.scale_max ?? 5
      next[c.name] = Math.max(1, Math.min(max, Math.ceil(max / 2)))
    }
    setCriterionScores(next)
  }, [kitPayload?.assignment?.id, kitPayload?.scorecard_criteria])

  const submitScore = async () => {
    if (!kitPayload) return
    setScoreSaving(true)
    try {
      await interviewsApi.submitScorecard(token, kitPayload.assignment.id, {
        overall_recommendation: scoreRec,
        criteria_scores: criterionScores,
        notes: scoreNotes || undefined,
        pros: scorePros || undefined,
        cons: scoreCons || undefined,
        internal_notes: internalNotes || undefined,
      })
      toast.success('Scorecard submitted', 'Thanks — assignment marked complete.')
      closeKit()
      load()
    } catch (e: unknown) {
      toast.error('Scorecard failed', e instanceof Error ? e.message : 'Error')
    } finally {
      setScoreSaving(false)
    }
  }

  const kitQuestions = kitPayload?.kit?.questions
  const qLines = Array.isArray(kitQuestions)
    ? kitQuestions.map(q => (typeof q === 'string' ? q : JSON.stringify(q)))
    : []

  return (
    <>
      {kitOpenId !== null && (
        <div className="modal-overlay" onClick={closeKit}>
          <div className="modal modal-wide interviews-kit-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Interview kit</span>
              <button type="button" className="modal-close" onClick={closeKit} aria-label="Close">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M4 4l8 8M12 4l-8 8" />
                </svg>
              </button>
            </div>
            <div className="modal-body interviews-kit-body">
              {(kitLoading || !kitPayload) && <LoadingRow />}
              {!kitLoading && kitPayload && (
                <>
                  <div className="interviews-kit-grid">
                    <div className="job-editor-card">
                      <h3 className="job-editor-card-title">Candidate</h3>
                      <p className="panel-row">
                        <span className="panel-row-label">Name</span>
                        <span className="panel-row-value">{(kitPayload.candidate?.name as string) || '—'}</span>
                      </p>
                      <p className="panel-row">
                        <span className="panel-row-label">Email</span>
                        <span className="panel-row-value">{(kitPayload.candidate?.email as string) || '—'}</span>
                      </p>
                      <p className="panel-row">
                        <span className="panel-row-label">Job</span>
                        <span className="panel-row-value">{(kitPayload.job?.title as string) || '—'}</span>
                      </p>
                    </div>
                    <div className="job-editor-card">
                      <h3 className="job-editor-card-title">{kitPayload.interview_plan.name}</h3>
                      {kitPayload.kit?.focus_area && (
                        <p className="interviews-kit-focus">{kitPayload.kit.focus_area}</p>
                      )}
                      {kitPayload.kit?.instructions && (
                        <p className="interviews-kit-instructions">{kitPayload.kit.instructions}</p>
                      )}
                      {qLines.length > 0 && (
                        <ol className="interviews-kit-questions">
                          {qLines.map((q, i) => (
                            <li key={i}>{q}</li>
                          ))}
                        </ol>
                      )}
                      {!kitPayload.kit && <p className="job-editor-muted">No kit content yet for this round.</p>}
                    </div>
                  </div>
                  {kitPayload.assignment.status !== 'completed' && (
                    <div className="job-editor-card interviews-scorecard">
                      <h3 className="job-editor-card-title">Scorecard</h3>
                      {kitPayload.scorecard_criteria && kitPayload.scorecard_criteria.length > 0 ? (
                        <div className="scorecard-criteria-grid">
                          {kitPayload.scorecard_criteria.map(c => {
                            const max = c.scale_max ?? 5
                            const v = criterionScores[c.name] ?? 1
                            return (
                              <FormField key={c.name} label={`${c.name} (${v} / ${max})`}>
                                <input
                                  type="range"
                                  min={1}
                                  max={max}
                                  value={v}
                                  onChange={e =>
                                    setCriterionScores(s => ({ ...s, [c.name]: Number(e.target.value) }))
                                  }
                                  aria-valuemin={1}
                                  aria-valuemax={max}
                                  aria-valuenow={v}
                                />
                              </FormField>
                            )
                          })}
                        </div>
                      ) : (
                        <p className="job-editor-muted job-editor-muted--boxed">
                          This job has no scorecard rubric yet. Add attributes on the job&apos;s Interview step, or submit
                          with recommendation only.
                        </p>
                      )}
                      <FormField label="Recommendation">
                        <select value={scoreRec} onChange={e => setScoreRec(e.target.value)}>
                          <option value="strong_yes">Strong yes</option>
                          <option value="yes">Yes</option>
                          <option value="maybe">Maybe</option>
                          <option value="no">No</option>
                          <option value="strong_no">Strong no</option>
                        </select>
                      </FormField>
                      <FormField label="Pros">
                        <textarea
                          value={scorePros}
                          onChange={e => setScorePros(e.target.value)}
                          rows={2}
                          placeholder="What stood out positively…"
                        />
                      </FormField>
                      <FormField label="Cons">
                        <textarea
                          value={scoreCons}
                          onChange={e => setScoreCons(e.target.value)}
                          rows={2}
                          placeholder="Gaps or concerns…"
                        />
                      </FormField>
                      <FormField label="Summary notes (shared)">
                        <textarea
                          value={scoreNotes}
                          onChange={e => setScoreNotes(e.target.value)}
                          rows={3}
                          placeholder="Overall summary for the hiring team…"
                        />
                      </FormField>
                      <FormField label="Internal notes (bias scan)">
                        <textarea
                          value={internalNotes}
                          onChange={e => setInternalNotes(e.target.value)}
                          rows={2}
                          placeholder="Private notes — flagged terms surface as bias hints after save."
                        />
                      </FormField>
                      <button type="button" className="btn-primary" onClick={submitScore} disabled={scoreSaving}>
                        {scoreSaving ? 'Submitting…' : 'Submit scorecard'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <ListHeader title="Interviews" count={assignments.length} />
      <p className="interviews-lead">
        Interview rounds assigned to you as interviewer. Open a kit to see focus areas and questions, then submit a scorecard.
        Rows appear once you’re set as the interviewer for that assignment.
      </p>
      <div className="list-table">
        <div className="list-table-head">
          <div className="list-col list-col-main">Round & candidate</div>
          <div className="list-col">Job</div>
          <div className="list-col">Status</div>
          <div className="list-col">Scheduled</div>
          <div className="list-col">Actions</div>
        </div>
        {loading && <LoadingRow />}
        {!loading && assignments.length === 0 && (
          <EmptyRow text="No interview assignments yet. When you’re set as interviewer on a slot, it appears here." />
        )}
        {assignments.map(row => (
          <div key={row.id} className="list-row">
            <div className="list-col list-col-main">
              <div className="list-row-name">{row.interview_plan?.name ?? `Plan #${row.interview_plan_id}`}</div>
              <div className="list-row-sub">
                {row.application?.candidate_name || row.application?.candidate_email || 'Candidate'}
              </div>
            </div>
            <div className="list-col list-row-sub">
              {row.application ? jobTitle(row.application.job_id) : '—'}
            </div>
            <div className="list-col">
              <span className={`tag ${STAGE_COLORS[row.status] ?? 'tag-blue'}`}>{row.status}</span>
            </div>
            <div className="list-col list-row-sub">
              {row.scheduled_at ? new Date(row.scheduled_at).toLocaleString() : '—'}
            </div>
            <div className="list-col">
              <button type="button" className="btn-row-action" onClick={() => openKit(row)}>
                Open kit
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

export function TeamView() {
  return (
    <div className="empty-view">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--gray-300)" strokeWidth="1.5" style={{ marginBottom: 16 }}>
        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
      </svg>
      <div className="empty-view-title">Team Members</div>
      <div className="empty-view-sub">Invite teammates to collaborate on your workspace. Manage roles and permissions from here.</div>
    </div>
  )
}


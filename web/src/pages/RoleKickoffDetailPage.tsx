import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { roleKickoffApi, type RoleKickoffRequestRow } from '../api/roleKickoff'
import type { DashboardOutletContext } from '../layouts/DashboardOutletContext'
import { useAuth } from '../auth/AuthContext'
import { can } from '../permissions'
import { useToast } from '../contexts/ToastContext'

function statusLabel(status: string): string {
  const m: Record<string, string> = {
    submitted: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    changes_requested: 'Changes requested',
    converted: 'Converted to job',
  }
  return m[status] ?? status
}

function statusTagClass(status: string): string {
  if (status === 'approved') return 'tag-green'
  if (status === 'submitted') return 'tag-orange'
  if (status === 'rejected') return 'tag-red'
  if (status === 'changes_requested') return 'tag-orange'
  if (status === 'converted') return 'tag-blue'
  return 'tag-gray'
}

function DetailBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="role-kickoff-detail-block">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

export default function RoleKickoffDetailPage() {
  const { token, accountId } = useOutletContext<DashboardOutletContext>()
  const { kickoffId } = useParams<{ kickoffId: string }>()
  const id = Number(kickoffId)
  const { user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const base = `/account/${accountId}/jobs/role-kickoff`

  const [row, setRow] = useState<RoleKickoffRequestRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  const [feedbackOpen, setFeedbackOpen] = useState<'reject' | 'changes' | null>(null)
  const [feedbackText, setFeedbackText] = useState('')
  const [acting, setActing] = useState(false)

  const load = useCallback(async () => {
    if (!Number.isFinite(id)) {
      setErr('Invalid request')
      setLoading(false)
      return
    }
    setErr('')
    setLoading(true)
    try {
      const r = await roleKickoffApi.get(token, id)
      setRow(r)
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Failed to load')
      setRow(null)
    } finally {
      setLoading(false)
    }
  }, [token, id])

  useEffect(() => {
    void load()
  }, [load])

  const isAssignee = row != null && user?.id === row.assigned_recruiter_user_id
  const isCreator = row != null && user?.id === row.created_by_user_id
  const canProcess = can(user, 'kickoff', 'process') && isAssignee
  const canCreateJob = can(user, 'jobs', 'create') && canProcess
  const showHmActions = isCreator && row?.status === 'changes_requested'

  const submitFeedback = async () => {
    if (!row || !feedbackOpen) return
    if (feedbackOpen === 'changes' && !feedbackText.trim()) {
      toast.error('Feedback required', 'Please explain what should change.')
      return
    }
    setActing(true)
    try {
      if (feedbackOpen === 'reject') {
        const u = await roleKickoffApi.reject(token, row.id, feedbackText)
        setRow(u)
        toast.success('Rejected', 'The hiring manager has been notified.')
      } else {
        const u = await roleKickoffApi.requestChanges(token, row.id, feedbackText)
        setRow(u)
        toast.success('Feedback sent', 'The hiring manager can update and resubmit.')
      }
      setFeedbackOpen(null)
      setFeedbackText('')
    } catch (e: unknown) {
      toast.error('Action failed', e instanceof Error ? e.message : 'Failed')
    } finally {
      setActing(false)
    }
  }

  const approve = async () => {
    if (!row) return
    setActing(true)
    try {
      const u = await roleKickoffApi.approve(token, row.id)
      setRow(u)
      toast.success('Approved', 'You can create the job when ready.')
    } catch (e: unknown) {
      toast.error('Approve failed', e instanceof Error ? e.message : 'Failed')
    } finally {
      setActing(false)
    }
  }

  const createJob = async () => {
    if (!row) return
    setActing(true)
    try {
      const job = await roleKickoffApi.createJob(token, row.id)
      if (!job?.id) throw new Error('Missing job id')
      toast.success('Job created', 'Opening the job editor…')
      navigate(`/account/${accountId}/jobs/${job.id}/edit`)
    } catch (e: unknown) {
      toast.error('Create job failed', e instanceof Error ? e.message : 'Failed')
    } finally {
      setActing(false)
    }
  }

  if (loading) {
    return (
      <div className="role-kickoff-page" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
        <div className="spinner" style={{ margin: '0 auto 12px' }} aria-label="Loading" />
        Loading…
      </div>
    )
  }

  if (err || !row) {
    return (
      <div className="role-kickoff-page">
        <p style={{ color: 'var(--error)' }}>{err || 'Not found'}</p>
        <Link to={base}>Back to role kickoff</Link>
      </div>
    )
  }

  const st = String(row.status)

  return (
    <div className="role-kickoff-page">
      <header className="role-kickoff-page-header">
        <div>
          <h1 className="role-kickoff-page-title">{row.title}</h1>
          <p style={{ margin: '8px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>
            <span className={`tag ${statusTagClass(st)}`}>{statusLabel(st)}</span>
            {row.converted_job_id ? (
              <span style={{ marginLeft: 10 }}>
                Job #{row.converted_job_id}{' '}
                <Link to={`/account/${accountId}/jobs/${row.converted_job_id}/edit`}>(open)</Link>
              </span>
            ) : null}
          </p>
        </div>
        <Link to={base} className="btn-kickoff-secondary" style={{ textDecoration: 'none', lineHeight: '40px' }}>
          Back to list
        </Link>
      </header>

      {row.recruiter_feedback ? (
        <div
          style={{
            marginBottom: 20,
            padding: 14,
            background: 'var(--info-bg)',
            border: '1px solid var(--info-border)',
            borderRadius: 8,
            fontSize: 14,
          }}
        >
          <strong>Recruiter feedback</strong>
          <div style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{row.recruiter_feedback}</div>
        </div>
      ) : null}

      <div className="role-kickoff-detail-grid">
        <DetailBlock label="Hiring manager">
          {row.hiring_manager_name ?? '—'}
          {row.hiring_manager_email ? <div className="list-row-sub">{row.hiring_manager_email}</div> : null}
        </DetailBlock>
        <DetailBlock label="Assigned recruiter">
          {row.recruiter_name ?? '—'}
          {row.recruiter_email ? <div className="list-row-sub">{row.recruiter_email}</div> : null}
        </DetailBlock>
        <DetailBlock label="Department">{row.department ?? '—'}</DetailBlock>
        <DetailBlock label="Openings">{row.open_positions}</DetailBlock>
        <DetailBlock label="Location">{row.location ?? '—'}</DetailBlock>
        <DetailBlock label="Why hiring">{row.why_hiring ?? '—'}</DetailBlock>
        <DetailBlock label="30 / 60 / 90 expectations">{row.expectation_30_60_90 ?? '—'}</DetailBlock>
        <DetailBlock label="Success definition">{row.success_definition ?? '—'}</DetailBlock>
        <DetailBlock label="Must-have skills">
          {(row.skills_must_have ?? []).length ? (row.skills_must_have ?? []).join(', ') : '—'}
        </DetailBlock>
        <DetailBlock label="Good-to-have skills">
          {(row.skills_nice_to_have ?? []).length ? (row.skills_nice_to_have ?? []).join(', ') : '—'}
        </DetailBlock>
        <DetailBlock label="Experience">{row.experience_note ?? '—'}</DetailBlock>
        <DetailBlock label="Salary range">
          {row.salary_min != null || row.salary_max != null
            ? `${row.salary_min ?? '—'} – ${row.salary_max ?? '—'} ${row.salary_currency || 'USD'}`
            : '—'}
        </DetailBlock>
        <DetailBlock label="Budget notes">{row.budget_notes ?? '—'}</DetailBlock>
        <DetailBlock label="Interview rounds">{row.interview_rounds ?? '—'}</DetailBlock>
        <DetailBlock label="Interviewers / plan">{row.interviewers_note ?? '—'}</DetailBlock>
      </div>

      {showHmActions ? (
        <div className="role-kickoff-actions">
          <Link
            to={`${base}/${row.id}/edit`}
            className="btn-jobs-primary"
            style={{ textDecoration: 'none', display: 'inline-block', lineHeight: '40px', textAlign: 'center' }}
          >
            Update request
          </Link>
        </div>
      ) : null}

      {canProcess && st !== 'converted' ? (
        <div className="role-kickoff-actions">
          {st === 'submitted' || st === 'changes_requested' ? (
            <>
              <button type="button" className="btn-jobs-primary" disabled={acting} onClick={() => void approve()}>
                Accept request
              </button>
              <button
                type="button"
                className="btn-kickoff-secondary"
                disabled={acting}
                onClick={() => {
                  setFeedbackOpen('changes')
                  setFeedbackText('')
                }}
              >
                Request changes
              </button>
              <button
                type="button"
                className="btn-kickoff-danger"
                disabled={acting}
                onClick={() => {
                  setFeedbackOpen('reject')
                  setFeedbackText('')
                }}
              >
                Reject
              </button>
            </>
          ) : null}
          {st === 'approved' && !row.converted_job_id && canCreateJob ? (
            <button type="button" className="btn-jobs-primary" disabled={acting} onClick={() => void createJob()}>
              Create job from request
            </button>
          ) : null}
          {st === 'approved' && !row.converted_job_id && !canCreateJob ? (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
              You need permission to create jobs to convert this kickoff.
            </p>
          ) : null}
        </div>
      ) : null}

      {feedbackOpen ? (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="rk-feedback-title">
          <div className="modal-panel" style={{ maxWidth: 480 }}>
            <h2 id="rk-feedback-title" style={{ fontSize: 18, marginBottom: 12 }}>
              {feedbackOpen === 'reject' ? 'Reject request' : 'Request changes'}
            </h2>
            <label htmlFor="rk-feedback-ta" style={{ fontSize: 13, fontWeight: 600 }}>
              {feedbackOpen === 'reject' ? 'Notes (optional)' : 'What should change?'}
            </label>
            <textarea
              id="rk-feedback-ta"
              value={feedbackText}
              onChange={e => setFeedbackText(e.target.value)}
              rows={5}
              style={{
                width: '100%',
                marginTop: 8,
                fontFamily: 'var(--font)',
                fontSize: 14,
                padding: 10,
                borderRadius: 8,
                border: '1px solid var(--border)',
              }}
            />
            <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn-kickoff-secondary"
                disabled={acting}
                onClick={() => {
                  setFeedbackOpen(null)
                  setFeedbackText('')
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className={feedbackOpen === 'reject' ? 'btn-kickoff-danger' : 'btn-jobs-primary'}
                disabled={acting}
                onClick={() => void submitFeedback()}
              >
                {acting ? '…' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

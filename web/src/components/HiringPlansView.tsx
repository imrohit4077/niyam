import { useCallback, useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import type { DashboardOutletContext } from '../layouts/DashboardOutletContext'
import { jobsApi, type Job } from '../api/jobs'
import { hiringPlansApi, type HiringPlan } from '../api/hiringPlans'
import { useToast } from '../contexts/ToastContext'

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
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

function ListHeader({ title, count, onAction, actionLabel = '+ New' }: { title: string; count: number; onAction?: () => void; actionLabel?: string }) {
  return (
    <div className="list-header">
      <div className="list-header-left">
        <span className="list-header-title">{title}</span>
        <span className="list-header-count">{count}</span>
      </div>
      {onAction && (
        <button type="button" className="btn-action" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  )
}

function ConfirmDialog({
  title,
  message,
  onConfirm,
  onCancel,
}: {
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
        <div className="confirm-title">{title}</div>
        <div className="confirm-message">{message}</div>
        <div className="confirm-actions">
          <button type="button" className="btn-confirm-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn-confirm-danger" onClick={onConfirm}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}

function HealthBadge({ plan }: { plan: HiringPlan }) {
  const h = plan.health
  if (!h) return null
  if (h.label === 'complete') {
    return <span className="health-badge health-badge-success">Complete</span>
  }
  if (h.at_risk) {
    return <span className="health-badge health-badge-risk">At risk</span>
  }
  if (h.on_track === true) {
    return <span className="health-badge health-badge-ok">On track</span>
  }
  if (plan.plan_status !== 'active') {
    return <span className="health-badge health-badge-muted">{plan.plan_status}</span>
  }
  return <span className="health-badge health-badge-muted">—</span>
}

function ProgressBar({ made, target }: { made: number; target: number }) {
  const t = Math.max(target, 1)
  const pct = Math.min(100, Math.round((made / t) * 100))
  return (
    <div className="hiring-progress" aria-label={`${made} of ${target} hires`}>
      <div className="hiring-progress-track">
        <div className="hiring-progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="hiring-progress-label">
        {made} / {target}
      </span>
    </div>
  )
}

function PlanForm({
  token,
  jobs,
  plan,
  onSave,
  onClose,
}: {
  token: string
  jobs: Job[]
  plan?: HiringPlan
  onSave: () => void
  onClose: () => void
}) {
  const toast = useToast()
  const [form, setForm] = useState({
    job_id: plan ? String(plan.job_id) : '',
    target_hires: String(plan?.target_hires ?? 1),
    deadline: plan?.deadline ? plan.deadline.slice(0, 10) : '',
    plan_status: plan?.plan_status ?? 'active',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const submit = async () => {
    if (!plan && !form.job_id) {
      setErr('Select a job')
      return
    }
    setSaving(true)
    setErr('')
    try {
      if (plan) {
        await hiringPlansApi.update(token, plan.id, {
          target_hires: Number(form.target_hires),
          deadline: form.deadline ? form.deadline : null,
          plan_status: form.plan_status,
        })
        toast.success('Plan updated', 'Hiring plan saved.')
      } else {
        await hiringPlansApi.create(token, {
          job_id: Number(form.job_id),
          target_hires: Number(form.target_hires),
          deadline: form.deadline ? form.deadline : null,
          plan_status: form.plan_status,
        })
        toast.success('Plan created', 'Hiring plan is live for this job.')
      }
      onSave()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed'
      setErr(msg)
      toast.error('Save failed', msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={plan ? 'Edit hiring plan' : 'New hiring plan'} onClose={onClose}>
      {err && <div className="auth-error">{err}</div>}
      {!plan && (
        <FormField label="Job *">
          <select value={form.job_id} onChange={e => setForm(f => ({ ...f, job_id: e.target.value }))}>
            <option value="">Select job…</option>
            {jobs.map(j => (
              <option key={j.id} value={j.id}>
                {j.title}
              </option>
            ))}
          </select>
        </FormField>
      )}
      <FormField label="Target hires">
        <input
          type="number"
          min={1}
          value={form.target_hires}
          onChange={e => setForm(f => ({ ...f, target_hires: e.target.value }))}
        />
      </FormField>
      <FormField label="Deadline">
        <input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
      </FormField>
      <FormField label="Plan status">
        <select value={form.plan_status} onChange={e => setForm(f => ({ ...f, plan_status: e.target.value }))}>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="completed">Completed</option>
        </select>
      </FormField>
      <p className="form-hint">Hires filled are synced automatically when applications are marked hired.</p>
      <button type="button" className="btn-primary" onClick={submit} disabled={saving}>
        {saving ? 'Saving…' : plan ? 'Update plan' : 'Create plan'}
      </button>
    </Modal>
  )
}

export default function HiringPlansView() {
  const { token } = useOutletContext<DashboardOutletContext>()
  const toast = useToast()
  const [plans, setPlans] = useState<HiringPlan[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<HiringPlan | undefined>()
  const [confirmDelete, setConfirmDelete] = useState<HiringPlan | null>(null)
  const [filterQ, setFilterQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [planStatusFilter, setPlanStatusFilter] = useState<string>('')

  const jobTitle = (id: number) => jobs.find(j => j.id === id)?.title ?? `Job #${id}`

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(filterQ.trim()), 320)
    return () => clearTimeout(t)
  }, [filterQ])

  const load = useCallback(async () => {
    setLoading(true)
    setErr('')
    try {
      const [p, j] = await Promise.all([
        hiringPlansApi.list(token, {
          q: debouncedQ || undefined,
          planStatus: planStatusFilter || undefined,
        }),
        jobsApi.list(token),
      ])
      setPlans(p)
      setJobs(j)
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [token, debouncedQ, planStatusFilter])

  useEffect(() => {
    load()
  }, [load])

  const del = async (p: HiringPlan) => {
    try {
      await hiringPlansApi.delete(token, p.id)
      toast.success('Plan removed', 'Hiring plan deleted.')
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
          title="Delete hiring plan"
          message={`Remove the hiring plan for “${jobTitle(confirmDelete.job_id)}”?`}
          onConfirm={() => del(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
      {(showForm || editing) && (
        <PlanForm
          token={token}
          jobs={jobs}
          plan={editing}
          onSave={() => {
            setShowForm(false)
            setEditing(undefined)
            load()
          }}
          onClose={() => {
            setShowForm(false)
            setEditing(undefined)
          }}
        />
      )}
      <ListHeader title="Hiring plans" count={plans.length} onAction={() => setShowForm(true)} actionLabel="+ New plan" />
      <div className="hiring-plans-toolbar">
        <p className="hiring-plans-intro">
          Set volume, deadlines, and track progress per job. Health reflects whether you can still hit the target before the deadline.
        </p>
        <div className="list-filters-bar" role="search" aria-label="Filter hiring plans">
          <input
            type="search"
            className="list-filter-input"
            placeholder="Search by job title…"
            value={filterQ}
            onChange={e => setFilterQ(e.target.value)}
            aria-label="Search hiring plans"
          />
          <select
            className="list-filter-select"
            value={planStatusFilter}
            onChange={e => setPlanStatusFilter(e.target.value)}
            aria-label="Plan status"
          >
            <option value="">All plan statuses</option>
            <option value="active">active</option>
            <option value="paused">paused</option>
            <option value="completed">completed</option>
          </select>
        </div>
      </div>
      <div className="list-table hiring-plans-table">
        <div className="list-table-head">
          <div className="list-col list-col-main">Job</div>
          <div className="list-col hiring-col-progress">Progress</div>
          <div className="list-col">Deadline</div>
          <div className="list-col">Health</div>
          <div className="list-col">Status</div>
          <div className="list-col">Actions</div>
        </div>
        {loading && (
          <div className="list-loading">
            <div className="spinner" style={{ width: 24, height: 24 }} />
            Loading plans…
          </div>
        )}
        {err && <div className="list-error">{err}</div>}
        {!loading && !err && plans.length === 0 && (
          <div className="list-empty">No hiring plans yet. Create one to align the team on targets.</div>
        )}
        {plans.map(p => (
          <div key={p.id} className="list-row hiring-plan-row">
            <div className="list-col list-col-main">
              <div className="list-row-name">{jobTitle(p.job_id)}</div>
              <div className="list-row-sub">Plan #{p.id}</div>
            </div>
            <div className="list-col hiring-col-progress">
              <ProgressBar made={p.hires_made} target={p.target_hires} />
            </div>
            <div className="list-col list-row-sub">
              {p.deadline ? new Date(p.deadline + 'T12:00:00').toLocaleDateString() : '—'}
            </div>
            <div className="list-col">
              <HealthBadge plan={p} />
            </div>
            <div className="list-col">
              <span className={`tag ${p.plan_status === 'active' ? 'tag-green' : p.plan_status === 'paused' ? 'tag-orange' : 'tag-gray'}`}>
                {p.plan_status}
              </span>
            </div>
            <div className="list-col hiring-plan-actions">
              <button type="button" className="btn-row-action" onClick={() => setEditing(p)}>
                Edit
              </button>
              <button type="button" className="btn-row-action btn-row-danger" onClick={() => setConfirmDelete(p)}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

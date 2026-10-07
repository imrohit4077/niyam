import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link, useOutletContext, useNavigate, useParams, useSearchParams } from 'react-router-dom'
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
import { getOrganizationSettings, type OrganizationSettings } from '../api/accountOrganization'
import { fetchCountriesCatalog, type CountryRow } from '../api/reference'
import { Icon, type IconName, type Model3DName } from '../icons'
import { EmptyState, LoadingState } from './EmptyState'

function normalizeOrgSettings(row: OrganizationSettings): OrganizationSettings {
  return {
    ...row,
    departments: Array.isArray(row.departments) ? row.departments : [],
    enabled_country_codes:
      row.enabled_country_codes === undefined ? null : row.enabled_country_codes,
  }
}

// ── Shared UI primitives ───────────────────────────────────────────

type PanelIconType = 'user' | 'building' | 'shield' | 'clock' | 'briefcase' | 'document' | 'people' | 'calendar' | 'team' | 'gear'

const PANEL_ICONS: Record<PanelIconType, IconName> = {
  user: 'profile',
  building: 'building',
  shield: 'shieldCheck',
  clock: 'clock',
  briefcase: 'jobs',
  document: 'applications',
  people: 'candidates',
  calendar: 'interviews',
  team: 'team',
  gear: 'settings',
}

function PanelIcon({ type }: { type: PanelIconType }) {
  return (
    <span className="panel-header-icon">
      <Icon name={PANEL_ICONS[type]} size={15} />
    </span>
  )
}

function Panel({ icon, title, children }: { icon: PanelIconType; title: string; children: React.ReactNode }) {
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
      {onAction && (
        <button type="button" className="btn-primary btn-primary--inline list-header-action" onClick={onAction}>
          <Icon name="plus" size={16} strokeWidth={2.2} />
          {actionLabel.replace(/^\+\s*/, '')}
        </button>
      )}
    </div>
  )
}

function LoadingRow() {
  return <LoadingState />
}

function ErrorRow({ msg }: { msg: string }) {
  return (
    <div className="nx-alert nx-alert--error" role="alert">
      <Icon name="alert" size={16} />
      {msg}
    </div>
  )
}

function EmptyRow({ text, icon = 'inbox', title = 'Nothing here yet' }: { text: string; icon?: Model3DName; title?: string }) {
  return <EmptyState icon={icon} title={title} text={text} />
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
          <Icon name="alert" size={24} />
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
            <Icon name="x" size={18} />
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

function JobIconPencil() {
  return <Icon name="edit" size={17} />
}
function JobIconExternal() {
  return <Icon name="external" size={17} />
}
function JobIconCopy() {
  return <Icon name="copy" size={17} />
}
function JobIconTrash() {
  return <Icon name="trash" size={17} />
}

type JobsViewMode = 'list' | 'grid' | 'table'
const JOBS_VIEW_STORAGE_KEY = 'niyam_jobs_view_mode'

function JobIconBriefcaseMini() {
  return <Icon name="jobs" size={17} />
}
function JobIconBuildingMini() {
  return <Icon name="building" size={15} />
}
function JobIconPinMini() {
  return <Icon name="location" size={15} />
}
function JobIconFilterSliders() {
  return <Icon name="sliders" size={16} />
}
function JobIconList() {
  return <Icon name="list" size={16} />
}
function JobIconGrid() {
  return <Icon name="grid" size={16} />
}
function JobIconTable() {
  return <Icon name="table" size={16} />
}

function JobStatusBadge({ status }: { status: string }) {
  const cls = STAGE_COLORS[status] ?? 'tag-gray'
  const label = status.replace(/_/g, ' ')
  return <span className={`job-status-badge tag ${cls}`}>{label.charAt(0).toUpperCase() + label.slice(1)}</span>
}

function JobsJobActions({
  job,
  accountId,
  navigate,
  toast,
  onDelete,
}: {
  job: Job
  accountId: string
  navigate: ReturnType<typeof useNavigate>
  toast: { success: (title: string, message?: string) => void; error: (title: string, message?: string) => void }
  onDelete: (j: Job) => void
}) {
  return (
    <div className="jobs-actions-row">
      <button
        type="button"
        className="btn-icon-round jobs-action-btn"
        title="Edit job"
        aria-label="Edit job"
        onClick={() => navigate(`/account/${accountId}/jobs/${job.id}/edit`)}
      >
        <JobIconPencil />
      </button>
      {job.apply_token ? (
        <>
          <button
            type="button"
            className="btn-icon-round jobs-action-btn"
            title={job.status === 'open' ? 'Open apply page' : 'Job must be Open to apply'}
            aria-label="Open apply page"
            disabled={job.status !== 'open'}
            onClick={() => {
              const u = `${window.location.origin}/apply/${encodeURIComponent(job.apply_token!)}`
              window.open(u, '_blank', 'noopener,noreferrer')
            }}
          >
            <JobIconExternal />
          </button>
          <button
            type="button"
            className="btn-icon-round jobs-action-btn"
            title={job.status === 'open' ? 'Copy apply link' : 'Job must be Open'}
            aria-label="Copy apply link"
            disabled={job.status !== 'open'}
            onClick={() => {
              const u = `${window.location.origin}/apply/${encodeURIComponent(job.apply_token!)}`
              void navigator.clipboard.writeText(u).then(
                () => toast.success('Apply link copied', 'Share this URL with candidates.'),
                () => toast.error('Copy failed', 'Open the apply page and copy from the address bar.'),
              )
            }}
          >
            <JobIconCopy />
          </button>
        </>
      ) : null}
      <button
        type="button"
        className="btn-icon-round btn-icon-round--danger jobs-action-btn"
        title="Delete job"
        aria-label="Delete job"
        onClick={() => onDelete(job)}
      >
        <JobIconTrash />
      </button>
    </div>
  )
}

function formatEmploymentType(t: string): string {
  const m: Record<string, string> = {
    full_time: 'Full-time',
    part_time: 'Part-time',
    contract: 'Contract',
    internship: 'Internship',
  }
  return m[t] ?? t.replace(/_/g, ' ')
}

function formatWorkMode(t: string): string {
  const m: Record<string, string> = {
    onsite: 'On-site',
    remote: 'Remote',
    hybrid: 'Hybrid',
  }
  return m[t] ?? t
}

function formatExperienceLevel(level: string | null | undefined): string {
  if (!level) return '—'
  const map: Record<string, string> = {
    '0-1': '0–1 yr',
    '2-5': '2–5 yr',
    '6-10': '6–10 yr',
    '10+': '10+ yr',
  }
  return map[level] ?? level
}

function formatSalaryRange(job: Job): string | null {
  if (!job.salary_visible) return null
  const cur = job.salary_currency || 'USD'
  const min = job.salary_min
  const max = job.salary_max
  if (min == null && max == null) return null
  const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 })
  if (min != null && max != null) return `${cur} ${fmt(min)} – ${fmt(max)}`
  if (min != null) return `${cur} ${fmt(min)}+`
  if (max != null) return `Up to ${cur} ${fmt(max)}`
  return null
}

function jobOpenSeats(job: Job): number {
  return Math.max(1, job.open_positions ?? 1)
}

function JobsJobProfileDetails({ job }: { job: Job }) {
  const salary = formatSalaryRange(job)
  const published =
    job.published_at && job.status !== 'draft'
      ? new Date(job.published_at).toLocaleDateString(undefined, { dateStyle: 'medium' })
      : null
  return (
    <div className="jobs-grid-card-details">
      <div className="jobs-detail-row">
        <span className="jobs-detail-label">Vacancies</span>
        <span className="jobs-detail-value jobs-detail-value--strong">
          {jobOpenSeats(job)} {jobOpenSeats(job) === 1 ? 'open seat' : 'open seats'}
        </span>
      </div>
      <div className="jobs-detail-row">
        <span className="jobs-detail-label">Work</span>
        <span className="jobs-detail-value">
          {formatEmploymentType(job.employment_type)} · {formatWorkMode(job.location_type)}
        </span>
      </div>
      <div className="jobs-detail-row">
        <span className="jobs-detail-label">Experience</span>
        <span className="jobs-detail-value">{formatExperienceLevel(job.experience_level)}</span>
      </div>
      {salary ? (
        <div className="jobs-detail-row">
          <span className="jobs-detail-label">Salary</span>
          <span className="jobs-detail-value">{salary}</span>
        </div>
      ) : null}
      {job.requisition_id ? (
        <div className="jobs-detail-row">
          <span className="jobs-detail-label">Requisition</span>
          <span className="jobs-detail-value jobs-detail-value--mono">{job.requisition_id}</span>
        </div>
      ) : null}
      {published ? (
        <div className="jobs-detail-row">
          <span className="jobs-detail-label">Published</span>
          <span className="jobs-detail-value">{published}</span>
        </div>
      ) : null}
    </div>
  )
}

export function JobsView(props: { jobsScope?: 'all' | 'mine' }) {
  const { jobsScope = 'all' } = props
  const { token, accountId, user } = useOutletContext<DashboardOutletContext>()
  const navigate = useNavigate()
  const toast = useToast()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<Job | null>(null)
  const [filterQ, setFilterQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [orgSettings, setOrgSettings] = useState<OrganizationSettings | null>(null)
  const [countries, setCountries] = useState<CountryRow[]>([])
  const [viewMode, setViewMode] = useState<JobsViewMode>(() => {
    try {
      const v = sessionStorage.getItem(JOBS_VIEW_STORAGE_KEY)
      if (v === 'list' || v === 'grid' || v === 'table') return v
    } catch {
      /* ignore */
    }
    return 'table'
  })
  const [filtersOpen, setFiltersOpen] = useState(false)

  useEffect(() => {
    try {
      sessionStorage.setItem(JOBS_VIEW_STORAGE_KEY, viewMode)
    } catch {
      /* ignore */
    }
  }, [viewMode])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(filterQ.trim()), 320)
    return () => clearTimeout(t)
  }, [filterQ])

  const loadMeta = useCallback(async () => {
    const aid = Number(accountId)
    if (!token || !Number.isFinite(aid)) return
    try {
      const [org, cat] = await Promise.all([getOrganizationSettings(token, aid), fetchCountriesCatalog(token)])
      setOrgSettings(normalizeOrgSettings(org))
      setCountries(cat.countries)
    } catch {
      setOrgSettings(null)
      setCountries([])
    }
  }, [token, accountId])

  useEffect(() => {
    void loadMeta()
  }, [loadMeta])

  const locationOptions = useMemo((): CountryRow[] => {
    const enabled = orgSettings?.enabled_country_codes
    if (!countries.length) return []
    if (enabled === null || enabled === undefined) return countries
    const allow = new Set(enabled)
    return countries.filter((c: CountryRow) => allow.has(c.code))
  }, [orgSettings, countries])

  const load = useCallback(async () => {
    setLoading(true)
    setErr('')
    try {
      setJobs(
        await jobsApi.list(token, {
          q: debouncedQ || undefined,
          status: statusFilter || undefined,
          department: departmentFilter.trim() || undefined,
          location: locationFilter.trim() || undefined,
        }),
      )
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }, [token, debouncedQ, statusFilter, departmentFilter, locationFilter])

  useEffect(() => {
    void load()
  }, [load])

  const visibleJobs = useMemo(() => {
    if (jobsScope !== 'mine' || user?.id == null) return jobs
    return jobs.filter(j => (j.hiring_manager_user_id ?? null) === user.id)
  }, [jobs, jobsScope, user?.id])

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

  const deptOptions = orgSettings?.departments ?? []

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
      <div className="jobs-page">
        <header className="jobs-page-header">
          <div className="jobs-page-header-row">
            <h2 className="jobs-page-title">
              {jobsScope === 'mine' ? 'My jobs' : 'All jobs'}
              <span className="jobs-page-count-pill" aria-live="polite">
                {visibleJobs.length}
              </span>
            </h2>
            <button
              type="button"
              className="btn-jobs-primary"
              onClick={() => navigate(`/account/${accountId}/jobs/new`)}
            >
              <Icon name="plus" size={16} strokeWidth={2.2} /> New job
            </button>
          </div>
        </header>

        <div className="jobs-toolbar" role="search" aria-label="Search and view options">
          <div className="jobs-toolbar-search-wrap">
            <span className="jobs-filter-icon" aria-hidden>
              <Icon name="search" size={17} />
            </span>
            <input
              type="search"
              className="jobs-filter-search"
              placeholder="Search title, department…"
              value={filterQ}
              onChange={e => setFilterQ(e.target.value)}
              aria-label="Search jobs"
            />
            {filterQ.trim() ? (
              <button
                type="button"
                className="jobs-search-clear"
                onClick={() => setFilterQ('')}
                aria-label="Clear search"
              >
                <Icon name="x" size={16} />
              </button>
            ) : null}
          </div>
          <div className="jobs-toolbar-right">
            <button
              type="button"
              className={`jobs-btn-filters${filtersOpen ? ' jobs-btn-filters--active' : ''}`}
              onClick={() => setFiltersOpen(o => !o)}
              aria-expanded={filtersOpen}
              aria-controls="jobs-filters-panel"
            >
              <JobIconFilterSliders />
              <span>Filters</span>
            </button>
            <div className="jobs-view-segment" role="group" aria-label="Layout">
              <button
                type="button"
                className={viewMode === 'list' ? 'is-active' : ''}
                onClick={() => setViewMode('list')}
                aria-pressed={viewMode === 'list'}
              >
                <JobIconList />
                <span>List</span>
              </button>
              <button
                type="button"
                className={viewMode === 'grid' ? 'is-active' : ''}
                onClick={() => setViewMode('grid')}
                aria-pressed={viewMode === 'grid'}
              >
                <JobIconGrid />
                <span>Grid</span>
              </button>
              <button
                type="button"
                className={viewMode === 'table' ? 'is-active' : ''}
                onClick={() => setViewMode('table')}
                aria-pressed={viewMode === 'table'}
              >
                <JobIconTable />
                <span>Table</span>
              </button>
            </div>
          </div>
        </div>

        {filtersOpen ? (
          <div id="jobs-filters-panel" className="jobs-filters-panel">
            <div className="jobs-filters-row jobs-filters-row--selects">
              <label className="jobs-filter-field">
                <span className="jobs-filter-label">Status</span>
                <select
                  className="jobs-filter-select"
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                >
                  <option value="">All statuses</option>
                  <option value="draft">Draft</option>
                  <option value="open">Open</option>
                  <option value="paused">Paused</option>
                  <option value="closed">Closed</option>
                </select>
              </label>
              <label className="jobs-filter-field">
                <span className="jobs-filter-label">Department</span>
                <select
                  className="jobs-filter-select"
                  value={departmentFilter}
                  onChange={e => setDepartmentFilter(e.target.value)}
                >
                  <option value="">All departments</option>
                  {deptOptions.map(d => (
                    <option key={d.id} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="jobs-filter-field">
                <span className="jobs-filter-label">Location</span>
                <select
                  className="jobs-filter-select"
                  value={locationFilter}
                  onChange={e => setLocationFilter(e.target.value)}
                >
                  <option value="">All locations</option>
                  {locationOptions.map(c => (
                    <option key={c.code} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        ) : null}

        {loading ? (
          <div className="jobs-panel-shell">
            <LoadingRow />
          </div>
        ) : null}
        {!loading && err ? (
          <div className="jobs-panel-shell">
            <ErrorRow msg={err} />
          </div>
        ) : null}
        {!loading && !err && visibleJobs.length === 0 ? (
          <div className="jobs-panel-shell jobs-panel-shell--empty">
            <EmptyRow
              icon="jobs"
              title={debouncedQ || statusFilter || departmentFilter || locationFilter ? 'No matching jobs' : 'No jobs yet'}
              text={
                debouncedQ || statusFilter || departmentFilter || locationFilter
                  ? 'No jobs match your filters. Try clearing filters or create a new job.'
                  : jobsScope === 'mine'
                    ? 'No jobs list you as hiring manager yet.'
                    : 'No jobs yet. Create your first job to get started.'
              }
            />
          </div>
        ) : null}

        {!loading && !err && visibleJobs.length > 0 && viewMode === 'table' ? (
          <div className="list-table jobs-table jobs-table--mgmt">
            <div className="list-table-head jobs-table-head jobs-table-head--mgmt jobs-table-grid">
              <div className="list-col list-col-main">Job title</div>
              <div className="list-col jobs-col-dept">Department</div>
              <div className="list-col jobs-col-loc">Location</div>
              <div className="list-col jobs-col-vacancies">Vacancies</div>
              <div className="list-col jobs-col-work">Work</div>
              <div className="list-col jobs-col-exp">Experience</div>
              <div className="list-col jobs-col-salary">Salary</div>
              <div className="list-col jobs-col-status">Status</div>
              <div className="list-col list-col-actions">Actions</div>
            </div>
            {visibleJobs.map(j => (
              <div key={j.id} className="list-row jobs-table-row jobs-table-grid">
                <div className="list-col list-col-main">
                  <div className="jobs-cell-title">
                    <div className="jobs-cell-title-text">
                      <div className="list-row-name">{j.title}</div>
                      <div className="list-row-sub jobs-table-slug" title={j.slug}>
                        {j.slug}
                      </div>
                    </div>
                    <span className="jobs-cell-title-icon" aria-hidden>
                      <JobIconBriefcaseMini />
                    </span>
                  </div>
                </div>
                <div className="list-col jobs-col-dept jobs-cell-with-icon">
                  <span className="jobs-cell-icon" aria-hidden>
                    <JobIconBuildingMini />
                  </span>
                  <span className="jobs-cell-text">{j.department || '—'}</span>
                </div>
                <div className="list-col jobs-col-loc jobs-cell-with-icon">
                  <span className="jobs-cell-icon" aria-hidden>
                    <JobIconPinMini />
                  </span>
                  <span className="jobs-cell-text">{j.location || '—'}</span>
                </div>
                <div className="list-col jobs-col-vacancies">
                  <span className="jobs-vacancy-num">{jobOpenSeats(j)}</span>
                </div>
                <div className="list-col jobs-col-work">
                  <span className="jobs-cell-text jobs-cell-text--compact">
                    {formatEmploymentType(j.employment_type)} · {formatWorkMode(j.location_type)}
                  </span>
                </div>
                <div className="list-col jobs-col-exp">
                  <span className="jobs-cell-text jobs-cell-text--muted">{formatExperienceLevel(j.experience_level)}</span>
                </div>
                <div className="list-col jobs-col-salary">
                  <span className="jobs-cell-text jobs-cell-text--muted">{formatSalaryRange(j) ?? '—'}</span>
                </div>
                <div className="list-col jobs-col-status">
                  <JobStatusBadge status={j.status} />
                </div>
                <div className="list-col list-col-actions">
                  <JobsJobActions
                    job={j}
                    accountId={accountId}
                    navigate={navigate}
                    toast={toast}
                    onDelete={setConfirmDelete}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {!loading && !err && visibleJobs.length > 0 && viewMode === 'grid' ? (
          <div className="jobs-grid">
            {visibleJobs.map(j => (
              <article key={j.id} className="jobs-grid-card">
                <div className="jobs-grid-card-top">
                  <div className="jobs-grid-card-title-block">
                    <div className="jobs-grid-card-title">{j.title}</div>
                    <div className="jobs-grid-card-slug">{j.slug}</div>
                  </div>
                  <span className="jobs-grid-card-icon" aria-hidden>
                    <JobIconBriefcaseMini />
                  </span>
                </div>
                <div className="jobs-grid-card-meta">
                  <span>
                    <JobIconBuildingMini /> {j.department || '—'}
                  </span>
                  <span>
                    <JobIconPinMini /> {j.location || '—'}
                  </span>
                </div>
                <JobsJobProfileDetails job={j} />
                <div className="jobs-grid-card-status">
                  <JobStatusBadge status={j.status} />
                </div>
                <div className="jobs-grid-card-actions">
                  <JobsJobActions
                    job={j}
                    accountId={accountId}
                    navigate={navigate}
                    toast={toast}
                    onDelete={setConfirmDelete}
                  />
                </div>
              </article>
            ))}
          </div>
        ) : null}

        {!loading && !err && visibleJobs.length > 0 && viewMode === 'list' ? (
          <div className="jobs-list-view">
            {visibleJobs.map(j => (
              <div key={j.id} className="jobs-list-view-row">
                <div className="jobs-list-view-main">
                  <div className="jobs-list-view-title">{j.title}</div>
                  <div className="jobs-list-view-slug">{j.slug}</div>
                  <div className="jobs-list-view-meta">
                    <span>
                      <JobIconBuildingMini /> {j.department || '—'}
                    </span>
                    <span>
                      <JobIconPinMini /> {j.location || '—'}
                    </span>
                  </div>
                  <div className="jobs-list-view-extra" aria-label="Job profile summary">
                    <span className="jobs-list-chip jobs-list-chip--vacancy">
                      <strong>{jobOpenSeats(j)}</strong> {jobOpenSeats(j) === 1 ? 'seat' : 'seats'}
                    </span>
                    <span className="jobs-list-sep" aria-hidden>
                      ·
                    </span>
                    <span>
                      {formatEmploymentType(j.employment_type)} · {formatWorkMode(j.location_type)}
                    </span>
                    {formatExperienceLevel(j.experience_level) !== '—' ? (
                      <>
                        <span className="jobs-list-sep" aria-hidden>
                          ·
                        </span>
                        <span>{formatExperienceLevel(j.experience_level)}</span>
                      </>
                    ) : null}
                    {formatSalaryRange(j) ? (
                      <>
                        <span className="jobs-list-sep" aria-hidden>
                          ·
                        </span>
                        <span>{formatSalaryRange(j)}</span>
                      </>
                    ) : null}
                    {j.requisition_id ? (
                      <>
                        <span className="jobs-list-sep" aria-hidden>
                          ·
                        </span>
                        <code className="jobs-list-req">{j.requisition_id}</code>
                      </>
                    ) : null}
                  </div>
                </div>
                <div className="jobs-list-view-status">
                  <JobStatusBadge status={j.status} />
                </div>
                <div className="jobs-list-view-actions">
                  <JobsJobActions
                    job={j}
                    accountId={accountId}
                    navigate={navigate}
                    toast={toast}
                    onDelete={setConfirmDelete}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : null}
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
  const [filterQ, setFilterQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(filterQ.trim()), 320)
    return () => clearTimeout(t)
  }, [filterQ])

  const load = useCallback(async () => {
    setLoading(true); setErr('')
    try {
      setBoards(await boardsApi.list(token, { q: debouncedQ || undefined }))
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }, [token, debouncedQ])

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
      <div className="list-filters-bar" role="search" aria-label="Filter boards">
        <input
          type="search"
          className="list-filter-input"
          placeholder="Search name, slug, website…"
          value={filterQ}
          onChange={e => setFilterQ(e.target.value)}
          aria-label="Search job boards"
        />
      </div>
      <div className="list-table">
        <div className="list-table-head">
          <div className="list-col list-col-main">Board</div>
          <div className="list-col">Integration</div>
          <div className="list-col">Status</div>
          <div className="list-col">Actions</div>
        </div>
        {loading && <LoadingRow />}
        {err && <ErrorRow msg={err} />}
        {!loading && !err && boards.length === 0 && <EmptyRow icon="boards" title="No job boards yet" text="Add your first job board to start publishing roles." />}
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
    Promise.all([jobsApi.list(token), boardsApi.list(token, { active: true })])
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
  const [filterQ, setFilterQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(filterQ.trim()), 320)
    return () => clearTimeout(t)
  }, [filterQ])

  const load = useCallback(async () => {
    setLoading(true); setErr('')
    try {
      setPostings(
        await postingsApi.list(token, {
          q: debouncedQ || undefined,
          status: statusFilter || undefined,
        }),
      )
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }, [token, debouncedQ, statusFilter])

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
      <div className="list-filters-bar" role="search" aria-label="Filter postings">
        <input
          type="search"
          className="list-filter-input"
          placeholder="Search job, board, external URL…"
          value={filterQ}
          onChange={e => setFilterQ(e.target.value)}
          aria-label="Search postings"
        />
        <select
          className="list-filter-select"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          aria-label="Posting status"
        >
          <option value="">All statuses</option>
          <option value="pending">pending</option>
          <option value="posted">posted</option>
          <option value="failed">failed</option>
          <option value="withdrawn">withdrawn</option>
        </select>
      </div>
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
        {!loading && !err && postings.length === 0 && <EmptyRow icon="postings" title="No postings yet" text="Post your first job to a board to start attracting applicants." />}
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
  const [filterQ, setFilterQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [jobFilter, setJobFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [sourceFilter, setSourceFilter] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(filterQ.trim()), 320)
    return () => clearTimeout(t)
  }, [filterQ])

  const load = useCallback(async () => {
    setLoading(true); setErr('')
    try {
      const jobId = jobFilter ? Number(jobFilter) : undefined
      const [a, j] = await Promise.all([
        applicationsApi.list(token, {
          q: debouncedQ || undefined,
          jobId: Number.isFinite(jobId) ? jobId : undefined,
          status: statusFilter || undefined,
          sourceType: sourceFilter.trim() || undefined,
        }),
        jobsApi.list(token),
      ])
      setApps(a)
      setJobs(j)
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }, [token, debouncedQ, jobFilter, statusFilter, sourceFilter])

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
      <div className="list-filters-bar" role="search" aria-label="Filter applications">
        <input
          type="search"
          className="list-filter-input"
          placeholder="Search name, email, cover letter, job…"
          value={filterQ}
          onChange={e => setFilterQ(e.target.value)}
          aria-label="Search applications"
        />
        <select
          className="list-filter-select"
          value={jobFilter}
          onChange={e => setJobFilter(e.target.value)}
          aria-label="Filter by job"
        >
          <option value="">All jobs</option>
          {jobs.map(j => (
            <option key={j.id} value={String(j.id)}>
              {j.title}
            </option>
          ))}
        </select>
        <select
          className="list-filter-select"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          aria-label="Pipeline status"
        >
          <option value="">All stages</option>
          <option value="applied">applied</option>
          <option value="screening">screening</option>
          <option value="interview">interview</option>
          <option value="offer">offer</option>
          <option value="hired">hired</option>
          <option value="rejected">rejected</option>
          <option value="withdrawn">withdrawn</option>
        </select>
        <input
          type="search"
          className="list-filter-input list-filter-input--narrow"
          placeholder="Source type"
          value={sourceFilter}
          onChange={e => setSourceFilter(e.target.value)}
          aria-label="Filter by source type"
        />
      </div>
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
        {!loading && !err && apps.length === 0 && <EmptyRow icon="applications" title="No applications yet" text="Applications from every job and channel will appear here." />}
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
  const [filterQ, setFilterQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(filterQ.trim()), 320)
    return () => clearTimeout(t)
  }, [filterQ])

  useEffect(() => {
    setLoading(true)
    setErr('')
    applicationsApi
      .list(token, { q: debouncedQ || undefined, status: statusFilter || undefined })
      .then(setApps)
      .catch((e: unknown) => setErr(e instanceof Error ? e.message : 'Failed'))
      .finally(() => setLoading(false))
  }, [token, debouncedQ, statusFilter])

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
      <div className="list-filters-bar" role="search" aria-label="Filter candidates">
        <input
          type="search"
          className="list-filter-input"
          placeholder="Search name, email, notes…"
          value={filterQ}
          onChange={e => setFilterQ(e.target.value)}
          aria-label="Search candidates"
        />
        <select
          className="list-filter-select"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          aria-label="Stage"
        >
          <option value="">All stages</option>
          <option value="applied">applied</option>
          <option value="screening">screening</option>
          <option value="interview">interview</option>
          <option value="offer">offer</option>
          <option value="hired">hired</option>
          <option value="rejected">rejected</option>
          <option value="withdrawn">withdrawn</option>
        </select>
      </div>
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
        {!loading && !err && apps.length === 0 && <EmptyRow icon="candidates" title="No candidates yet" text="Your talent pool grows as people apply or get referred." />}
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
  const navigate = useNavigate()
  const { accountId } = useParams<{ accountId: string }>()
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const [assignments, setAssignments] = useState<InterviewAssignmentRow[]>([])
  const [listMeta, setListMeta] = useState<{ total: number; page: number; total_pages: number; has_next: boolean; has_prev: boolean } | null>(null)
  const [listPage, setListPage] = useState(1)
  const [claimingId, setClaimingId] = useState<number | null>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [filterQ, setFilterQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
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

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(filterQ.trim()), 320)
    return () => clearTimeout(t)
  }, [filterQ])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [res, j] = await Promise.all([
        interviewsApi.myAssignments(token, {
          q: debouncedQ || undefined,
          include_open: true,
          page: listPage,
          per_page: 25,
        }),
        jobsApi.list(token),
      ])
      setAssignments(res.entries)
      setListMeta(res.meta)
      setJobs(j)
    } catch {
      setAssignments([])
      setListMeta(null)
    } finally {
      setLoading(false)
    }
  }, [token, debouncedQ, listPage])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    setListPage(1)
  }, [debouncedQ])

  const jobTitle = (row: InterviewAssignmentRow) =>
    row.job?.title ?? jobs.find(j => j.id === row.application?.job_id)?.title ?? `Job #${row.application?.job_id ?? '?'}`

  const claimSlot = async (row: InterviewAssignmentRow) => {
    setClaimingId(row.id)
    try {
      await interviewsApi.claim(token, row.id)
      toast.success('Interview claimed', 'This round is now assigned to you.')
      await load()
    } catch (e: unknown) {
      toast.error('Could not claim', e instanceof Error ? e.message : 'Error')
    } finally {
      setClaimingId(null)
    }
  }

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

      <ListHeader
        title="Interviews"
        count={listMeta?.total ?? assignments.length}
        {...(accountId
          ? {
              onAction: () => navigate(`/account/${accountId}/pipeline`),
              actionLabel: 'Schedule interviews' as const,
            }
          : {})}
      />
      <p className="interviews-lead">
        Rounds assigned to you, plus <strong>open slots</strong> (unclaimed) when a candidate reaches an interview stage in the pipeline.
        Claim a slot to assign it to yourself, then open the kit and submit a scorecard.
      </p>
      <div className="list-filters-bar" role="search" aria-label="Filter interview assignments">
        <input
          type="search"
          className="list-filter-input"
          placeholder="Search candidate, job, interview round…"
          value={filterQ}
          onChange={e => setFilterQ(e.target.value)}
          aria-label="Search interviews"
        />
      </div>
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
          <EmptyRow icon="interviews" title="No interviews yet" text="When candidates reach an interview stage, assignments appear here — claim an open slot or wait to be assigned." />
        )}
        {assignments.map(row => (
          <div key={row.id} className="list-row">
            <div className="list-col list-col-main">
              <div className="list-row-name">{row.interview_plan?.name ?? `Plan #${row.interview_plan_id}`}</div>
              <div className="list-row-sub">
                {row.application?.candidate_name || row.application?.candidate_email || 'Candidate'}
                {row.is_open_slot ? (
                  <span className="tag tag-orange" style={{ marginLeft: 8 }}>
                    Open slot
                  </span>
                ) : null}
              </div>
            </div>
            <div className="list-col list-row-sub">{row.application ? jobTitle(row) : '—'}</div>
            <div className="list-col">
              <span className={`tag ${STAGE_COLORS[row.status] ?? 'tag-blue'}`}>{row.status}</span>
            </div>
            <div className="list-col list-row-sub">
              {row.scheduled_at ? new Date(row.scheduled_at).toLocaleString() : '—'}
            </div>
            <div className="list-col list-col-actions">
              {row.is_open_slot ? (
                <button
                  type="button"
                  className="btn-row-action"
                  disabled={claimingId === row.id}
                  onClick={() => void claimSlot(row)}
                >
                  {claimingId === row.id ? 'Claiming…' : 'Claim'}
                </button>
              ) : (
                <button type="button" className="btn-row-action" onClick={() => openKit(row)}>
                  Open kit
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      {listMeta && listMeta.total_pages > 1 && (
        <div className="audit-log-pagination" style={{ marginTop: 16 }}>
          <button
            type="button"
            className="btn-primary btn-primary--inline"
            disabled={!listMeta.has_prev}
            onClick={() => setListPage(p => Math.max(1, p - 1))}
          >
            Previous
          </button>
          <span className="audit-log-page-indicator">
            Page {listMeta.page} of {listMeta.total_pages} ({listMeta.total} total)
          </span>
          <button
            type="button"
            className="btn-primary btn-primary--inline"
            disabled={!listMeta.has_next}
            onClick={() => setListPage(p => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </>
  )
}

export function TeamView() {
  return (
    <div className="panel team-empty">
      <EmptyState
        icon="team"
        size={112}
        title="Bring your hiring team together"
        text="Invite teammates to collaborate on your workspace. Manage roles and permissions from here."
      />
    </div>
  )
}

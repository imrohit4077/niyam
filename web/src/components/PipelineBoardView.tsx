import { useCallback, useEffect, useMemo, useRef, useState, useId } from 'react'
import { useNavigate, useOutletContext, useSearchParams } from 'react-router-dom'
import type { DashboardOutletContext } from '../layouts/DashboardOutletContext'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  closestCorners,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { jobsApi, type Job } from '../api/jobs'
import { pipelineStagesApi, type PipelineStage } from '../api/pipelineStages'
import { applicationsApi, type Application } from '../api/applications'
import { useToast } from '../contexts/ToastContext'

const DROP_UNASSIGNED = 'drop-unassigned'

function dragAppId(id: number) {
  return `drag-app-${id}`
}
function dropStageId(stageId: number) {
  return `drop-${stageId}`
}

/** Prefer pipeline columns under the pointer; fall back to rectangle overlap. */
const pipelineCollisionDetection: CollisionDetection = args => {
  const pointerHits = pointerWithin(args)
  if (pointerHits.length > 0) {
    const columns = pointerHits.filter(
      ({ id }) => id === DROP_UNASSIGNED || String(id).startsWith('drop-'),
    )
    if (columns.length > 0) return columns
    return pointerHits
  }
  return rectIntersection(args)
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
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

const STAGE_TAG: Record<string, string> = {
  screening: 'tag-orange',
  interview: 'tag-blue',
  offer: 'tag-green',
  hired: 'tag-green',
  applied: 'tag-blue',
  rejected: 'tag-red',
}

const STATUS_OPTIONS = ['all', 'applied', 'screening', 'interview', 'offer', 'hired', 'rejected', 'withdrawn'] as const

const PIPE_PARAM_JOB = 'job'

function pipelineDefaultJobStorageKey(accountId: string) {
  return `niyam.pipeline.defaultJob.v1.${accountId}`
}

function formatRelativeTime(iso: string): string {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return ''
  const diff = Date.now() - t
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'Just now'
  if (m < 60) return `${m} min ago`
  const h = Math.floor(m / 60)
  if (h < 48) return `${h} hour${h === 1 ? '' : 's'} ago`
  const d = Math.floor(h / 24)
  return `${d} day${d === 1 ? '' : 's'} ago`
}

function stageHealthScore(stageId: number, candidateCount: number): number {
  const base = 3.2 + (stageId % 5) * 0.35 + Math.min(4, candidateCount * 0.22)
  return Math.round(Math.min(9.9, Math.max(1, base)) * 10) / 10
}

function sparklinePoints(total: number, stages: number): string {
  if (stages < 1) return '0,20'
  const pts: string[] = []
  for (let i = 0; i <= 6; i++) {
    const x = (i / 6) * 100
    const wave = Math.sin(i * 0.9 + total * 0.05) * 8
    const y = 22 + wave + (i % 3) * 2
    pts.push(`${x},${Math.min(36, Math.max(4, y))}`)
  }
  return pts.join(' ')
}
const PIPE_PARAM_Q = 'q'
const PIPE_PARAM_STATUS = 'status'
const PIPE_PARAM_SOURCE = 'source'
const PIPE_PARAM_COL = 'col'
const PIPE_PARAM_FIT = 'fit'
const PIPE_PARAM_TAG = 'tag'

const FIT_OPTIONS = ['all', 'scored', 'unscored'] as const

function candidateInitials(name: string | null, email: string): string {
  const n = (name ?? '').trim()
  if (n) {
    const parts = n.split(/\s+/).filter(Boolean)
    const a = parts[0]?.[0] ?? ''
    const b = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : ''
    const pair = (a + b).toUpperCase()
    if (pair) return pair
  }
  const e = email.trim()
  return e ? e[0].toUpperCase() : '?'
}

function parsePipelineJobId(searchParams: URLSearchParams): number | '' {
  const raw = searchParams.get(PIPE_PARAM_JOB)
  if (!raw || !/^\d+$/.test(raw)) return ''
  return Number(raw)
}

function pipelineStatusFromUrl(searchParams: URLSearchParams): string {
  const s = searchParams.get(PIPE_PARAM_STATUS)
  if (s && (STATUS_OPTIONS as readonly string[]).includes(s)) return s
  return 'all'
}

function pipelineSourceFromUrl(searchParams: URLSearchParams, allowed: string[]): string {
  const s = searchParams.get(PIPE_PARAM_SOURCE)
  if (s && allowed.includes(s)) return s
  return 'all'
}

function pipelineColumnFromUrl(searchParams: URLSearchParams, stageIds: Set<number>): string {
  const c = searchParams.get(PIPE_PARAM_COL)
  if (c === 'unassigned') return 'unassigned'
  if (c && /^\d+$/.test(c)) {
    const n = Number(c)
    if (stageIds.has(n)) return String(n)
  }
  return 'all'
}

function pipelineFitFromUrl(searchParams: URLSearchParams): string {
  const f = searchParams.get(PIPE_PARAM_FIT)
  if (f && (FIT_OPTIONS as readonly string[]).includes(f)) return f
  return 'all'
}

function pipelineTagFromUrl(searchParams: URLSearchParams, allowed: string[]): string {
  const t = searchParams.get(PIPE_PARAM_TAG)
  if (t && allowed.includes(t)) return t
  return 'all'
}

function KanbanCard({ app, accountId }: { app: Application; accountId: string }) {
  const navigate = useNavigate()
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: dragAppId(app.id),
    data: { type: 'application', app },
  })
  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.25 : 1,
    zIndex: isDragging ? 0 : 1,
  }
  const go = () => navigate(`/account/${accountId}/job-applications/${app.id}`)
  const chips = [...(app.labels ?? []).map(l => l.title), ...(app.tags ?? [])].filter(Boolean).slice(0, 5)
  const rawSummary =
    (app.candidate_location && app.candidate_location.trim()) ||
    (app.cover_letter && app.cover_letter.replace(/\s+/g, ' ').trim()) ||
    ''
  const summary = rawSummary.length > 96 ? `${rawSummary.slice(0, 96)}…` : rawSummary
  const scoreNum = app.score != null && !Number.isNaN(Number(app.score)) ? Number(app.score) : null

  return (
    <div ref={setNodeRef} style={style} className="kanban-card kanban-card--rich" {...attributes}>
      <div className="kanban-card-top">
        <button
          type="button"
          className="kanban-drag-handle"
          {...listeners}
          aria-label={`Drag to move ${app.candidate_name || app.candidate_email}`}
          title="Drag to move"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M8 6a2 2 0 11-4 0 2 2 0 014 0zm0 6a2 2 0 11-4 0 2 2 0 014 0zm0 6a2 2 0 11-4 0 2 2 0 014 0zm6-12a2 2 0 11-4 0 2 2 0 014 0zm0 6a2 2 0 11-4 0 2 2 0 014 0zm0 6a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </button>
        <div
          className="kanban-card-main"
          role="link"
          tabIndex={0}
          aria-label={`Open ${app.candidate_name || app.candidate_email}`}
          onClick={go}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              go()
            }
          }}
        >
          <div className="kanban-card-avatar" aria-hidden>
            {candidateInitials(app.candidate_name, app.candidate_email)}
          </div>
          <div className="kanban-card-copy">
            <div className="kanban-card-name">{app.candidate_name || '—'}</div>
            <div className="kanban-card-email">{app.candidate_email}</div>
            {summary && <div className="kanban-card-summary">{summary}</div>}
            {chips.length > 0 && (
              <div className="kanban-card-skills" aria-label="Tags and labels">
                {chips.map(c => (
                  <span key={c} className="kanban-skill-pill">
                    {c}
                  </span>
                ))}
              </div>
            )}
            {scoreNum != null && (
              <div className="kanban-card-fit">
                <div className="kanban-card-fit-head">
                  <span>Fit score</span>
                  <span>
                    {Math.round(scoreNum)}
                    <span className="kanban-card-fit-target"> / 100</span>
                  </span>
                </div>
                <div className="kanban-card-fit-bar">
                  <div className="kanban-card-fit-fill" style={{ width: `${Math.min(100, scoreNum)}%` }} />
                </div>
              </div>
            )}
            <div className="kanban-card-meta">
              <span className={`tag kanban-meta-chip ${STAGE_TAG[app.status] ?? 'tag-gray'}`}>{app.status}</span>
              {app.source_type && <span className="kanban-meta-chip kanban-meta-chip--source">{app.source_type}</span>}
            </div>
            <div className="kanban-card-links">
              {app.linkedin_url && (
                <a
                  href={app.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="kanban-card-link"
                  onClick={e => e.stopPropagation()}
                >
                  LinkedIn
                </a>
              )}
              <span className="kanban-card-link-muted">Application #{app.id}</span>
            </div>
          </div>
          <span className="kanban-card-go" aria-hidden>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </span>
        </div>
      </div>
      <div className="kanban-card-actions-row">
        <a className="kanban-card-action" href={`mailto:${app.candidate_email}`} onClick={e => e.stopPropagation()}>
          Email
        </a>
        <button type="button" className="kanban-card-action-btn" onClick={e => { e.stopPropagation(); go() }}>
          View profile
        </button>
      </div>
    </div>
  )
}

function KanbanColumn({
  id,
  title,
  subtitle,
  appsAll,
  appsVisible,
  emptyHint,
  accentClass,
  accountId,
  healthScore,
}: {
  id: string
  title: string
  subtitle?: string
  appsAll: Application[]
  appsVisible: Application[]
  emptyHint: string
  accentClass?: string
  accountId: string
  healthScore?: number
}) {
  const { setNodeRef, isOver } = useDroppable({ id, data: { type: 'column' } })
  const filteredOut = appsAll.length - appsVisible.length
  const showSplit = filteredOut > 0

  const healthPct = healthScore != null ? Math.min(100, Math.max(6, healthScore * 10)) : 0

  return (
    <div className={`kanban-column ${accentClass ?? ''} ${isOver ? 'kanban-column-over' : ''}`}>
      <header className="kanban-column-head">
        <div className="kanban-column-head-top">
          <div className="kanban-column-title-wrap">
            <div className="kanban-column-title">{title}</div>
            {subtitle && <div className="kanban-column-sub">{subtitle}</div>}
          </div>
          <span className="kanban-column-count" title={showSplit ? `${appsVisible.length} visible, ${appsAll.length} in column` : undefined}>
            {showSplit ? (
              <>
                <strong>{appsVisible.length}</strong>
                <span className="kanban-column-count-sep">/</span>
                <span className="kanban-column-count-total">{appsAll.length}</span>
              </>
            ) : (
              appsAll.length
            )}
          </span>
        </div>
        {healthScore != null && (
          <div className="kanban-column-health" aria-label={`Stage health score ${healthScore}`}>
            <div className="kanban-column-health-row">
              <span className="kanban-column-health-label">Health score</span>
              <span className="kanban-column-health-value">{healthScore.toFixed(1)}</span>
            </div>
            <div className="kanban-column-health-track">
              <div className="kanban-column-health-fill" style={{ width: `${healthPct}%` }} />
            </div>
          </div>
        )}
      </header>
      <div ref={setNodeRef} className="kanban-column-drop">
        <div className="kanban-column-scroll">
          {appsVisible.length === 0 && (
            <div className="kanban-empty">
              {appsAll.length > 0 ? (
                <>
                  <span className="kanban-empty-title">No matches</span>
                  <span className="kanban-empty-sub">Adjust search or filters — {appsAll.length} candidate{appsAll.length === 1 ? '' : 's'} in this column.</span>
                </>
              ) : (
                <>
                  <span className="kanban-empty-title">Drop candidates here</span>
                  <span className="kanban-empty-sub">{emptyHint} — drag to assign status.</span>
                </>
              )}
            </div>
          )}
          {appsVisible.map(a => (
            <KanbanCard key={a.id} app={a} accountId={accountId} />
          ))}
        </div>
      </div>
    </div>
  )
}

function SortableStageRow({
  stage,
  onDelete,
}: {
  stage: PipelineStage
  onDelete: (s: PipelineStage) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: stage.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  }
  return (
    <div ref={setNodeRef} style={style} className="pipeline-sort-row">
      <button type="button" className="pipeline-sort-handle" {...attributes} {...listeners} aria-label="Reorder">
        ⋮⋮
      </button>
      <div className="pipeline-sort-info">
        <span className="pipeline-sort-name">{stage.name}</span>
        {stage.stage_type && <span className="tag tag-gray">{stage.stage_type}</span>}
      </div>
      <button type="button" className="btn-row-action btn-row-danger" onClick={() => onDelete(stage)}>
        Remove
      </button>
    </div>
  )
}

function StageManageModal({
  token,
  jobId,
  stages,
  onClose,
  onRefresh,
}: {
  token: string
  jobId: number
  stages: PipelineStage[]
  onClose: () => void
  onRefresh: () => void
}) {
  const toast = useToast()
  const [local, setLocal] = useState<PipelineStage[]>(() => [...stages].sort((a, b) => a.position - b.position))
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setLocal([...stages].sort((a, b) => a.position - b.position))
  }, [stages])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const reorderDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = local.findIndex(s => s.id === active.id)
    const newIndex = local.findIndex(s => s.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    setLocal(arrayMove(local, oldIndex, newIndex))
  }

  const saveOrder = async () => {
    setSaving(true)
    try {
      const orderedIds = local.map(s => s.id)
      await pipelineStagesApi.reorder(token, jobId, orderedIds)
      toast.success('Order saved', 'Pipeline columns updated.')
      onRefresh()
    } catch (e: unknown) {
      toast.error('Reorder failed', e instanceof Error ? e.message : 'Failed')
    } finally {
      setSaving(false)
    }
  }

  const addStage = async () => {
    const name = newName.trim()
    if (!name) return
    setSaving(true)
    try {
      await pipelineStagesApi.create(token, jobId, {
        name,
        stage_type: newType || null,
      })
      toast.success('Stage added', `"${name}" is on the board.`)
      setNewName('')
      setNewType('')
      onRefresh()
    } catch (e: unknown) {
      toast.error('Add failed', e instanceof Error ? e.message : 'Failed')
    } finally {
      setSaving(false)
    }
  }

  const removeStage = async (s: PipelineStage) => {
    if (!confirm(`Remove stage “${s.name}”? Candidates in this column become unassigned.`)) return
    try {
      await pipelineStagesApi.delete(token, s.id)
      toast.success('Stage removed', s.name)
      onRefresh()
    } catch (e: unknown) {
      toast.error('Remove failed', e instanceof Error ? e.message : 'Failed')
    }
  }

  return (
    <Modal title="Manage pipeline" onClose={onClose}>
      <p className="form-hint">Drag rows to reorder columns. Changes apply after you save order.</p>
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={reorderDragEnd}>
        <SortableContext items={local.map(s => s.id)} strategy={verticalListSortingStrategy}>
          <div className="pipeline-sort-list">
            {local.map(s => (
              <SortableStageRow key={s.id} stage={s} onDelete={removeStage} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <button type="button" className="btn-primary" style={{ marginTop: 12 }} onClick={saveOrder} disabled={saving}>
        Save column order
      </button>
      <hr className="modal-divider" />
      <FormField label="New stage name">
        <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Technical interview" />
      </FormField>
      <FormField label="Stage type (maps to application status when moving cards)">
        <select value={newType} onChange={e => setNewType(e.target.value)}>
          <option value="">— Optional —</option>
          <option value="applied">applied</option>
          <option value="screening">screening</option>
          <option value="interview">interview</option>
          <option value="offer">offer</option>
          <option value="hired">hired</option>
        </select>
      </FormField>
      <button type="button" className="btn-action" onClick={addStage} disabled={saving || !newName.trim()}>
        Add stage
      </button>
    </Modal>
  )
}

function useRecentPipelineActivity(apps: Application[], stages: PipelineStage[], limit: number) {
  return useMemo(() => {
    type Row = { id: string; at: string; title: string; sub: string }
    const out: Row[] = []
    const stageLabel = (id: number | null | undefined) => {
      if (id == null) return 'Unassigned'
      return stages.find(s => s.id === id)?.name ?? 'Pipeline'
    }
    for (const a of apps) {
      const who = a.candidate_name || a.candidate_email
      let idx = 0
      for (const h of a.stage_history ?? []) {
        idx += 1
        out.push({
          id: `${a.id}-${h.changed_at}-${h.stage}-${idx}`,
          at: h.changed_at,
          title: who,
          sub: `Stage: ${h.stage}${h.pipeline_stage_id != null ? ` · ${stageLabel(h.pipeline_stage_id)}` : ''}`,
        })
      }
    }
    out.sort((x, y) => new Date(y.at).getTime() - new Date(x.at).getTime())
    return out.slice(0, limit)
  }, [apps, stages, limit])
}

function useApplicationFilters(
  apps: Application[],
  stages: PipelineStage[],
  status: string,
  source: string,
  columnKey: string,
  fit: string,
  tag: string,
) {
  return useMemo(() => {
    const stageIds = new Set(stages.map(s => s.id))
    return apps.filter(a => {
      if (status !== 'all' && a.status !== status) return false
      if (source !== 'all' && a.source_type !== source) return false

      if (columnKey === 'unassigned') {
        const sid = a.pipeline_stage_id
        if (sid != null && stageIds.has(sid)) return false
      } else if (columnKey !== 'all') {
        const want = Number(columnKey)
        if (!Number.isFinite(want) || a.pipeline_stage_id !== want) return false
      }

      if (fit === 'scored' && (a.score == null || Number.isNaN(Number(a.score)))) return false
      if (fit === 'unscored' && a.score != null && !Number.isNaN(Number(a.score))) return false

      if (tag !== 'all' && !(a.tags ?? []).includes(tag)) return false

      return true
    })
  }, [apps, stages, status, source, columnKey, fit, tag])
}

export default function PipelineBoardView() {
  const { token, accountId } = useOutletContext<DashboardOutletContext>()
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const [jobs, setJobs] = useState<Job[]>([])
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [apps, setApps] = useState<Application[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [activeApp, setActiveApp] = useState<Application | null>(null)
  const [manageOpen, setManageOpen] = useState(false)
  const defaultJobHydrated = useRef(false)
  const sparkGradId = useId().replace(/:/g, '')

  const patchPipelineQuery = useCallback(
    (patch: Record<string, string | null | undefined>) => {
      setSearchParams(
        prev => {
          const next = new URLSearchParams(prev)
          for (const [k, v] of Object.entries(patch)) {
            if (v === undefined) continue
            if (v === null || v === '') {
              next.delete(k)
              continue
            }
            if (
              (k === PIPE_PARAM_STATUS ||
                k === PIPE_PARAM_SOURCE ||
                k === PIPE_PARAM_COL ||
                k === PIPE_PARAM_FIT ||
                k === PIPE_PARAM_TAG) &&
              v === 'all'
            ) {
              next.delete(k)
              continue
            }
            next.set(k, v)
          }
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  useEffect(() => {
    defaultJobHydrated.current = false
  }, [accountId])

  useEffect(() => {
    if (jobs.length === 0 || defaultJobHydrated.current) return
    const raw = searchParams.get(PIPE_PARAM_JOB)
    if (raw && /^\d+$/.test(raw)) {
      defaultJobHydrated.current = true
      return
    }
    const stored = localStorage.getItem(pipelineDefaultJobStorageKey(accountId))
    if (stored && /^\d+$/.test(stored)) {
      const id = Number(stored)
      if (jobs.some(j => j.id === id)) {
        patchPipelineQuery({ [PIPE_PARAM_JOB]: String(id) })
      }
    }
    defaultJobHydrated.current = true
  }, [jobs, searchParams, accountId, patchPipelineQuery])

  const jobId = parsePipelineJobId(searchParams)
  const search = searchParams.get(PIPE_PARAM_Q) ?? ''
  const [debouncedSearchQ, setDebouncedSearchQ] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearchQ(search.trim()), 320)
    return () => clearTimeout(t)
  }, [search])
  const sourceTypesList = useMemo(() => {
    const set = new Set<string>()
    for (const a of apps) set.add(a.source_type || 'direct')
    return ['all', ...Array.from(set).sort()]
  }, [apps])
  const statusFilter = pipelineStatusFromUrl(searchParams)
  const sourceFilter = pipelineSourceFromUrl(searchParams, sourceTypesList)
  const stageIdsSet = useMemo(() => new Set(stages.map(s => s.id)), [stages])
  const tagsList = useMemo(() => {
    const set = new Set<string>()
    for (const a of apps) {
      for (const t of a.tags ?? []) {
        const x = t.trim()
        if (x) set.add(x)
      }
    }
    return ['all', ...Array.from(set).sort((a, b) => a.localeCompare(b))]
  }, [apps])
  const columnFilter = pipelineColumnFromUrl(searchParams, stageIdsSet)
  const fitFilter = pipelineFitFromUrl(searchParams)
  const tagFilter = pipelineTagFromUrl(searchParams, tagsList)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  )

  const loadJobData = useCallback(
    async (jid: number) => {
      setLoading(true)
      setErr('')
      try {
        const [st, ap] = await Promise.all([
          pipelineStagesApi.listByJob(token, jid),
          applicationsApi.list(token, {
            jobId: jid,
            q: debouncedSearchQ || undefined,
          }),
        ])
        setStages(st.sort((a, b) => a.position - b.position))
        setApps(ap)
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : 'Failed to load pipeline')
        setStages([])
        setApps([])
      } finally {
        setLoading(false)
      }
    },
    [token, debouncedSearchQ],
  )

  useEffect(() => {
    jobsApi
      .list(token)
      .then(setJobs)
      .catch(() => {})
  }, [token])

  useEffect(() => {
    if (typeof jobId !== 'number') {
      setStages([])
      setApps([])
      return
    }
    loadJobData(jobId)
  }, [jobId, loadJobData])

  useEffect(() => {
    if (jobs.length === 0) return
    if (typeof jobId !== 'number') return
    if (!jobs.some(j => j.id === jobId)) {
      patchPipelineQuery({ [PIPE_PARAM_JOB]: null })
    }
  }, [jobs, jobId, patchPipelineQuery])

  const filteredApps = useApplicationFilters(
    apps,
    stages,
    statusFilter,
    sourceFilter,
    columnFilter,
    fitFilter,
    tagFilter,
  )
  const filtersActive =
    search.trim() !== '' ||
    statusFilter !== 'all' ||
    sourceFilter !== 'all' ||
    columnFilter !== 'all' ||
    fitFilter !== 'all' ||
    tagFilter !== 'all'

  const byColumn = useMemo(() => {
    const map = new Map<number | 'unassigned', Application[]>()
    map.set('unassigned', [])
    for (const s of stages) {
      map.set(s.id, [])
    }
    for (const a of apps) {
      const sid = a.pipeline_stage_id
      if (sid == null || !map.has(sid)) {
        map.get('unassigned')!.push(a)
      } else {
        map.get(sid)!.push(a)
      }
    }
    return map
  }, [apps, stages])

  const visibleByColumn = useMemo(() => {
    const ids = new Set(filteredApps.map(a => a.id))
    const next = new Map<number | 'unassigned', Application[]>()
    next.set('unassigned', [])
    for (const s of stages) next.set(s.id, [])
    for (const a of apps) {
      if (!ids.has(a.id)) continue
      const sid = a.pipeline_stage_id
      if (sid == null || !next.has(sid)) {
        next.get('unassigned')!.push(a)
      } else {
        next.get(sid)!.push(a)
      }
    }
    return next
  }, [apps, filteredApps, stages])

  const recentActivity = useRecentPipelineActivity(apps, stages, 18)
  const sourceMix = useMemo(() => {
    const m = new Map<string, number>()
    for (const a of apps) {
      const k = (a.source_type || 'direct').replace(/_/g, ' ')
      m.set(k, (m.get(k) ?? 0) + 1)
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
  }, [apps])

  const stageLoadBars = useMemo(() => {
    const max = Math.max(1, ...stages.map(s => (byColumn.get(s.id) ?? []).length))
    return stages.map(s => ({
      id: s.id,
      name: s.name,
      pct: Math.round(((byColumn.get(s.id) ?? []).length / max) * 100),
      n: (byColumn.get(s.id) ?? []).length,
    }))
  }, [stages, byColumn])

  const resolvePipelineStageId = (overId: string | number | undefined): number | null | undefined => {
    if (overId == null) return undefined
    const s = String(overId)
    if (s === DROP_UNASSIGNED) return null
    if (s.startsWith('drop-')) {
      const n = Number(s.slice('drop-'.length))
      if (!Number.isNaN(n)) return n
      return undefined
    }
    if (s.startsWith('drag-app-')) {
      const aid = Number(s.slice('drag-app-'.length))
      const other = apps.find(a => a.id === aid)
      if (!other) return undefined
      return other.pipeline_stage_id ?? null
    }
    return undefined
  }

  const handleDragStart = (e: DragStartEvent) => {
    const id = String(e.active.id)
    if (!id.startsWith('drag-app-')) return
    const aid = Number(id.slice('drag-app-'.length))
    setActiveApp(apps.find(a => a.id === aid) ?? null)
  }

  const handleDragEnd = async (e: DragEndEvent) => {
    const dragged = activeApp
    setActiveApp(null)
    const { active, over } = e
    if (!over || typeof jobId !== 'number') return
    const idStr = String(active.id)
    if (!idStr.startsWith('drag-app-')) return
    const appId = Number(idStr.slice('drag-app-'.length))
    const nextStageId = resolvePipelineStageId(over.id)
    if (nextStageId === undefined) return

    const app = apps.find(a => a.id === appId)
    if (!app) return
    const currentStage = app.pipeline_stage_id ?? null
    if (currentStage === nextStageId) return

    const prev = apps
    setApps(list =>
      list.map(a =>
        a.id === appId ? { ...a, pipeline_stage_id: nextStageId } : a,
      ),
    )

    try {
      await applicationsApi.updateStage(token, appId, { pipeline_stage_id: nextStageId })
      toast.success('Candidate moved', dragged?.candidate_name || dragged?.candidate_email || 'Updated')
    } catch (e: unknown) {
      setApps(prev)
      toast.error('Move failed', e instanceof Error ? e.message : 'Could not update stage')
    }
  }

  const selectedJob = typeof jobId === 'number' ? jobs.find(j => j.id === jobId) : undefined

  const clearFilters = () => {
    patchPipelineQuery({
      [PIPE_PARAM_Q]: null,
      [PIPE_PARAM_STATUS]: null,
      [PIPE_PARAM_SOURCE]: null,
      [PIPE_PARAM_COL]: null,
      [PIPE_PARAM_FIT]: null,
      [PIPE_PARAM_TAG]: null,
    })
  }

  const accentForStage = (i: number) => {
    const accents = ['kanban-accent-a', 'kanban-accent-b', 'kanban-accent-c', 'kanban-accent-d', 'kanban-accent-e']
    return accents[i % accents.length]
  }

  return (
    <>
      {manageOpen && typeof jobId === 'number' && (
        <StageManageModal
          token={token}
          jobId={jobId}
          stages={stages}
          onClose={() => setManageOpen(false)}
          onRefresh={() => loadJobData(jobId)}
        />
      )}

      <div className={`pipeline-shell pipeline-shell--dashboard ${typeof jobId === 'number' ? 'pipeline-shell--has-job' : ''}`}>
        <header className="pipeline-head pipeline-head--dashboard">
          <div className="pipeline-head-left">
            <span className="pipeline-head-kicker">Recruiting</span>
            <div className="pipeline-head-title-row">
              <h2 className="pipeline-head-title">Hiring pipeline</h2>
              {selectedJob && selectedJob.status === 'open' && (
                <span className="pipeline-live-pill" title="Requisition is open to applicants">
                  <span className="pipeline-live-dot" aria-hidden />
                  Active
                </span>
              )}
            </div>
            <p className="pipeline-head-lede">
              Move candidates between stages with the grip handle. Filter the board to focus on a cohort — URL syncs for sharing.
            </p>
          </div>
          {typeof jobId === 'number' && selectedJob && (
            <div className="pipeline-head-insights" aria-label="Pipeline performance overview">
              <div className="pipeline-insight-card pipeline-insight-card--spark">
                <span className="pipeline-insight-eyebrow">Active pipeline</span>
                <div className="pipeline-insight-job-title">{selectedJob.title}</div>
                <svg className="pipeline-sparkline" viewBox="0 0 100 36" preserveAspectRatio="none" aria-hidden>
                  <defs>
                    <linearGradient id={sparkGradId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="currentColor" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="currentColor" stopOpacity="0.02" />
                    </linearGradient>
                  </defs>
                  <polygon
                    fill={`url(#${sparkGradId})`}
                    points={`0,36 ${sparklinePoints(apps.length, stages.length)} 100,36`}
                  />
                  <polyline
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    points={sparklinePoints(apps.length, stages.length)}
                  />
                </svg>
              </div>
              <ul className="pipeline-insight-metrics" aria-label="Quick stats">
                <li>
                  <strong>{apps.length}</strong>
                  <span>In job</span>
                </li>
                <li>
                  <strong>{filteredApps.length}</strong>
                  <span>Visible</span>
                </li>
                <li>
                  <strong>{stages.length}</strong>
                  <span>Stages</span>
                </li>
              </ul>
              <div className="pipeline-insight-card pipeline-insight-card--bars">
                <span className="pipeline-insight-eyebrow">Load by stage</span>
                <div className="pipeline-mini-bars">
                  {stageLoadBars.map(b => (
                    <div key={b.id} className="pipeline-mini-bar-row" title={`${b.name}: ${b.n}`}>
                      <span className="pipeline-mini-bar-name">{b.name}</span>
                      <div className="pipeline-mini-bar-track">
                        <div className="pipeline-mini-bar-fill" style={{ width: `${b.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="pipeline-insight-card pipeline-insight-card--sources">
                <span className="pipeline-insight-eyebrow">Sourcing mix</span>
                <table className="pipeline-source-table">
                  <tbody>
                    {sourceMix.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="pipeline-source-empty">
                          No applications yet
                        </td>
                      </tr>
                    ) : (
                      sourceMix.map(([label, count]) => (
                        <tr key={label}>
                          <td>{label}</td>
                          <td className="pipeline-source-count">{count}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </header>

        <div className={`pipeline-body-split ${typeof jobId === 'number' ? 'pipeline-body-split--rail' : ''}`}>
          <div className="pipeline-body-main">
            <div className="pipeline-panel pipeline-panel--dashboard">
              <div className="pipeline-panel-row pipeline-panel-row--job pipeline-position-row">
                <div className="pipeline-position-card pipeline-job-select pipeline-job-select-grow">
                  <label htmlFor="pipeline-job">Position</label>
                  <div className="pipeline-position-select-wrap">
                    <select
                      id="pipeline-job"
                      className="pipeline-select pipeline-select--position"
                      value={typeof jobId === 'number' ? String(jobId) : ''}
                      onChange={e => {
                        const v = e.target.value
                        patchPipelineQuery({ [PIPE_PARAM_JOB]: v || null })
                        if (v) {
                          try {
                            localStorage.setItem(pipelineDefaultJobStorageKey(accountId), v)
                          } catch {
                            /* ignore quota */
                          }
                        }
                      }}
                    >
                      <option value="">Select a job…</option>
                      {jobs.map(j => (
                        <option key={j.id} value={j.id}>
                          {j.title}
                          {j.department ? ` · ${j.department}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  {selectedJob && selectedJob.status === 'open' && (
                    <span className="pipeline-req-badge">Active requisition</span>
                  )}
                  <p className="pipeline-default-hint">
                    Your choice is saved as the default for this workspace when you open Pipeline.
                  </p>
                </div>
                <div className="pipeline-panel-actions">
                  {typeof jobId === 'number' && (
                    <button type="button" className="btn-pipeline-primary" onClick={() => setManageOpen(true)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                      </svg>
                      Edit stages
                    </button>
                  )}
                  {typeof jobId === 'number' && !loading && (
                    <button type="button" className="btn-pipeline-outline" onClick={() => loadJobData(jobId)} disabled={loading}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                        <path d="M21 12a9 9 0 11-2.64-6.36" strokeLinecap="round" />
                        <path d="M21 3v7h-7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Refresh
                    </button>
                  )}
                </div>
              </div>

          {typeof jobId === 'number' && (
            <div className="pipeline-filter-sheet">
              <div className="pipeline-filter-sheet-head">
                <div className="pipeline-filter-head-left">
                  <span className="pipeline-filter-sheet-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                      <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Filters
                  </span>
                  <div className="pipeline-filter-pseudo-tabs" aria-hidden>
                    <span className="pipeline-filter-pseudo-tabs__item pipeline-filter-pseudo-tabs__item--on">Filters</span>
                    <span className="pipeline-filter-pseudo-tabs__item">Search</span>
                    <span className="pipeline-filter-pseudo-tabs__item">Segments</span>
                  </div>
                </div>
                {filtersActive && (
                  <button type="button" className="pipeline-filter-reset" onClick={clearFilters}>
                    Reset all
                  </button>
                )}
              </div>
              <div className="pipeline-filter-grid">
                <div className="pipeline-filter-cell pipeline-filter-cell--search">
                  <label htmlFor="pipe-q" className="pipeline-filter-label">
                    Search
                  </label>
                  <div className="pipeline-search">
                    <svg className="pipeline-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                      <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                    </svg>
                    <input
                      id="pipe-q"
                      type="search"
                      className="pipeline-search-input"
                      placeholder="Name, email, or tag…"
                      value={search}
                      onChange={e => patchPipelineQuery({ [PIPE_PARAM_Q]: e.target.value || null })}
                      aria-label="Search candidates"
                    />
                    {search && (
                      <button
                        type="button"
                        className="pipeline-search-clear"
                        onClick={() => patchPipelineQuery({ [PIPE_PARAM_Q]: null })}
                        aria-label="Clear search"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
                <div className="pipeline-filter-cell pipeline-filter-cell--col">
                  <label htmlFor="pipe-col" className="pipeline-filter-label">
                    Column
                  </label>
                  <select
                    id="pipe-col"
                    className="pipeline-select pipeline-select--filter"
                    value={columnFilter}
                    onChange={e =>
                      patchPipelineQuery({
                        [PIPE_PARAM_COL]: e.target.value === 'all' ? null : e.target.value,
                      })
                    }
                  >
                    <option value="all">All columns</option>
                    <option value="unassigned">Unassigned only</option>
                    {stages.map(s => (
                      <option key={s.id} value={String(s.id)}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="pipeline-filter-cell pipeline-filter-cell--status">
                  <label htmlFor="pipe-status" className="pipeline-filter-label">
                    Status
                  </label>
                  <select
                    id="pipe-status"
                    className="pipeline-select pipeline-select--filter"
                    value={statusFilter}
                    onChange={e =>
                      patchPipelineQuery({
                        [PIPE_PARAM_STATUS]: e.target.value === 'all' ? null : e.target.value,
                      })
                    }
                  >
                    {STATUS_OPTIONS.map(s => (
                      <option key={s} value={s}>
                        {s === 'all' ? 'All statuses' : s}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="pipeline-filter-cell pipeline-filter-cell--source">
                  <label htmlFor="pipe-source" className="pipeline-filter-label">
                    Source
                  </label>
                  <select
                    id="pipe-source"
                    className="pipeline-select pipeline-select--filter"
                    value={sourceFilter}
                    onChange={e =>
                      patchPipelineQuery({
                        [PIPE_PARAM_SOURCE]: e.target.value === 'all' ? null : e.target.value,
                      })
                    }
                  >
                    {sourceTypesList.map(s => (
                      <option key={s} value={s}>
                        {s === 'all' ? 'All sources' : s}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="pipeline-filter-cell pipeline-filter-cell--fit">
                  <label htmlFor="pipe-fit" className="pipeline-filter-label">
                    Fit score
                  </label>
                  <select
                    id="pipe-fit"
                    className="pipeline-select pipeline-select--filter"
                    value={fitFilter}
                    onChange={e =>
                      patchPipelineQuery({
                        [PIPE_PARAM_FIT]: e.target.value === 'all' ? null : e.target.value,
                      })
                    }
                  >
                    <option value="all">Any</option>
                    <option value="scored">Has score</option>
                    <option value="unscored">No score yet</option>
                  </select>
                </div>
                {tagsList.length > 1 && (
                  <div className="pipeline-filter-cell pipeline-filter-cell--tag">
                    <label htmlFor="pipe-tag" className="pipeline-filter-label">
                      Tag
                    </label>
                    <select
                      id="pipe-tag"
                      className="pipeline-select pipeline-select--filter"
                      value={tagFilter}
                      onChange={e =>
                        patchPipelineQuery({
                          [PIPE_PARAM_TAG]: e.target.value === 'all' ? null : e.target.value,
                        })
                      }
                    >
                      {tagsList.map(t => (
                        <option key={t} value={t}>
                          {t === 'all' ? 'All tags' : t}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}

          {filtersActive && typeof jobId === 'number' && (
            <div className="pipeline-filter-chips" aria-label="Active filters">
              {search.trim() && (
                <button type="button" className="pipeline-chip" onClick={() => patchPipelineQuery({ [PIPE_PARAM_Q]: null })}>
                  Search: “{search.trim().slice(0, 28)}
                  {search.trim().length > 28 ? '…' : ''}”<span aria-hidden> ×</span>
                </button>
              )}
              {columnFilter !== 'all' && (
                <button
                  type="button"
                  className="pipeline-chip"
                  onClick={() => patchPipelineQuery({ [PIPE_PARAM_COL]: null })}
                >
                  Column:{' '}
                  {columnFilter === 'unassigned' ? 'Unassigned' : stages.find(s => String(s.id) === columnFilter)?.name ?? columnFilter}
                  <span aria-hidden> ×</span>
                </button>
              )}
              {statusFilter !== 'all' && (
                <button type="button" className="pipeline-chip" onClick={() => patchPipelineQuery({ [PIPE_PARAM_STATUS]: null })}>
                  Status: {statusFilter}
                  <span aria-hidden> ×</span>
                </button>
              )}
              {sourceFilter !== 'all' && (
                <button type="button" className="pipeline-chip" onClick={() => patchPipelineQuery({ [PIPE_PARAM_SOURCE]: null })}>
                  Source: {sourceFilter}
                  <span aria-hidden> ×</span>
                </button>
              )}
              {fitFilter !== 'all' && (
                <button type="button" className="pipeline-chip" onClick={() => patchPipelineQuery({ [PIPE_PARAM_FIT]: null })}>
                  Fit: {fitFilter === 'scored' ? 'Has score' : 'No score'}
                  <span aria-hidden> ×</span>
                </button>
              )}
              {tagFilter !== 'all' && (
                <button type="button" className="pipeline-chip" onClick={() => patchPipelineQuery({ [PIPE_PARAM_TAG]: null })}>
                  Tag: {tagFilter}
                  <span aria-hidden> ×</span>
                </button>
              )}
            </div>
          )}

          {selectedJob && (
            <div className="pipeline-context">
              <span className="pipeline-context-title">{selectedJob.title}</span>
              {selectedJob.location && <span className="pipeline-context-dot">{selectedJob.location}</span>}
              <span className="pipeline-context-dot">
                {stages.length} {stages.length === 1 ? 'stage' : 'stages'}
              </span>
              <span className="pipeline-context-dot">
                {apps.length} {apps.length === 1 ? 'application' : 'applications'}
              </span>
              {filtersActive && (
                <span className="pipeline-context-highlight">
                  Showing {filteredApps.length} of {apps.length}
                </span>
              )}
            </div>
          )}
            </div>

      {typeof jobId !== 'number' && (
        <div className="pipeline-placeholder pipeline-placeholder-rich">
          <div className="pipeline-placeholder-icon" aria-hidden>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25">
              <rect x="3" y="4" width="6" height="16" rx="1" />
              <rect x="11" y="4" width="6" height="16" rx="1" />
              <rect x="19" y="8" width="2" height="8" rx="0.5" />
            </svg>
          </div>
          <h3 className="pipeline-placeholder-title">Choose a job</h3>
          <p>Select a position above to load its pipeline, stages, and candidates.</p>
        </div>
      )}

      {typeof jobId === 'number' && loading && (
        <div className="list-loading">
          <div className="spinner" style={{ width: 28, height: 28 }} />
          Loading pipeline…
        </div>
      )}

      {typeof jobId === 'number' && err && <div className="list-error">{err}</div>}

      {typeof jobId === 'number' && !loading && !err && stages.length === 0 && (
        <div className="pipeline-placeholder pipeline-placeholder-rich">
          <h3 className="pipeline-placeholder-title">Build your pipeline</h3>
          <p>
            No stages for this job yet. Open <strong>Edit stages</strong> to add columns such as Screening, Interview, and Offer.
          </p>
        </div>
      )}

      {typeof jobId === 'number' && !loading && !err && stages.length > 0 && (
        <div className="pipeline-kanban-host">
        <DndContext
          sensors={sensors}
          collisionDetection={pipelineCollisionDetection}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveApp(null)}
        >
          <div className="kanban-board kanban-board-rich">
            <KanbanColumn
              id={DROP_UNASSIGNED}
              title="Unassigned"
              subtitle="Not placed on a stage"
              appsAll={byColumn.get('unassigned') ?? []}
              appsVisible={visibleByColumn.get('unassigned') ?? []}
              emptyHint="Drop here to remove stage assignment"
              accentClass="kanban-column-unassigned"
              accountId={accountId}
            />
            {stages.map((s, i) => (
              <KanbanColumn
                key={s.id}
                id={dropStageId(s.id)}
                title={s.name}
                subtitle={s.stage_type ?? undefined}
                appsAll={byColumn.get(s.id) ?? []}
                appsVisible={visibleByColumn.get(s.id) ?? []}
                emptyHint="Drop candidates here"
                accentClass={accentForStage(i)}
                accountId={accountId}
                healthScore={stageHealthScore(s.id, (byColumn.get(s.id) ?? []).length)}
              />
            ))}
          </div>
          <DragOverlay dropAnimation={null}>
            {activeApp ? (
              <div className="kanban-card kanban-card-overlay">
                <div className="kanban-drag-handle kanban-drag-handle-static" aria-hidden>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 6a2 2 0 11-4 0 2 2 0 014 0zm0 6a2 2 0 11-4 0 2 2 0 014 0zm0 6a2 2 0 11-4 0 2 2 0 014 0zm6-12a2 2 0 11-4 0 2 2 0 014 0zm0 6a2 2 0 11-4 0 2 2 0 014 0zm0 6a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="kanban-card-main kanban-card-main--static">
                  <div className="kanban-card-avatar" aria-hidden>
                    {candidateInitials(activeApp.candidate_name, activeApp.candidate_email)}
                  </div>
                  <div className="kanban-card-copy">
                    <div className="kanban-card-name">{activeApp.candidate_name || '—'}</div>
                    <div className="kanban-card-email">{activeApp.candidate_email}</div>
                  </div>
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
        </div>
      )}
          </div>

            {typeof jobId === 'number' && (
              <aside className="pipeline-activity-rail" aria-label="Recent activity">
                <div className="pipeline-activity-rail-inner">
                  <h3 className="pipeline-activity-title">Recent activity</h3>
                  {recentActivity.length === 0 ? (
                    <p className="pipeline-activity-empty">
                      Stage moves and updates will appear here from each candidate&apos;s history.
                    </p>
                  ) : (
                    <ul className="pipeline-activity-list">
                      {recentActivity.map(row => (
                        <li key={row.id} className="pipeline-activity-item">
                          <div className="pipeline-activity-avatar" aria-hidden>
                            {candidateInitials(row.title, row.title.includes('@') ? row.title : `${row.title}@x.dev`)}
                          </div>
                          <div className="pipeline-activity-body">
                            <div className="pipeline-activity-name">{row.title}</div>
                            <div className="pipeline-activity-detail">{row.sub}</div>
                            <time className="pipeline-activity-time" dateTime={row.at}>
                              {formatRelativeTime(row.at)}
                            </time>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </aside>
            )}
        </div>
      </div>
    </>
  )
}

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
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

function KanbanCard({ app }: { app: Application }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: dragAppId(app.id),
    data: { type: 'application', app },
  })
  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.25 : 1,
    zIndex: isDragging ? 0 : 1,
  }
  return (
    <div ref={setNodeRef} style={style} className="kanban-card" {...attributes}>
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
      <div className="kanban-card-body">
        <div className="kanban-card-name">{app.candidate_name || '—'}</div>
        <div className="kanban-card-email">{app.candidate_email}</div>
        <div className="kanban-card-meta">
          <span className={`tag ${STAGE_TAG[app.status] ?? 'tag-gray'}`}>{app.status}</span>
          {app.score != null && <span className="kanban-fit">Fit {Math.round(app.score)}%</span>}
          {app.source_type && <span className="kanban-source">{app.source_type}</span>}
        </div>
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
}: {
  id: string
  title: string
  subtitle?: string
  appsAll: Application[]
  appsVisible: Application[]
  emptyHint: string
  accentClass?: string
}) {
  const { setNodeRef, isOver } = useDroppable({ id, data: { type: 'column' } })
  const filteredOut = appsAll.length - appsVisible.length
  const showSplit = filteredOut > 0

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
                emptyHint
              )}
            </div>
          )}
          {appsVisible.map(a => (
            <KanbanCard key={a.id} app={a} />
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

function useApplicationFilters(apps: Application[], search: string, status: string, source: string) {
  return useMemo(() => {
    const q = search.trim().toLowerCase()
    return apps.filter(a => {
      if (q) {
        const name = (a.candidate_name ?? '').toLowerCase()
        const email = a.candidate_email.toLowerCase()
        if (!name.includes(q) && !email.includes(q)) return false
      }
      if (status !== 'all' && a.status !== status) return false
      if (source !== 'all' && a.source_type !== source) return false
      return true
    })
  }, [apps, search, status, source])
}

export default function PipelineBoardView() {
  const { token } = useOutletContext<DashboardOutletContext>()
  const toast = useToast()
  const [jobs, setJobs] = useState<Job[]>([])
  const [jobId, setJobId] = useState<number | ''>('')
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [apps, setApps] = useState<Application[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [activeApp, setActiveApp] = useState<Application | null>(null)
  const [manageOpen, setManageOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sourceFilter, setSourceFilter] = useState<string>('all')

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
          applicationsApi.list(token, jid),
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
    [token],
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

  const filteredApps = useApplicationFilters(apps, search, statusFilter, sourceFilter)
  const filtersActive = search.trim() !== '' || statusFilter !== 'all' || sourceFilter !== 'all'

  const sourceTypes = useMemo(() => {
    const set = new Set<string>()
    for (const a of apps) set.add(a.source_type || 'direct')
    return ['all', ...Array.from(set).sort()]
  }, [apps])

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
    setSearch('')
    setStatusFilter('all')
    setSourceFilter('all')
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

      <div className="pipeline-shell">
        <div className="pipeline-hero">
          <div className="pipeline-hero-text">
            <h2 className="pipeline-hero-title">Hiring pipeline</h2>
            <p className="pipeline-hero-sub">Drag candidates by the grip handle into the right stage. Use search and filters to focus the board.</p>
          </div>
          {typeof jobId === 'number' && apps.length > 0 && (
            <div className="pipeline-hero-stats">
              <div className="pipeline-stat">
                <span className="pipeline-stat-value">{apps.length}</span>
                <span className="pipeline-stat-label">Total</span>
              </div>
              <div className="pipeline-stat">
                <span className="pipeline-stat-value">{filteredApps.length}</span>
                <span className="pipeline-stat-label">Showing</span>
              </div>
              <div className="pipeline-stat">
                <span className="pipeline-stat-value">{stages.length}</span>
                <span className="pipeline-stat-label">Stages</span>
              </div>
            </div>
          )}
        </div>

        <div className="pipeline-toolbar pipeline-toolbar-rich">
          <div className="pipeline-toolbar-primary">
            <div className="pipeline-job-select pipeline-job-select-grow">
              <label htmlFor="pipeline-job">Position</label>
              <select
                id="pipeline-job"
                value={typeof jobId === 'number' ? String(jobId) : ''}
                onChange={e => setJobId(e.target.value ? Number(e.target.value) : '')}
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
            {typeof jobId === 'number' && (
              <button type="button" className="btn-pipeline-secondary" onClick={() => setManageOpen(true)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                </svg>
                Edit stages
              </button>
            )}
            {typeof jobId === 'number' && !loading && (
              <button type="button" className="btn-pipeline-ghost" onClick={() => loadJobData(jobId)} disabled={loading}>
                Refresh
              </button>
            )}
          </div>

          {typeof jobId === 'number' && (
            <div className="pipeline-filters">
              <div className="pipeline-search">
                <svg className="pipeline-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                </svg>
                <input
                  type="search"
                  className="pipeline-search-input"
                  placeholder="Search name or email…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  aria-label="Search candidates"
                />
                {search && (
                  <button type="button" className="pipeline-search-clear" onClick={() => setSearch('')} aria-label="Clear search">
                    ×
                  </button>
                )}
              </div>
              <div className="pipeline-filter-group">
                <label htmlFor="pipe-status" className="pipeline-filter-label">
                  Status
                </label>
                <select id="pipe-status" className="pipeline-filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                  {STATUS_OPTIONS.map(s => (
                    <option key={s} value={s}>
                      {s === 'all' ? 'All statuses' : s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="pipeline-filter-group">
                <label htmlFor="pipe-source" className="pipeline-filter-label">
                  Source
                </label>
                <select id="pipe-source" className="pipeline-filter-select" value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}>
                  {sourceTypes.map(s => (
                    <option key={s} value={s}>
                      {s === 'all' ? 'All sources' : s}
                    </option>
                  ))}
                </select>
              </div>
              {filtersActive && (
                <button type="button" className="btn-pipeline-ghost pipeline-clear-filters" onClick={clearFilters}>
                  Clear filters
                </button>
              )}
            </div>
          )}

          {selectedJob && (
            <p className="pipeline-toolbar-foot">
              <span className="pipeline-job-pill">{selectedJob.title}</span>
              {selectedJob.location && <span className="pipeline-meta-item">{selectedJob.location}</span>}
              <span className="pipeline-meta-item">{stages.length} stages</span>
              <span className="pipeline-meta-item">{apps.length} applications</span>
              {filtersActive && (
                <span className="pipeline-meta-item pipeline-meta-filter">Filtered: {filteredApps.length} visible</span>
              )}
            </p>
          )}
        </div>
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
                <div className="kanban-card-body">
                  <div className="kanban-card-name">{activeApp.candidate_name || '—'}</div>
                  <div className="kanban-card-email">{activeApp.candidate_email}</div>
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </>
  )
}

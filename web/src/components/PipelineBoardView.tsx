import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  closestCorners,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
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

function KanbanCard({ app }: { app: Application }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: dragAppId(app.id),
    data: { app },
  })
  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.45 : 1,
  }
  const initials = (app.candidate_name || app.candidate_email).slice(0, 2).toUpperCase()
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="kanban-card"
      {...listeners}
      {...attributes}
    >
      <div className="kanban-card-avatar" aria-hidden>
        {initials}
      </div>
      <div className="kanban-card-body">
        <div className="kanban-card-name">{app.candidate_name || '—'}</div>
        <div className="kanban-card-email">{app.candidate_email}</div>
        <div className="kanban-card-meta">
          <span className={`tag ${STAGE_TAG[app.status] ?? 'tag-gray'}`}>{app.status}</span>
          {app.score != null && <span className="kanban-fit">Fit {Math.round(app.score)}%</span>}
        </div>
      </div>
    </div>
  )
}

function KanbanColumn({
  id,
  title,
  subtitle,
  apps,
  emptyHint,
}: {
  id: string
  title: string
  subtitle?: string
  apps: Application[]
  emptyHint: string
}) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div ref={setNodeRef} className={`kanban-column ${isOver ? 'kanban-column-over' : ''}`}>
      <header className="kanban-column-head">
        <div className="kanban-column-title">{title}</div>
        {subtitle && <div className="kanban-column-sub">{subtitle}</div>}
        <span className="kanban-column-count">{apps.length}</span>
      </header>
      <div className="kanban-column-scroll">
        {apps.length === 0 && <div className="kanban-empty">{emptyHint}</div>}
        {apps.map(a => (
          <KanbanCard key={a.id} app={a} />
        ))}
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

export default function PipelineBoardView({ token }: { token: string }) {
  const toast = useToast()
  const [jobs, setJobs] = useState<Job[]>([])
  const [jobId, setJobId] = useState<number | ''>('')
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [apps, setApps] = useState<Application[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [activeApp, setActiveApp] = useState<Application | null>(null)
  const [manageOpen, setManageOpen] = useState(false)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

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

  /** Resolve drop target when hovering a column or another card in that column. */
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
    const app = apps.find(a => a.id === aid) ?? null
    setActiveApp(app)
  }

  const handleDragEnd = async (e: DragEndEvent) => {
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
      toast.success('Candidate moved', 'Pipeline updated.')
      if (typeof jobId === 'number') void loadJobData(jobId)
    } catch (e: unknown) {
      setApps(prev)
      toast.error('Move failed', e instanceof Error ? e.message : 'Could not update stage')
    }
  }

  const selectedJob = typeof jobId === 'number' ? jobs.find(j => j.id === jobId) : undefined

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

      <div className="pipeline-toolbar">
        <div className="pipeline-toolbar-row">
          <div className="pipeline-job-select">
            <label htmlFor="pipeline-job">Job</label>
            <select
              id="pipeline-job"
              value={typeof jobId === 'number' ? String(jobId) : ''}
              onChange={e => setJobId(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">Select a job…</option>
              {jobs.map(j => (
                <option key={j.id} value={j.id}>
                  {j.title}
                </option>
              ))}
            </select>
          </div>
          {typeof jobId === 'number' && (
            <button type="button" className="btn-action" onClick={() => setManageOpen(true)}>
              Manage stages
            </button>
          )}
        </div>
        {selectedJob && (
          <p className="pipeline-toolbar-meta">
            {stages.length} stages · {apps.length} applications
          </p>
        )}
      </div>

      {typeof jobId !== 'number' && <div className="pipeline-placeholder">Choose a job to open its hiring pipeline.</div>}

      {typeof jobId === 'number' && loading && (
        <div className="list-loading">
          <div className="spinner" style={{ width: 28, height: 28 }} />
          Loading pipeline…
        </div>
      )}

      {typeof jobId === 'number' && err && <div className="list-error">{err}</div>}

      {typeof jobId === 'number' && !loading && !err && stages.length === 0 && (
        <div className="pipeline-placeholder">
          <strong>No stages yet.</strong> Open <em>Manage stages</em> to add columns (e.g. Screening, Interview, Offer).
        </div>
      )}

      {typeof jobId === 'number' && !loading && !err && stages.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="kanban-board">
            <KanbanColumn
              id={DROP_UNASSIGNED}
              title="Unassigned"
              subtitle="Not on a custom stage"
              apps={byColumn.get('unassigned') ?? []}
              emptyHint="Drop here to clear column"
            />
            {stages.map(s => (
              <KanbanColumn
                key={s.id}
                id={dropStageId(s.id)}
                title={s.name}
                subtitle={s.stage_type ?? undefined}
                apps={byColumn.get(s.id) ?? []}
                emptyHint="Drop candidates here"
              />
            ))}
          </div>
          <DragOverlay dropAnimation={null}>
            {activeApp ? (
              <div className="kanban-card kanban-card-overlay">
                <div className="kanban-card-avatar">
                  {(activeApp.candidate_name || activeApp.candidate_email).slice(0, 2).toUpperCase()}
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

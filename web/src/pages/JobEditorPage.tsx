import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useOutletContext, useParams, useLocation } from 'react-router-dom'
import { jobsApi, type Job } from '../api/jobs'
import { pipelineStagesApi, type PipelineStage } from '../api/pipelineStages'
import { interviewPlansApi, type InterviewPlan } from '../api/interviewPlans'
import { useToast } from '../contexts/ToastContext'
import type { DashboardOutletContext } from '../layouts/DashboardOutletContext'
import RichTextEditor from '../components/RichTextEditor'

type JobStepId = 'basics' | 'description' | 'interview'

const STEP_DEFS: {
  id: JobStepId
  label: string
  short: string
  railTitle: string
  railBody: string
}[] = [
  {
    id: 'basics',
    label: 'Role basics',
    short: 'Title, status, location',
    railTitle: 'Anchor the role',
    railBody:
      'Searchable metadata and how the job appears internally. Get this right first—everything else hangs off this record.',
  },
  {
    id: 'description',
    label: 'Job description',
    short: 'Public posting copy',
    railTitle: 'Tell the story',
    railBody:
      'Candidates and hiring managers see this first. Rich text supports culture, scope, and manager voice.',
  },
  {
    id: 'interview',
    label: 'Interview panel',
    short: 'Signal map & kits',
    railTitle: 'Signal-based hiring',
    railBody:
      'Define rounds (plans) and interviewer kits per job. When someone hits a linked pipeline stage, assignments are created; scorecards capture structured feedback after each session.',
  },
]

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  )
}

function JobEditorField({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="job-editor-field">
      <span className="job-editor-label">{label}</span>
      {hint ? <p className="job-editor-field-hint">{hint}</p> : null}
      {children}
    </div>
  )
}

function htmlHasText(html: string): boolean {
  const t = html.replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ').trim()
  return t.length > 0
}

function SignalModelStrip() {
  const items = [
    {
      k: 'Plan',
      d: 'Rounds per job, ordered and optionally tied to a pipeline stage.',
    },
    {
      k: 'Kit',
      d: 'Focus area, interviewer notes, and structured questions for that round.',
    },
    {
      k: 'Assignments',
      d: 'Created when candidates enter a linked stage—who interviews whom.',
    },
    {
      k: 'Scorecards',
      d: 'Structured outcomes (criteria + recommendation) after the interview.',
    },
  ]
  return (
    <div className="signal-model-strip" aria-label="Interview data model">
      {items.map((it, i) => (
        <div key={it.k} className="signal-model-strip-item">
          {i > 0 && <span className="signal-model-strip-arrow" aria-hidden />}
          <div className="signal-model-strip-card">
            <span className="signal-model-strip-key">{it.k}</span>
            <p className="signal-model-strip-desc">{it.d}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function InterviewPanelSection({ token, jobId }: { token: string; jobId: number }) {
  const toast = useToast()
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [plans, setPlans] = useState<InterviewPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [newName, setNewName] = useState('')
  const [newStageId, setNewStageId] = useState<string>('')
  const [kitFocus, setKitFocus] = useState('')
  const [kitInstructions, setKitInstructions] = useState('')
  const [kitQuestions, setKitQuestions] = useState('')
  const [savingKit, setSavingKit] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [st, pl] = await Promise.all([
        pipelineStagesApi.listByJob(token, jobId),
        interviewPlansApi.list(token, jobId),
      ])
      setStages(st.sort((a, b) => a.position - b.position))
      setPlans(pl)
    } catch (e: unknown) {
      toast.error('Failed to load interview setup', e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }, [token, jobId, toast])

  useEffect(() => {
    load()
  }, [load])

  const selected = plans.find(p => p.id === selectedId) ?? null

  useEffect(() => {
    if (!selected) {
      setKitFocus('')
      setKitInstructions('')
      setKitQuestions('')
      return
    }
    const k = selected.kit
    setKitFocus(k?.focus_area ?? '')
    setKitInstructions(k?.instructions ?? '')
    const qs = k?.questions
    setKitQuestions(
      Array.isArray(qs) ? qs.map(q => (typeof q === 'string' ? q : JSON.stringify(q))).join('\n') : '',
    )
  }, [selected])

  const stageName = (id: number | null) => {
    if (id == null) return 'Not linked'
    return stages.find(s => s.id === id)?.name ?? `Stage #${id}`
  }

  const addRound = async () => {
    const name = newName.trim()
    if (!name) {
      toast.error('Add a round name', 'e.g. Technical deep-dive')
      return
    }
    try {
      await interviewPlansApi.create(token, jobId, {
        name,
        pipeline_stage_id: newStageId ? Number(newStageId) : null,
      })
      setNewName('')
      setNewStageId('')
      toast.success('Round added', name)
      load()
    } catch (e: unknown) {
      toast.error('Could not add round', e instanceof Error ? e.message : 'Error')
    }
  }

  const removePlan = async (p: InterviewPlan) => {
    if (!confirm(`Delete interview round "${p.name}"? Assignments for this round will be removed.`)) return
    try {
      await interviewPlansApi.delete(token, jobId, p.id)
      if (selectedId === p.id) setSelectedId(null)
      toast.success('Round removed', p.name)
      load()
    } catch (e: unknown) {
      toast.error('Delete failed', e instanceof Error ? e.message : 'Error')
    }
  }

  const saveKit = async () => {
    if (!selected) return
    const questions = kitQuestions
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean)
    setSavingKit(true)
    try {
      await interviewPlansApi.putKit(token, jobId, selected.id, {
        focus_area: kitFocus || null,
        instructions: kitInstructions || null,
        questions,
      })
      toast.success('Interview kit saved', selected.name)
      load()
    } catch (e: unknown) {
      toast.error('Kit save failed', e instanceof Error ? e.message : 'Error')
    } finally {
      setSavingKit(false)
    }
  }

  if (loading) {
    return (
      <div className="job-step-body">
        <p className="job-editor-step-lead">
          Tie each round to a pipeline stage. When candidates enter that stage, assignments can be created from these
          plans.
        </p>
        <div className="job-editor-loading">Loading interview setup…</div>
      </div>
    )
  }

  return (
    <div className="job-step-body job-step-body--interview">
      <div className="job-interview-intro">
        <h2 className="job-editor-block-title job-interview-intro-title">Signal map</h2>
        <p className="job-editor-step-lead">
          Each round tests one signal (e.g. coding vs. culture). Link a round to a Kanban stage so the right interview
          is triggered when someone moves—without overlapping dimensions.
        </p>
        <SignalModelStrip />
      </div>

      <div className="signal-map" aria-label="Interview rounds">
        {plans.length === 0 && (
          <div className="signal-map-empty">
            <strong>No rounds yet.</strong> Add a plan below—then attach a kit so interviewers know exactly what to
            cover.
          </div>
        )}
        {plans
          .slice()
          .sort((a, b) => a.position - b.position || a.id - b.id)
          .map((p, i) => (
            <div key={p.id} className="signal-map-chain">
              {i > 0 && (
                <span className="signal-map-arrow" aria-hidden="true">
                  →
                </span>
              )}
              <button
                type="button"
                className={`signal-card ${selectedId === p.id ? 'signal-card-active' : ''}`}
                onClick={() => setSelectedId(p.id === selectedId ? null : p.id)}
              >
                <div className="signal-card-name">{p.name}</div>
                <div className="signal-card-meta">{stageName(p.pipeline_stage_id)}</div>
                {p.kit?.focus_area && <div className="signal-card-focus">{p.kit.focus_area}</div>}
              </button>
            </div>
          ))}
      </div>

      <div className="job-editor-grid-2 job-editor-grid-2--interview">
        <div className="job-editor-card job-editor-card--accent">
          <h3 className="job-editor-card-title">1 · Add a round (plan)</h3>
          <p className="job-card-microcopy">The blueprint: one named round, optionally gated by pipeline stage.</p>
          <FormField label="Round name *">
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="e.g. System design, Culture, Bar raiser"
            />
          </FormField>
          <FormField label="When candidate reaches stage">
            <select value={newStageId} onChange={e => setNewStageId(e.target.value)}>
              <option value="">Not linked (manual assignments only)</option>
              {stages.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </FormField>
          <button type="button" className="btn-primary" onClick={addRound}>
            Add round
          </button>
        </div>

        <div className={`job-editor-card ${selected ? 'job-editor-card--accent' : ''}`}>
          <h3 className="job-editor-card-title">2 · Interviewer kit</h3>
          <p className="job-card-microcopy">Questions and guidance for whoever runs this round.</p>
          {!selected && (
            <p className="job-editor-muted job-editor-muted--boxed">
              Select a round in the signal map above to edit its kit. Kits are stored per plan and shown to interviewers
              when they open an assignment.
            </p>
          )}
          {selected && (
            <>
              <div className="job-editor-card-actions">
                <button type="button" className="btn-row-action btn-row-danger" onClick={() => removePlan(selected)}>
                  Delete this round
                </button>
              </div>
              <FormField label="Focus area">
                <input
                  value={kitFocus}
                  onChange={e => setKitFocus(e.target.value)}
                  placeholder="e.g. Problem solving & architecture"
                />
              </FormField>
              <FormField label="Interviewer instructions">
                <textarea
                  value={kitInstructions}
                  onChange={e => setKitInstructions(e.target.value)}
                  rows={3}
                  placeholder="Emphasize signal X, avoid overlap with the prior round…"
                />
              </FormField>
              <FormField label="Questions (one per line)">
                <textarea
                  value={kitQuestions}
                  onChange={e => setKitQuestions(e.target.value)}
                  rows={8}
                  placeholder={'Walk me through a recent tradeoff…\nDesign X under constraint Y…'}
                />
              </FormField>
              <button type="button" className="btn-primary" onClick={saveKit} disabled={savingKit}>
                {savingKit ? 'Saving…' : 'Save kit'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function JobEditorPage() {
  const { token, accountId } = useOutletContext<DashboardOutletContext>()
  const navigate = useNavigate()
  const { pathname, state: locationState } = useLocation()
  const { jobId: jobIdParam } = useParams<{ jobId: string }>()
  const toast = useToast()

  const isNew = pathname.endsWith('/jobs/new')
  const editJobId = !isNew && jobIdParam ? Number(jobIdParam) : NaN

  const [job, setJob] = useState<Job | null>(null)
  const [controlVersionId, setControlVersionId] = useState<number | null>(null)
  const [loadErr, setLoadErr] = useState('')
  const [form, setForm] = useState({
    title: '',
    department: '',
    location: '',
    location_type: 'onsite',
    employment_type: 'full_time',
    status: 'draft',
    descriptionHtml: '<p></p>',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [stepIndex, setStepIndex] = useState(0)

  const jobsBase = `/account/${accountId}/jobs`
  const numericId = isNew ? null : editJobId
  const hasInterviewStep = numericId != null && !Number.isNaN(numericId) && numericId > 0

  const visibleSteps = useMemo(
    () => (hasInterviewStep ? STEP_DEFS : STEP_DEFS.filter(s => s.id !== 'interview')),
    [hasInterviewStep],
  )

  useEffect(() => {
    setStepIndex(i => (i >= visibleSteps.length ? Math.max(0, visibleSteps.length - 1) : i))
  }, [visibleSteps.length])

  useEffect(() => {
    const want = (locationState as { jobEditorInitialStep?: JobStepId } | null)?.jobEditorInitialStep
    if (!want || !hasInterviewStep) return
    const idx = STEP_DEFS.findIndex(s => s.id === want)
    if (idx >= 0) setStepIndex(idx)
    navigate(pathname, { replace: true, state: null })
  }, [hasInterviewStep, locationState, navigate, pathname])

  const currentStep = visibleSteps[stepIndex] ?? visibleSteps[0]
  const stepId = currentStep?.id ?? 'basics'

  useEffect(() => {
    if (isNew) {
      setJob(null)
      setControlVersionId(null)
      setLoadErr('')
      setForm({
        title: '',
        department: '',
        location: '',
        location_type: 'onsite',
        employment_type: 'full_time',
        status: 'draft',
        descriptionHtml: '<p></p>',
      })
      return
    }
    if (Number.isNaN(editJobId) || editJobId <= 0) {
      setLoadErr('Invalid job')
      return
    }
    let cancelled = false
    ;(async () => {
      setLoadErr('')
      try {
        const j = await jobsApi.get(token, editJobId)
        if (cancelled) return
        setJob(j)
        const v = j.versions?.find(x => x.is_control) ?? j.versions?.[0]
        setControlVersionId(v?.id ?? null)
        setForm({
          title: j.title,
          department: j.department ?? '',
          location: j.location ?? '',
          location_type: j.location_type,
          employment_type: j.employment_type,
          status: j.status,
          descriptionHtml: v?.description ? v.description : '<p></p>',
        })
      } catch (e: unknown) {
        if (!cancelled) setLoadErr(e instanceof Error ? e.message : 'Failed to load job')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token, isNew, editJobId])

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const persistDescription = async (jobId: number, html: string) => {
    if (!htmlHasText(html)) return
    if (controlVersionId != null) {
      await jobsApi.updateVersion(token, jobId, controlVersionId, { description: html })
      return
    }
    try {
      await jobsApi.createVersion(token, jobId, { version_name: 'A', description: html })
    } catch {
      const versions = await jobsApi.listVersions(token, jobId)
      const a = versions.find(v => v.version_name === 'A')
      if (a) await jobsApi.updateVersion(token, jobId, a.id, { description: html })
    }
  }

  const saveJob = async () => {
    setSaving(true)
    setErr('')
    try {
      if (isNew) {
        const created = await jobsApi.create(token, {
          title: form.title,
          department: form.department || undefined,
          location: form.location || undefined,
          location_type: form.location_type,
          employment_type: form.employment_type,
          status: form.status,
          description: htmlHasText(form.descriptionHtml) ? form.descriptionHtml : undefined,
        })
        toast.success('Job created', `"${created.title}" — configure the interview panel next.`)
        navigate(`${jobsBase}/${created.id}/edit`, {
          replace: true,
          state: { jobEditorInitialStep: 'interview' as const },
        })
        return
      }
      await jobsApi.update(token, editJobId, {
        title: form.title,
        department: form.department || null,
        location: form.location || null,
        location_type: form.location_type,
        employment_type: form.employment_type,
        status: form.status,
      })
      await persistDescription(editJobId, form.descriptionHtml)
      toast.success('Job updated', form.title)
      const j = await jobsApi.get(token, editJobId)
      setJob(j)
      const v = j.versions?.find(x => x.is_control) ?? j.versions?.[0]
      setControlVersionId(v?.id ?? null)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to save'
      setErr(msg)
      toast.error('Save failed', msg)
    } finally {
      setSaving(false)
    }
  }

  const goStep = (delta: number) => {
    setStepIndex(i => {
      const next = i + delta
      if (next < 0 || next >= visibleSteps.length) return i
      return next
    })
  }

  const goToStepIndex = (idx: number) => {
    if (idx < 0 || idx >= visibleSteps.length) return
    setStepIndex(idx)
  }

  if (!isNew && (Number.isNaN(editJobId) || editJobId <= 0)) {
    return (
      <div className="job-editor-page">
        <nav className="job-editor-breadcrumb" aria-label="Breadcrumb">
          <button type="button" className="job-editor-crumb-link" onClick={() => navigate(jobsBase)}>
            Jobs
          </button>
          <span className="job-editor-crumb-div" aria-hidden>
            /
          </span>
          <span className="job-editor-crumb-current">Error</span>
        </nav>
        <div className="job-editor-sheet job-editor-sheet--narrow">
          <div className="auth-error job-editor-inline-alert">Invalid job link.</div>
          <button type="button" className="job-editor-text-btn" onClick={() => navigate(jobsBase)}>
            ← Back to jobs
          </button>
        </div>
      </div>
    )
  }

  const sheetTitle =
    stepId === 'basics'
      ? 'Role basics'
      : stepId === 'description'
        ? 'Job description'
        : 'Interview panel & signal map'

  const sheetSub =
    stepId === 'basics'
      ? 'How this job appears in search, boards, and internal views.'
      : stepId === 'description'
        ? 'Public-facing copy on your primary posting version.'
        : 'Define structured rounds and interviewer kits for this job.'

  return (
    <div className="job-editor-page job-editor-page--wizard">
      <nav className="job-editor-breadcrumb" aria-label="Breadcrumb">
        <button type="button" className="job-editor-crumb-link" onClick={() => navigate(jobsBase)}>
          Jobs
        </button>
        <span className="job-editor-crumb-div" aria-hidden>
          /
        </span>
        <span className="job-editor-crumb-current">{isNew ? 'New position' : job?.title || 'Edit position'}</span>
      </nav>

      {!isNew && loadErr && <div className="auth-error job-editor-inline-alert">{loadErr}</div>}
      {err && <div className="auth-error job-editor-inline-alert">{err}</div>}

      <div className="job-editor-split">
        <div className="job-editor-workspace">
          <article className="job-editor-sheet">
            <header className="job-editor-sheet-head">
              <div className="job-editor-sheet-titles">
                <p className="job-editor-step-kicker">
                  Step {stepIndex + 1} of {visibleSteps.length}
                  {!hasInterviewStep && isNew ? ' · save to unlock interview setup' : ''}
                </p>
                <h1 className="job-editor-page-title">{sheetTitle}</h1>
                <p className="job-editor-page-sub">{sheetSub}</p>
              </div>
              <button
                type="button"
                className="job-editor-btn-primary"
                onClick={saveJob}
                disabled={saving || (!isNew && !!loadErr)}
              >
                {saving ? 'Saving…' : isNew ? 'Create job' : 'Save changes'}
              </button>
            </header>

            <div className="job-editor-sheet-body job-editor-sheet-body--step">
              {stepId === 'basics' && (
                <section className="job-step-pane" aria-labelledby="step-basics">
                  <h2 id="step-basics" className="visually-hidden">
                    Role basics
                  </h2>
                  <div className="job-editor-grid-2">
                    <JobEditorField label="Job title" hint="Required. Use a clear, searchable title.">
                      <input
                        className="job-editor-input"
                        value={form.title}
                        onChange={e => set('title', e.target.value)}
                        placeholder="Senior Software Engineer"
                        autoComplete="off"
                      />
                    </JobEditorField>
                    <JobEditorField label="Status" hint="Draft stays internal; Open is visible where you publish.">
                      <select
                        className="job-editor-select"
                        value={form.status}
                        onChange={e => set('status', e.target.value)}
                      >
                        <option value="draft">Draft</option>
                        <option value="open">Open</option>
                        <option value="paused">Paused</option>
                        <option value="closed">Closed</option>
                      </select>
                    </JobEditorField>
                    <JobEditorField label="Department">
                      <input
                        className="job-editor-input"
                        value={form.department}
                        onChange={e => set('department', e.target.value)}
                        placeholder="Engineering"
                      />
                    </JobEditorField>
                    <JobEditorField label="Location">
                      <input
                        className="job-editor-input"
                        value={form.location}
                        onChange={e => set('location', e.target.value)}
                        placeholder="London · Hybrid"
                      />
                    </JobEditorField>
                    <JobEditorField label="Work arrangement">
                      <select
                        className="job-editor-select"
                        value={form.location_type}
                        onChange={e => set('location_type', e.target.value)}
                      >
                        <option value="onsite">On-site</option>
                        <option value="remote">Remote</option>
                        <option value="hybrid">Hybrid</option>
                      </select>
                    </JobEditorField>
                    <JobEditorField label="Employment type">
                      <select
                        className="job-editor-select"
                        value={form.employment_type}
                        onChange={e => set('employment_type', e.target.value)}
                      >
                        <option value="full_time">Full-time</option>
                        <option value="part_time">Part-time</option>
                        <option value="contract">Contract</option>
                        <option value="internship">Internship</option>
                      </select>
                    </JobEditorField>
                  </div>
                </section>
              )}

              {stepId === 'description' && (
                <section className="job-step-pane" aria-labelledby="step-desc">
                  <h2 id="step-desc" className="visually-hidden">
                    Job description
                  </h2>
                  <div className="job-editor-description-wrap">
                    <RichTextEditor
                      value={form.descriptionHtml}
                      onChange={html => setForm(f => ({ ...f, descriptionHtml: html }))}
                      placeholder="Summarise the mission, responsibilities, and what great looks like…"
                      minHeight={isNew ? 280 : 320}
                    />
                  </div>
                  {!isNew && job && (
                    <footer className="job-editor-foot-meta">
                      <span className="job-editor-foot-label">Posting slug</span>
                      <code className="job-editor-foot-code">{job.slug}</code>
                      {job.versions?.length ? (
                        <span className="job-editor-foot-extra">{job.versions.length} version(s)</span>
                      ) : null}
                    </footer>
                  )}
                </section>
              )}

              {stepId === 'interview' && hasInterviewStep && (
                <section className="job-step-pane" aria-labelledby="step-interview">
                  <h2 id="step-interview" className="visually-hidden">
                    Interview panel
                  </h2>
                  <InterviewPanelSection token={token} jobId={numericId!} />
                </section>
              )}
            </div>
          </article>
        </div>

        <aside className="job-editor-rail" aria-label="Job setup steps">
          <div className="job-editor-rail-inner">
            <p className="job-rail-eyebrow">{isNew ? 'New job' : 'Edit job'}</p>
            <h2 className="job-rail-heading">Setup</h2>
            <ol className="job-stepper" role="list">
              {visibleSteps.map((s, idx) => {
                const done = idx < stepIndex
                const active = idx === stepIndex
                return (
                  <li key={s.id} className="job-stepper-item">
                    <button
                      type="button"
                      className={`job-stepper-btn ${active ? 'job-stepper-btn--active' : ''} ${done ? 'job-stepper-btn--done' : ''}`}
                      onClick={() => goToStepIndex(idx)}
                    >
                      <span className="job-stepper-index">{done ? '✓' : idx + 1}</span>
                      <span className="job-stepper-text">
                        <span className="job-stepper-label">{s.label}</span>
                        <span className="job-stepper-short">{s.short}</span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ol>

            {!hasInterviewStep && (
              <div className="job-rail-callout">
                <strong>Interview panel</strong> unlocks after you create the job so rounds are stored against a real{' '}
                <code>job_id</code>—same multi-tenant pattern as the rest of the workspace.
              </div>
            )}

            <div className="job-rail-context">
              <h3 className="job-rail-context-title">{currentStep?.railTitle}</h3>
              <p className="job-rail-context-body">{currentStep?.railBody}</p>
            </div>

            <div className="job-rail-nav">
              <button
                type="button"
                className="job-rail-nav-btn job-rail-nav-btn--ghost"
                onClick={() => goStep(-1)}
                disabled={stepIndex <= 0}
              >
                Back
              </button>
              <button
                type="button"
                className="job-rail-nav-btn job-rail-nav-btn--primary"
                onClick={() => goStep(1)}
                disabled={stepIndex >= visibleSteps.length - 1}
              >
                Next step
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

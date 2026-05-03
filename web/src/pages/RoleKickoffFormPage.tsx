import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { accountMembersApi } from '../api/accountMembers'
import { hiringAttributesApi, hiringStageTemplatesApi, type HiringAttributeRow, type HiringStageTemplateRow } from '../api/hiringStructure'
import { roleKickoffApi, type RoleKickoffSelectedStage } from '../api/roleKickoff'
import type { DashboardOutletContext } from '../layouts/DashboardOutletContext'
import { useToast } from '../contexts/ToastContext'

function splitSkills(s: string): string[] {
  return s
    .split(/[,;\n]+/)
    .map(x => x.trim())
    .filter(Boolean)
}

function FormCard({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className="rk-card">
      <header className="rk-card-head">
        <h2 className="rk-card-title">{title}</h2>
        {description ? <p className="rk-card-desc">{description}</p> : null}
      </header>
      <div className="rk-card-body">{children}</div>
    </section>
  )
}

function Field({
  id,
  label,
  hint,
  children,
}: {
  id?: string
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div className="rk-field">
      <label className="rk-label" htmlFor={id}>
        {label}
      </label>
      {children}
      {hint ? <p className="rk-hint">{hint}</p> : null}
    </div>
  )
}

export default function RoleKickoffFormPage() {
  const { token, accountId } = useOutletContext<DashboardOutletContext>()
  const { kickoffId } = useParams<{ kickoffId: string }>()
  const isEdit = Boolean(kickoffId)
  const navigate = useNavigate()
  const toast = useToast()
  const base = `/account/${accountId}/jobs/role-kickoff`

  const [recruiters, setRecruiters] = useState<{ id: number; name: string; email: string }[]>([])
  const [loadingMeta, setLoadingMeta] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadErr, setLoadErr] = useState('')

  const [title, setTitle] = useState('')
  const [department, setDepartment] = useState('')
  const [openPositions, setOpenPositions] = useState('1')
  const [location, setLocation] = useState('')
  const [whyHiring, setWhyHiring] = useState('')
  const [expectation306090, setExpectation306090] = useState('')
  const [successDefinition, setSuccessDefinition] = useState('')
  const [skillsMust, setSkillsMust] = useState('')
  const [skillsNice, setSkillsNice] = useState('')
  const [experienceNote, setExperienceNote] = useState('')
  const [salaryMin, setSalaryMin] = useState('')
  const [salaryMax, setSalaryMax] = useState('')
  const [salaryCurrency, setSalaryCurrency] = useState('USD')
  const [budgetNotes, setBudgetNotes] = useState('')
  const [interviewRounds, setInterviewRounds] = useState('')
  const [interviewersNote, setInterviewersNote] = useState('')
  const [assignedRecruiterId, setAssignedRecruiterId] = useState('')
  const [stageTemplates, setStageTemplates] = useState<HiringStageTemplateRow[]>([])
  const [hiringAttrs, setHiringAttrs] = useState<HiringAttributeRow[]>([])
  const [selectedStages, setSelectedStages] = useState<RoleKickoffSelectedStage[]>([])

  useEffect(() => {
    let cancelled = false
    setLoadingMeta(true)
    Promise.all([
      accountMembersApi.list(token, { workspace_role: 'recruiter' }).catch(() => []),
      hiringStageTemplatesApi.list(token).catch(() => []),
      hiringAttributesApi.list(token).catch(() => []),
      isEdit && kickoffId
        ? roleKickoffApi.get(token, Number(kickoffId)).catch(() => null)
        : Promise.resolve(null),
    ])
      .then(([members, tpls, attrs, row]) => {
        if (cancelled) return
        setRecruiters(members)
        setStageTemplates(Array.isArray(tpls) ? tpls : [])
        setHiringAttrs(Array.isArray(attrs) ? attrs : [])
        if (row) {
          if (row.status !== 'changes_requested') {
            setLoadErr(
              'Only requests with “changes requested” can be edited here. Open the request to view details.',
            )
            return
          }
          setTitle(row.title ?? '')
          setDepartment(row.department ?? '')
          setOpenPositions(String(row.open_positions ?? 1))
          setLocation(row.location ?? '')
          setWhyHiring(row.why_hiring ?? '')
          setExpectation306090(row.expectation_30_60_90 ?? '')
          setSuccessDefinition(row.success_definition ?? '')
          setSkillsMust((row.skills_must_have ?? []).join(', '))
          setSkillsNice((row.skills_nice_to_have ?? []).join(', '))
          setExperienceNote(row.experience_note ?? '')
          setSalaryMin(row.salary_min != null ? String(row.salary_min) : '')
          setSalaryMax(row.salary_max != null ? String(row.salary_max) : '')
          setSalaryCurrency(row.salary_currency ?? 'USD')
          setBudgetNotes(row.budget_notes ?? '')
          setInterviewRounds(row.interview_rounds != null ? String(row.interview_rounds) : '')
          setInterviewersNote(row.interviewers_note ?? '')
          setAssignedRecruiterId(String(row.assigned_recruiter_user_id ?? ''))
          setSelectedStages(Array.isArray(row.selected_stages) ? row.selected_stages : [])
        }
      })
      .catch(() => {
        if (!cancelled) setRecruiters([])
      })
      .finally(() => {
        if (!cancelled) setLoadingMeta(false)
      })
    return () => {
      cancelled = true
    }
  }, [token, isEdit, kickoffId])

  const buildPayload = useCallback(() => {
    const smin = salaryMin.trim() ? Number(salaryMin) : null
    const smax = salaryMax.trim() ? Number(salaryMax) : null
    const ir = interviewRounds.trim() ? Number(interviewRounds) : null
    return {
      title: title.trim(),
      department: department.trim() || null,
      open_positions: openPositions.trim() ? Number(openPositions) : 1,
      location: location.trim() || null,
      why_hiring: whyHiring.trim() || null,
      expectation_30_60_90: expectation306090.trim() || null,
      success_definition: successDefinition.trim() || null,
      skills_must_have: splitSkills(skillsMust),
      skills_nice_to_have: splitSkills(skillsNice),
      experience_note: experienceNote.trim() || null,
      salary_min: Number.isFinite(smin as number) ? smin : null,
      salary_max: Number.isFinite(smax as number) ? smax : null,
      salary_currency: salaryCurrency.trim() || 'USD',
      budget_notes: budgetNotes.trim() || null,
      interview_rounds: Number.isFinite(ir as number) ? ir : null,
      interviewers_note: interviewersNote.trim() || null,
      assigned_recruiter_user_id: Number(assignedRecruiterId),
      selected_stages: selectedStages,
    }
  }, [
    title,
    department,
    openPositions,
    location,
    whyHiring,
    expectation306090,
    successDefinition,
    skillsMust,
    skillsNice,
    experienceNote,
    salaryMin,
    salaryMax,
    salaryCurrency,
    budgetNotes,
    interviewRounds,
    interviewersNote,
    assignedRecruiterId,
    selectedStages,
  ])

  const templateById = useCallback(
    (id: number) => stageTemplates.find(t => t.id === id),
    [stageTemplates],
  )

  const toggleStageTemplate = (tplId: number) => {
    setSelectedStages(cur => {
      const idx = cur.findIndex(s => s.stage_template_id === tplId)
      if (idx >= 0) return cur.filter((_, i) => i !== idx)
      const tpl = templateById(tplId)
      const defaults = [...(tpl?.default_attribute_ids ?? [])]
      return [...cur, { stage_template_id: tplId, attribute_ids: defaults }]
    })
  }

  const moveStage = (index: number, dir: -1 | 1) => {
    setSelectedStages(cur => {
      const j = index + dir
      if (j < 0 || j >= cur.length) return cur
      const next = [...cur]
      const t = next[index]
      next[index] = next[j]!
      next[j] = t!
      return next
    })
  }

  const toggleStageAttribute = (stageTemplateId: number, attrId: number) => {
    setSelectedStages(cur =>
      cur.map(s => {
        if (s.stage_template_id !== stageTemplateId) return s
        const has = s.attribute_ids.includes(attrId)
        return {
          ...s,
          attribute_ids: has ? s.attribute_ids.filter(a => a !== attrId) : [...s.attribute_ids, attrId],
        }
      }),
    )
  }

  const submit = async () => {
    if (!title.trim()) {
      toast.error('Validation', 'Job title is required.')
      return
    }
    if (!assignedRecruiterId) {
      toast.error('Validation', 'Please assign a recruiter.')
      return
    }
    setSaving(true)
    try {
      const body = buildPayload()
      if (isEdit && kickoffId) {
        await roleKickoffApi.update(token, Number(kickoffId), body)
        toast.success('Updated', 'Your role kickoff request was resubmitted.')
        navigate(`${base}/${kickoffId}`)
      } else {
        const row = await roleKickoffApi.create(token, body)
        toast.success('Submitted', 'Your role kickoff request was sent to the recruiter.')
        navigate(`${base}/${row.id}`)
      }
    } catch (e: unknown) {
      toast.error('Save failed', e instanceof Error ? e.message : 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  if (loadingMeta) {
    return (
      <div className="role-kickoff-page role-kickoff-page--form rk-form-loading">
        <div className="spinner" aria-label="Loading" />
        <p>Loading form…</p>
      </div>
    )
  }

  if (loadErr) {
    return (
      <div className="role-kickoff-page role-kickoff-page--form">
        <div className="rk-card rk-card--alert">
          <p className="rk-card-alert-text">{loadErr}</p>
          <Link to={base} className="rk-btn rk-btn-secondary">
            Back to role kickoff
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="role-kickoff-page role-kickoff-page--form">
      <div className="rk-form-shell">
        <header className="rk-form-hero">
          <Link to={base} className="rk-back-link">
            ← Role kickoff
          </Link>
          <div className="rk-form-hero-main">
            <div>
              <h1 className="rk-form-title">
                {isEdit ? 'Update role kickoff' : 'Create role kickoff request'}
              </h1>
              <p className="rk-form-lead">
                Capture alignment with your recruiter: role basics, business outcomes, skills, compensation, and
                interview expectations before the job exists in the ATS.
              </p>
            </div>
          </div>
        </header>

        <div className="rk-form-stack">
          <FormCard
            title="Role basics"
            description="What role are we opening, where, and how many people?"
          >
            <div className="rk-field-grid rk-field-grid--2">
              <Field id="rk-title" label="Job title">
                <input
                  id="rk-title"
                  className="rk-input"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Senior Backend Engineer"
                  autoComplete="off"
                />
              </Field>
              <Field id="rk-dept" label="Department">
                <input
                  id="rk-dept"
                  className="rk-input"
                  value={department}
                  onChange={e => setDepartment(e.target.value)}
                  placeholder="e.g. Engineering"
                  autoComplete="off"
                />
              </Field>
              <Field id="rk-openings" label="Number of openings">
                <input
                  id="rk-openings"
                  className="rk-input"
                  type="number"
                  min={1}
                  value={openPositions}
                  onChange={e => setOpenPositions(e.target.value)}
                />
              </Field>
              <Field id="rk-loc" label="Location">
                <input
                  id="rk-loc"
                  className="rk-input"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder="e.g. Remote — India"
                  autoComplete="off"
                />
              </Field>
            </div>
          </FormCard>

          <FormCard
            title="Business objective"
            description="This is what recruiters and hiring managers align on first—be specific."
          >
            <Field id="rk-why" label="Why are we hiring?" hint="What gap or outcome drives this hire?">
              <textarea
                id="rk-why"
                className="rk-textarea"
                value={whyHiring}
                onChange={e => setWhyHiring(e.target.value)}
                rows={4}
                placeholder="Describe the business need…"
              />
            </Field>
            <Field
              id="rk-306090"
              label="30 / 60 / 90 day expectations"
              hint="What should this person deliver in the first three months?"
            >
              <textarea
                id="rk-306090"
                className="rk-textarea"
                value={expectation306090}
                onChange={e => setExpectation306090(e.target.value)}
                rows={4}
                placeholder="30 days: …  60 days: …  90 days: …"
              />
            </Field>
            <Field id="rk-success" label="Definition of success" hint="How will we know this hire worked?">
              <textarea
                id="rk-success"
                className="rk-textarea"
                value={successDefinition}
                onChange={e => setSuccessDefinition(e.target.value)}
                rows={3}
                placeholder="Concrete outcomes and measures…"
              />
            </Field>
          </FormCard>

          <FormCard title="Skills & experience" description="Separate must-haves from nice-to-haves.">
            <Field
              id="rk-must"
              label="Must-have skills"
              hint="Comma-separated or one per line — e.g. Python, PostgreSQL, distributed systems"
            >
              <textarea
                id="rk-must"
                className="rk-textarea rk-textarea--compact"
                value={skillsMust}
                onChange={e => setSkillsMust(e.target.value)}
                rows={3}
              />
            </Field>
            <Field id="rk-nice" label="Good-to-have skills" hint="Optional — nice differentiators.">
              <textarea
                id="rk-nice"
                className="rk-textarea rk-textarea--compact"
                value={skillsNice}
                onChange={e => setSkillsNice(e.target.value)}
                rows={3}
              />
            </Field>
            <Field id="rk-exp" label="Experience" hint="Years, seniority, domain, or notable background.">
              <textarea
                id="rk-exp"
                className="rk-textarea rk-textarea--compact"
                value={experienceNote}
                onChange={e => setExperienceNote(e.target.value)}
                rows={2}
                placeholder="e.g. 5+ years backend; led teams of 3–5"
              />
            </Field>
          </FormCard>

          <FormCard title="Compensation" description="Rough range and any budget context (can be refined later).">
            <div className="rk-salary-row">
              <Field id="rk-smin" label="Salary min">
                <input
                  id="rk-smin"
                  className="rk-input"
                  type="number"
                  value={salaryMin}
                  onChange={e => setSalaryMin(e.target.value)}
                  placeholder="—"
                />
              </Field>
              <Field id="rk-smax" label="Salary max">
                <input
                  id="rk-smax"
                  className="rk-input"
                  type="number"
                  value={salaryMax}
                  onChange={e => setSalaryMax(e.target.value)}
                  placeholder="—"
                />
              </Field>
              <Field id="rk-cur" label="Currency">
                <input
                  id="rk-cur"
                  className="rk-input"
                  value={salaryCurrency}
                  onChange={e => setSalaryCurrency(e.target.value)}
                  placeholder="USD"
                />
              </Field>
            </div>
            <Field id="rk-budget" label="Budget notes" hint="Approval status, bands, equity, or constraints.">
              <textarea
                id="rk-budget"
                className="rk-textarea rk-textarea--compact"
                value={budgetNotes}
                onChange={e => setBudgetNotes(e.target.value)}
                rows={2}
              />
            </Field>
          </FormCard>

          <FormCard title="Interview plan" description="Set expectations for structure and participants.">
            <div className="rk-field-grid rk-field-grid--2">
              <Field id="rk-rounds" label="Target rounds" hint="Approximate number of interview rounds.">
                <input
                  id="rk-rounds"
                  className="rk-input"
                  type="number"
                  min={0}
                  value={interviewRounds}
                  onChange={e => setInterviewRounds(e.target.value)}
                  placeholder="e.g. 4"
                />
              </Field>
            </div>
            <Field id="rk-iv" label="Who interviews / notes" hint="Functions, levels, or specific people.">
              <textarea
                id="rk-iv"
                className="rk-textarea"
                value={interviewersNote}
                onChange={e => setInterviewersNote(e.target.value)}
                rows={3}
                placeholder="e.g. HM + Staff engineer panel + Bar raiser…"
              />
            </Field>
          </FormCard>

          <FormCard
            title="Structured hiring pipeline"
            description="Pick reusable stages in order. Focus attributes default from each stage; you can override before submit."
          >
            {stageTemplates.length === 0 ? (
              <p className="rk-inline-note">
                No stage templates yet.{' '}
                <Link to={`/account/${accountId}/structured-hiring/stages`}>Create stages</Link> under Structured
                hiring first.
              </p>
            ) : (
              <>
                <Field label="Select stages" hint="Checked stages are included in pipeline order (use arrows to reorder).">
                  <div className="rk-checkbox-grid">
                    {stageTemplates.map(tpl => (
                      <label key={tpl.id} className="rk-checkbox-row">
                        <input
                          type="checkbox"
                          checked={selectedStages.some(s => s.stage_template_id === tpl.id)}
                          onChange={() => toggleStageTemplate(tpl.id)}
                        />
                        <span>{tpl.name}</span>
                      </label>
                    ))}
                  </div>
                </Field>
                {selectedStages.length > 0 ? (
                  <div className="rk-field" style={{ gap: 14 }}>
                    <span className="rk-label">Order & focus attributes</span>
                    <ul className="rk-kickoff-stage-order">
                      {selectedStages.map((s, i) => {
                        const tpl = templateById(s.stage_template_id)
                        return (
                          <li key={s.stage_template_id} className="rk-kickoff-stage-order-item">
                            <div className="rk-kickoff-stage-order-head">
                              <span className="rk-kickoff-stage-order-title">{tpl?.name ?? `Stage #${s.stage_template_id}`}</span>
                              <span className="rk-kickoff-stage-order-actions">
                                <button
                                  type="button"
                                  className="rk-btn rk-btn-secondary rk-btn--compact"
                                  disabled={i === 0}
                                  onClick={() => moveStage(i, -1)}
                                >
                                  Up
                                </button>
                                <button
                                  type="button"
                                  className="rk-btn rk-btn-secondary rk-btn--compact"
                                  disabled={i === selectedStages.length - 1}
                                  onClick={() => moveStage(i, 1)}
                                >
                                  Down
                                </button>
                              </span>
                            </div>
                            <p className="rk-hint" style={{ margin: '0 0 8px' }}>
                              Scorecard dimensions for this stage (edit to override template defaults).
                            </p>
                            <div className="rk-checkbox-grid rk-checkbox-grid--dense">
                              {hiringAttrs.map(a => (
                                <label key={a.id} className="rk-checkbox-row">
                                  <input
                                    type="checkbox"
                                    checked={s.attribute_ids.includes(a.id)}
                                    onChange={() => toggleStageAttribute(s.stage_template_id, a.id)}
                                  />
                                  <span>{a.name}</span>
                                </label>
                              ))}
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ) : null}
              </>
            )}
          </FormCard>

          <FormCard
            title="Assign recruiter"
            description="The recruiter owns intake, structure, and converting this to a job when approved."
          >
            <Field id="rk-rec" label="Recruiter">
              <select
                id="rk-rec"
                className="rk-select"
                value={assignedRecruiterId}
                onChange={e => setAssignedRecruiterId(e.target.value)}
                required
              >
                <option value="">Select a recruiter…</option>
                {recruiters.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.email})
                  </option>
                ))}
              </select>
            </Field>
            {recruiters.length === 0 ? (
              <p className="rk-inline-note rk-inline-note--warn">
                No workspace members have the <strong>recruiter</strong> role. Add one in Team / roles so you can
                assign this request.
              </p>
            ) : null}
          </FormCard>
        </div>
      </div>

      <footer className="rk-form-footer" aria-label="Form actions">
        <div className="rk-form-footer-inner">
          <Link to={base} className="rk-btn rk-btn-secondary">
            Cancel
          </Link>
          <button type="button" className="rk-btn rk-btn-primary" disabled={saving} onClick={() => void submit()}>
            {saving ? 'Saving…' : isEdit ? 'Resubmit request' : 'Submit request'}
          </button>
        </div>
      </footer>
    </div>
  )
}

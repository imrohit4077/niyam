import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { Link, useNavigate, useOutletContext, useParams, useSearchParams } from 'react-router-dom'
import { Icon, Icon3D } from '../icons'
import { stepIcon } from '../constants/stepIcons'
import { accountMembersApi } from '../api/accountMembers'
import { getOrganizationSettings, type OrganizationSettings } from '../api/accountOrganization'
import { fetchCountriesCatalog, type CountryRow } from '../api/reference'
import { hiringStageTemplatesApi, type HiringStageTemplateRow } from '../api/hiringStructure'
import { roleKickoffApi, type RoleKickoffSelectedStage } from '../api/roleKickoff'
import type { DashboardOutletContext } from '../layouts/DashboardOutletContext'
import { useToast } from '../contexts/ToastContext'
import { COMMON_CURRENCIES, normalizeCurrencyCode } from '../lib/currency'

const LEGACY_DEPT_PREFIX = '__legacy_dept__'
const LEGACY_LOC_PREFIX = '__legacy_loc__'

const KICKOFF_STEP_PARAM = 'step'

type KickoffStepId = 'role_details' | 'objectives' | 'skills' | 'compensation' | 'pipeline' | 'recruiter'

const KICKOFF_STEPS: {
  id: KickoffStepId
  label: string
  short: string
  railTitle: string
  railBody: string
}[] = [
  {
    id: 'role_details',
    label: 'Role details',
    short: 'Title, department, openings, location',
    railTitle: 'Define the role',
    railBody:
      'Core metadata so your recruiter knows what to open and where the role sits in your organization.',
  },
  {
    id: 'objectives',
    label: 'Objectives',
    short: 'Why hiring & success metrics',
    railTitle: 'Align on outcomes',
    railBody: 'Share business context, 30/60/90 milestones, and how you will measure success for this hire.',
  },
  {
    id: 'skills',
    label: 'Skills & experience',
    short: 'Must-haves, nice-to-haves, seniority',
    railTitle: 'Candidate profile',
    railBody: 'Tag required and preferred skills plus experience notes for screening and structured interviews.',
  },
  {
    id: 'compensation',
    label: 'Compensation',
    short: 'Salary range & budget notes',
    railTitle: 'Budget alignment',
    railBody: 'Indicative salary band and constraints—you can refine with your recruiter before the job is posted.',
  },
  {
    id: 'pipeline',
    label: 'Hiring pipeline',
    short: 'Interview stages & order',
    railTitle: 'Structured hiring',
    railBody: 'Choose workspace stage templates and set the order for this role’s interview flow.',
  },
  {
    id: 'recruiter',
    label: 'Recruiter',
    short: 'Who owns this kickoff',
    railTitle: 'Hand off',
    railBody: 'Assign the recruiter who will review, approve, and convert this request into a job.',
  },
]

function kickoffStepIndexFromSearch(raw: string | null): number {
  if (!raw) return 0
  const idx = KICKOFF_STEPS.findIndex(s => s.id === raw)
  return idx >= 0 ? idx : 0
}

function normalizeOrgForKickoff(row: OrganizationSettings): OrganizationSettings {
  return {
    ...row,
    departments: Array.isArray(row.departments) ? row.departments : [],
    enabled_country_codes: row.enabled_country_codes === undefined ? null : row.enabled_country_codes,
  }
}

function mergeUniqueSkills(existing: string[], incoming: string[]): string[] {
  const seen = new Set(existing.map(s => s.toLowerCase()))
  const out = [...existing]
  for (const raw of incoming) {
    const t = raw.trim()
    if (!t) continue
    const low = t.toLowerCase()
    if (seen.has(low)) continue
    seen.add(low)
    out.push(t)
  }
  return out
}

function splitSkillInput(s: string): string[] {
  return s
    .split(/[,;\n]+/)
    .flatMap(part => part.trim().split(/\s+/).filter(Boolean))
}

function commitFirstWord(draft: string): { committed: string[]; rest: string } {
  const combined = `${draft} `
  const m = combined.match(/^\s*(\S+)\s+(.*)$/)
  if (!m) return { committed: [], rest: draft }
  const first = m[1] ?? ''
  const rest = (m[2] ?? '').replace(/\s+$/, '')
  return { committed: first ? [first] : [], rest }
}

function currencyNarrowSymbol(code: string): string {
  const c = normalizeCurrencyCode(code)
  try {
    const parts = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: c,
      currencyDisplay: 'narrowSymbol',
    }).formatToParts(0)
    return parts.find(p => p.type === 'currency')?.value ?? c
  } catch {
    return c
  }
}

function KickoffField({
  id,
  label,
  hint,
  className,
  children,
}: {
  id?: string
  label: string
  hint?: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className={`job-editor-field${className ? ` ${className}` : ''}`}>
      <label className="job-editor-label" htmlFor={id}>
        {label}
      </label>
      {children}
      {hint ? <p className="job-editor-field-hint rk-field-hint">{hint}</p> : null}
    </div>
  )
}

function SkillChipsField({
  id,
  label,
  hint,
  chips,
  onChange,
  placeholder,
}: {
  id: string
  label: string
  hint?: string
  chips: string[]
  onChange: (next: string[]) => void
  placeholder?: string
}) {
  const [draft, setDraft] = useState('')

  const commitAllInDraft = useCallback(() => {
    const tokens = splitSkillInput(draft)
    if (!tokens.length) return
    onChange(mergeUniqueSkills(chips, tokens))
    setDraft('')
  }, [draft, chips, onChange])

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      commitAllInDraft()
      return
    }
    if (e.key === ' ') {
      if (!draft.trim()) return
      e.preventDefault()
      const { committed, rest } = commitFirstWord(draft)
      if (committed.length) onChange(mergeUniqueSkills(chips, committed))
      setDraft(rest)
      return
    }
    if (e.key === ',') {
      if (!draft.trim()) return
      e.preventDefault()
      onChange(mergeUniqueSkills(chips, splitSkillInput(`${draft},`)))
      setDraft('')
      return
    }
    if (e.key === 'Backspace' && !draft && chips.length) {
      e.preventDefault()
      onChange(chips.slice(0, -1))
    }
  }

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text')
    if (!text.trim()) return
    if (/[,;\n\t]/.test(text) || /\s{2,}/.test(text.trim())) {
      e.preventDefault()
      const tokens = splitSkillInput(text)
      if (tokens.length) onChange(mergeUniqueSkills(chips, tokens))
    }
  }

  const removeAt = (i: number) => {
    onChange(chips.filter((_, idx) => idx !== i))
  }

  return (
    <div className="job-editor-field">
      <label className="job-editor-label" htmlFor={id}>
        {label}
      </label>
      <div className="rkw-skill-chips rk-skill-chips" aria-label={label}>
        <div className="rkw-skill-chips-inner">
          {chips.map((c, i) => (
            <span key={`${c}-${i}`} className="rkw-skill-chip">
              <span className="rkw-skill-chip-text">{c}</span>
              <button
                type="button"
                className="rkw-skill-chip-remove"
                aria-label={`Remove ${c}`}
                onClick={() => removeAt(i)}
              >
                ×
              </button>
            </span>
          ))}
          <input
            id={id}
            className="rkw-skill-chips-input"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            onBlur={() => {
              if (draft.trim()) commitAllInDraft()
            }}
            placeholder={chips.length ? '' : placeholder ?? 'Add skills…'}
            autoComplete="off"
          />
        </div>
      </div>
      {hint ? <p className="job-editor-field-hint rk-field-hint">{hint}</p> : null}
    </div>
  )
}

export default function RoleKickoffFormPage() {
  const { token, accountId } = useOutletContext<DashboardOutletContext>()
  const { kickoffId } = useParams<{ kickoffId: string }>()
  const isEdit = Boolean(kickoffId)
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const toast = useToast()
  const base = `/account/${accountId}/jobs/role-kickoff`
  const aid = Number(accountId)

  const stepParamRaw = searchParams.get(KICKOFF_STEP_PARAM)
  const stepIndex = useMemo(() => kickoffStepIndexFromSearch(stepParamRaw), [stepParamRaw])
  const currentStep = KICKOFF_STEPS[stepIndex] ?? KICKOFF_STEPS[0]!
  const stepId = currentStep.id
  const isLastStep = stepIndex >= KICKOFF_STEPS.length - 1

  useEffect(() => {
    const canonicalId = KICKOFF_STEPS[stepIndex]?.id
    if (!canonicalId) return
    if (stepParamRaw !== canonicalId) {
      setSearchParams(
        prev => {
          const next = new URLSearchParams(prev)
          next.set(KICKOFF_STEP_PARAM, canonicalId)
          return next
        },
        { replace: true },
      )
    }
  }, [stepIndex, stepParamRaw, setSearchParams])

  const [recruiters, setRecruiters] = useState<{ id: number; name: string; email: string }[]>([])
  const [orgSettings, setOrgSettings] = useState<OrganizationSettings | null>(null)
  const [countriesCatalog, setCountriesCatalog] = useState<CountryRow[]>([])
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
  const [skillsMustChips, setSkillsMustChips] = useState<string[]>([])
  const [skillsNiceChips, setSkillsNiceChips] = useState<string[]>([])
  const [experienceNote, setExperienceNote] = useState('')
  const [salaryMin, setSalaryMin] = useState('')
  const [salaryMax, setSalaryMax] = useState('')
  const [salaryCurrency, setSalaryCurrency] = useState('USD')
  const [budgetNotes, setBudgetNotes] = useState('')
  const [assignedRecruiterId, setAssignedRecruiterId] = useState('')
  const [stageTemplates, setStageTemplates] = useState<HiringStageTemplateRow[]>([])
  const [selectedStages, setSelectedStages] = useState<RoleKickoffSelectedStage[]>([])

  const orgCurrencySeededRef = useRef(false)

  const accountDefaultCurrency = useMemo(
    () => normalizeCurrencyCode(orgSettings?.default_currency ?? 'USD'),
    [orgSettings?.default_currency],
  )

  const locationOptions = useMemo((): CountryRow[] => {
    const enabled = orgSettings?.enabled_country_codes
    if (!countriesCatalog.length) return []
    if (enabled === null || enabled === undefined) return countriesCatalog
    const allow = new Set(enabled)
    return countriesCatalog.filter(c => allow.has(c.code))
  }, [orgSettings, countriesCatalog])

  const departmentOptions = orgSettings?.departments ?? []

  const currencyOptions = useMemo(() => {
    const d = accountDefaultCurrency
    const rest = COMMON_CURRENCIES.filter(c => c !== d)
    const ordered = [d, ...rest]
    const seen = new Set(ordered)
    const cur = normalizeCurrencyCode(salaryCurrency)
    if (cur && !seen.has(cur)) return [cur, ...ordered]
    return ordered
  }, [accountDefaultCurrency, salaryCurrency])

  const salarySym = useMemo(() => currencyNarrowSymbol(salaryCurrency), [salaryCurrency])

  const deptSelectValue = useMemo(() => {
    const d = department.trim()
    if (!d) return ''
    if (departmentOptions.some(x => x.name === d)) return d
    return `${LEGACY_DEPT_PREFIX}${department}`
  }, [department, departmentOptions])

  const locSelectValue = useMemo(() => {
    const l = location.trim()
    if (!l) return ''
    if (locationOptions.some(c => c.name === l)) return l
    return `${LEGACY_LOC_PREFIX}${location}`
  }, [location, locationOptions])

  const goToStepIndex = useCallback(
    (idx: number) => {
      if (idx < 0 || idx >= KICKOFF_STEPS.length) return
      const id = KICKOFF_STEPS[idx]?.id
      if (!id) return
      setSearchParams(
        prev => {
          const next = new URLSearchParams(prev)
          next.set(KICKOFF_STEP_PARAM, id)
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const validateStep = useCallback(
    (id: KickoffStepId): string | null => {
      if (id === 'role_details' && !title.trim()) return 'Job title is required.'
      if (id === 'recruiter' && !assignedRecruiterId) return 'Please assign a recruiter.'
      return null
    },
    [title, assignedRecruiterId],
  )

  const goStep = useCallback(
    (delta: number) => {
      if (delta > 0) {
        const err = validateStep(stepId)
        if (err) {
          toast.error('Validation', err)
          return
        }
      }
      goToStepIndex(stepIndex + delta)
    },
    [validateStep, stepId, stepIndex, goToStepIndex, toast],
  )

  useEffect(() => {
    if (isEdit) {
      orgCurrencySeededRef.current = false
      return
    }
    if (!orgSettings) return
    if (orgCurrencySeededRef.current) return
    orgCurrencySeededRef.current = true
    setSalaryCurrency(accountDefaultCurrency)
  }, [isEdit, orgSettings, accountDefaultCurrency])

  useEffect(() => {
    let cancelled = false
    setLoadingMeta(true)
    Promise.all([
      accountMembersApi.list(token, { workspace_role: 'recruiter' }).catch(() => []),
      hiringStageTemplatesApi.list(token).catch(() => []),
      Number.isFinite(aid)
        ? getOrganizationSettings(token, aid)
            .then(o => normalizeOrgForKickoff(o))
            .catch(() => null)
        : Promise.resolve(null),
      fetchCountriesCatalog(token)
        .then(r => r.countries)
        .catch(() => []),
      isEdit && kickoffId
        ? roleKickoffApi.get(token, Number(kickoffId)).catch(() => null)
        : Promise.resolve(null),
    ])
      .then(([members, tpls, org, countries, row]) => {
        if (cancelled) return
        setRecruiters(members)
        setStageTemplates(Array.isArray(tpls) ? tpls : [])
        setOrgSettings(org)
        setCountriesCatalog(Array.isArray(countries) ? countries : [])
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
          setSkillsMustChips(Array.isArray(row.skills_must_have) ? [...row.skills_must_have] : [])
          setSkillsNiceChips(Array.isArray(row.skills_nice_to_have) ? [...row.skills_nice_to_have] : [])
          setExperienceNote(row.experience_note ?? '')
          setSalaryMin(row.salary_min != null ? String(row.salary_min) : '')
          setSalaryMax(row.salary_max != null ? String(row.salary_max) : '')
          setSalaryCurrency(normalizeCurrencyCode(row.salary_currency ?? 'USD'))
          setBudgetNotes(row.budget_notes ?? '')
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
  }, [token, isEdit, kickoffId, aid])

  const buildPayload = useCallback(() => {
    const smin = salaryMin.trim() ? Number(salaryMin) : null
    const smax = salaryMax.trim() ? Number(salaryMax) : null
    return {
      title: title.trim(),
      department: department.trim() || null,
      open_positions: openPositions.trim() ? Number(openPositions) : 1,
      location: location.trim() || null,
      why_hiring: whyHiring.trim() || null,
      expectation_30_60_90: expectation306090.trim() || null,
      success_definition: successDefinition.trim() || null,
      skills_must_have: skillsMustChips,
      skills_nice_to_have: skillsNiceChips,
      experience_note: experienceNote.trim() || null,
      salary_min: Number.isFinite(smin as number) ? smin : null,
      salary_max: Number.isFinite(smax as number) ? smax : null,
      salary_currency: normalizeCurrencyCode(salaryCurrency),
      budget_notes: budgetNotes.trim() || null,
      interview_rounds: null,
      interviewers_note: null,
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
    skillsMustChips,
    skillsNiceChips,
    experienceNote,
    salaryMin,
    salaryMax,
    salaryCurrency,
    budgetNotes,
    assignedRecruiterId,
    selectedStages,
  ])

  const templateById = useCallback(
    (id: number) => stageTemplates.find(t => t.id === id),
    [stageTemplates],
  )

  const unselectedStageTemplates = useMemo(
    () => stageTemplates.filter(tpl => !selectedStages.some(s => s.stage_template_id === tpl.id)),
    [stageTemplates, selectedStages],
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

  const handleProceed = () => {
    const err = validateStep(stepId)
    if (err) {
      toast.error('Validation', err)
      return
    }
    if (isLastStep) void submit()
    else goStep(1)
  }

  const deptSettingsPath = `/account/${accountId}/settings/organization`
  const stagesSettingsPath = `/account/${accountId}/structured-hiring/stages`

  if (loadingMeta) {
    return (
      <div className="job-editor-page job-editor-page--wizard job-editor-page--kickoff">
        <article className="job-editor-sheet job-editor-sheet--narrow" style={{ margin: '48px auto', textAlign: 'center' }}>
          <div className="spinner" aria-label="Loading" />
          <p style={{ marginTop: 12, color: 'var(--text-muted)' }}>Loading form…</p>
        </article>
      </div>
    )
  }

  if (loadErr) {
    return (
      <div className="job-editor-page job-editor-page--wizard job-editor-page--kickoff">
        <article className="job-editor-sheet job-editor-sheet--narrow" style={{ margin: '48px auto' }}>
          <p className="auth-error" style={{ marginBottom: 16 }}>
            {loadErr}
          </p>
          <Link to={base} className="job-editor-btn-outline" style={{ display: 'inline-block', textDecoration: 'none' }}>
            Back to role kickoff
          </Link>
        </article>
      </div>
    )
  }

  return (
    <div className="job-editor-page job-editor-page--wizard job-editor-page--kickoff">
      <nav className="job-editor-breadcrumb" aria-label="Breadcrumb">
        <button type="button" className="job-editor-crumb-link" onClick={() => navigate(base)}>
          Role kickoff
        </button>
        <span className="job-editor-crumb-arrow" aria-hidden>
          →
        </span>
        <span className="job-editor-crumb-current">{isEdit ? 'Update request' : 'New request'}</span>
      </nav>

      <div className="job-editor-split">
        <div className="job-editor-workspace">
          <article className="job-editor-sheet">
            <header className="job-editor-sheet-head">
              <Icon3D key={currentStep.id} name={stepIcon(currentStep.id)} size={56} tile className="job-editor-step-icon" />
              <div className="job-editor-sheet-titles">
                <p className="job-editor-step-kicker">
                  Step {stepIndex + 1} of {KICKOFF_STEPS.length}
                </p>
                <h1 className="job-editor-page-title">{currentStep.label}</h1>
                <p className="job-editor-page-sub">{currentStep.short}</p>
              </div>
              <div className="job-editor-sheet-head-actions">
                <Link to={base} className="job-editor-btn-outline" style={{ textDecoration: 'none' }}>
                  Cancel
                </Link>
                <button
                  type="button"
                  className="job-editor-btn-primary"
                  disabled={saving}
                  onClick={handleProceed}
                >
                  {saving ? 'Saving…' : isLastStep ? (isEdit ? 'Resubmit request' : 'Submit request') : 'Continue'}
                </button>
              </div>
            </header>

            <div className="job-editor-sheet-body job-editor-sheet-body--step">
              {stepId === 'role_details' && (
                <section className="job-step-pane job-basic-pane">
                  <div className="job-basic-section job-basic-section--first">
                    <h3 className="job-basic-section-title">Core details</h3>
                    <p className="job-basic-section-lead">
                      Title and org structure. Department and location follow your workspace settings.
                    </p>
                    <KickoffField id="rk-title" label="Job title" className="rk-field--title">
                      <input
                        id="rk-title"
                        className="job-editor-input job-editor-input--title"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="e.g. Senior Backend Engineer"
                        autoComplete="off"
                      />
                    </KickoffField>
                    <div className="rk-kickoff-role-grid">
                      <KickoffField
                        id="rk-dept"
                        label="Department"
                        className="rk-field--department"
                        hint={
                          departmentOptions.length
                            ? 'Workspace list (Settings → Organization).'
                            : undefined
                        }
                      >
                        {departmentOptions.length > 0 ? (
                          <select
                            id="rk-dept"
                            className="job-editor-select"
                            value={deptSelectValue}
                            onChange={e => {
                              const v = e.target.value
                              if (v === '') setDepartment('')
                              else if (v.startsWith(LEGACY_DEPT_PREFIX))
                                setDepartment(v.slice(LEGACY_DEPT_PREFIX.length))
                              else setDepartment(v)
                            }}
                          >
                            <option value="">Select department…</option>
                            {departmentOptions.map(d => (
                              <option key={d.id} value={d.name}>
                                {d.name}
                              </option>
                            ))}
                            {department.trim() && !departmentOptions.some(d => d.name === department) ? (
                              <option value={`${LEGACY_DEPT_PREFIX}${department}`}>{department} (current)</option>
                            ) : null}
                          </select>
                        ) : (
                          <>
                            <input
                              id="rk-dept"
                              className="job-editor-input"
                              value={department}
                              onChange={e => setDepartment(e.target.value)}
                              placeholder="Department name"
                              autoComplete="off"
                            />
                            <p className="job-editor-field-hint">
                              No departments configured.{' '}
                              <Link to={deptSettingsPath}>Organization settings</Link>.
                            </p>
                          </>
                        )}
                      </KickoffField>
                      <KickoffField id="rk-openings" label="Openings" className="rk-field--openings">
                        <input
                          id="rk-openings"
                          className="job-editor-input"
                          type="number"
                          min={1}
                          value={openPositions}
                          onChange={e => setOpenPositions(e.target.value)}
                        />
                      </KickoffField>
                      <KickoffField
                        id="rk-loc"
                        label="Location"
                        className="rk-field--location"
                        hint={
                          locationOptions.length
                            ? 'Enabled countries (Settings → Organization).'
                            : undefined
                        }
                      >
                        {locationOptions.length > 0 ? (
                          <select
                            id="rk-loc"
                            className="job-editor-select"
                            value={locSelectValue}
                            onChange={e => {
                              const v = e.target.value
                              if (v === '') setLocation('')
                              else if (v.startsWith(LEGACY_LOC_PREFIX))
                                setLocation(v.slice(LEGACY_LOC_PREFIX.length))
                              else setLocation(v)
                            }}
                          >
                            <option value="">Select location…</option>
                            {locationOptions.map(c => (
                              <option key={c.code} value={c.name}>
                                {c.name}
                              </option>
                            ))}
                            {location.trim() && !locationOptions.some(c => c.name === location) ? (
                              <option value={`${LEGACY_LOC_PREFIX}${location}`}>{location} (current)</option>
                            ) : null}
                          </select>
                        ) : (
                          <>
                            <input
                              id="rk-loc"
                              className="job-editor-input"
                              value={location}
                              onChange={e => setLocation(e.target.value)}
                              placeholder="City, region, or remote"
                              autoComplete="off"
                            />
                            <p className="job-editor-field-hint">
                              Country list unavailable.{' '}
                              <Link to={deptSettingsPath}>Organization settings</Link>.
                            </p>
                          </>
                        )}
                      </KickoffField>
                    </div>
                  </div>
                </section>
              )}

              {stepId === 'objectives' && (
                <section className="job-step-pane job-basic-pane">
                  <div className="job-basic-section job-basic-section--first">
                    <h3 className="job-basic-section-title">Hiring objectives</h3>
                    <p className="job-basic-section-lead">
                      Help your recruiter understand why this role exists and what success looks like in the first
                      months.
                    </p>
                    <div className="rk-kickoff-stack">
                      <KickoffField id="rk-why" label="Why we are hiring">
                        <textarea
                          id="rk-why"
                          className="job-editor-input"
                          value={whyHiring}
                          onChange={e => setWhyHiring(e.target.value)}
                          rows={4}
                          placeholder="Business need, gap, or outcome…"
                        />
                      </KickoffField>
                      <KickoffField id="rk-306090" label="30 / 60 / 90 day expectations">
                        <textarea
                          id="rk-306090"
                          className="job-editor-input"
                          value={expectation306090}
                          onChange={e => setExpectation306090(e.target.value)}
                          rows={4}
                          placeholder="Milestones for the first quarter…"
                        />
                      </KickoffField>
                      <KickoffField id="rk-success" label="Definition of success">
                        <textarea
                          id="rk-success"
                          className="job-editor-input"
                          value={successDefinition}
                          onChange={e => setSuccessDefinition(e.target.value)}
                          rows={3}
                          placeholder="How we will know this hire worked…"
                        />
                      </KickoffField>
                    </div>
                  </div>
                </section>
              )}

              {stepId === 'skills' && (
                <section className="job-step-pane">
                  <p className="job-editor-step-lead">
                    Add skills with Space, comma, or Enter. Paste comma-separated lists to add many at once.
                  </p>
                  <div className="rk-kickoff-stack">
                    <SkillChipsField
                      id="rk-must"
                      label="Must-have skills"
                      hint="Paste comma-separated lists. Backspace removes the last tag."
                      chips={skillsMustChips}
                      onChange={setSkillsMustChips}
                      placeholder="TypeScript, system design…"
                    />
                    <SkillChipsField
                      id="rk-nice"
                      label="Nice-to-have skills"
                      chips={skillsNiceChips}
                      onChange={setSkillsNiceChips}
                      placeholder="Optional…"
                    />
                    <KickoffField id="rk-exp" label="Experience">
                      <textarea
                        id="rk-exp"
                        className="job-editor-input"
                        value={experienceNote}
                        onChange={e => setExperienceNote(e.target.value)}
                        rows={3}
                        placeholder="Years, seniority, domain…"
                      />
                    </KickoffField>
                  </div>
                </section>
              )}

              {stepId === 'compensation' && (
                <section className="job-step-pane job-compensation-pane">
                  <div className="job-compensation-card">
                    <div className="job-compensation-card-head">
                      <h2 className="job-compensation-card-title">Salary range</h2>
                      <p className="job-compensation-card-lead">
                        Indicative band in {normalizeCurrencyCode(salaryCurrency)}. Workspace default:{' '}
                        {accountDefaultCurrency}.
                      </p>
                    </div>
                    <div className="job-compensation-grid job-editor-grid-2 rk-kickoff-salary-grid">
                      <KickoffField id="rk-smin" label="Minimum" hint={`Shown with ${salarySym} prefix.`}>
                        <div className="rk-salary-symbol-wrap">
                          <span className="rk-salary-symbol" aria-hidden>
                            {salarySym}
                          </span>
                          <input
                            id="rk-smin"
                            className="job-editor-input job-editor-input--salary rk-salary-input"
                            type="number"
                            value={salaryMin}
                            onChange={e => setSalaryMin(e.target.value)}
                            placeholder="—"
                          />
                        </div>
                      </KickoffField>
                      <KickoffField id="rk-smax" label="Maximum">
                        <div className="rk-salary-symbol-wrap">
                          <span className="rk-salary-symbol" aria-hidden>
                            {salarySym}
                          </span>
                          <input
                            id="rk-smax"
                            className="job-editor-input job-editor-input--salary rk-salary-input"
                            type="number"
                            value={salaryMax}
                            onChange={e => setSalaryMax(e.target.value)}
                            placeholder="—"
                          />
                        </div>
                      </KickoffField>
                      <KickoffField id="rk-cur" label="Currency">
                        <select
                          id="rk-cur"
                          className="job-editor-select job-compensation-select"
                          value={normalizeCurrencyCode(salaryCurrency)}
                          onChange={e => setSalaryCurrency(e.target.value)}
                        >
                          {currencyOptions.map(code => (
                            <option key={code} value={code}>
                              {code}
                            </option>
                          ))}
                        </select>
                      </KickoffField>
                    </div>
                    <div className="job-compensation-divider" aria-hidden />
                    <KickoffField id="rk-budget" label="Budget notes">
                      <textarea
                        id="rk-budget"
                        className="job-editor-input job-compensation-textarea"
                        value={budgetNotes}
                        onChange={e => setBudgetNotes(e.target.value)}
                        rows={3}
                        placeholder="Optional: band, equity, approval status, constraints…"
                      />
                    </KickoffField>
                  </div>
                </section>
              )}

              {stepId === 'pipeline' && (
                <section className="job-step-pane">
                  <p className="job-editor-step-lead">
                    Choose interview stages from your workspace templates and set their order. Scorecard attributes use
                    each template’s defaults.
                  </p>
                  {stageTemplates.length === 0 ? (
                    <div className="job-editor-callout job-editor-callout--info">
                      <p className="job-editor-callout-title">No stage templates</p>
                      <p style={{ margin: 0, fontSize: 14 }}>
                        <Link to={stagesSettingsPath}>Configure stages</Link> in Structured hiring before building a
                        pipeline.
                      </p>
                    </div>
                  ) : (
                    <div className="rkw-pipeline-panel">
                      {selectedStages.length > 0 ? (
                        <>
                          <div className="rkw-pipeline-panel-h">Pipeline order</div>
                          <ol className="rkw-pipeline-steps" aria-label="Ordered stages">
                            {selectedStages.map((s, i) => {
                              const tpl = templateById(s.stage_template_id)
                              return (
                                <li key={s.stage_template_id} className="rkw-pipeline-step">
                                  <span className="rkw-pipeline-step-idx">{i + 1}</span>
                                  <span className="rkw-pipeline-step-name">
                                    {tpl?.name ?? `Stage #${s.stage_template_id}`}
                                  </span>
                                  <div className="rkw-pipeline-step-actions">
                                    <button
                                      type="button"
                                      className="rkw-tool-btn"
                                      disabled={i === 0}
                                      aria-label="Move up"
                                      onClick={() => moveStage(i, -1)}
                                    >
                                      ↑
                                    </button>
                                    <button
                                      type="button"
                                      className="rkw-tool-btn"
                                      disabled={i === selectedStages.length - 1}
                                      aria-label="Move down"
                                      onClick={() => moveStage(i, 1)}
                                    >
                                      ↓
                                    </button>
                                    <button
                                      type="button"
                                      className="rkw-text-btn"
                                      onClick={() => toggleStageTemplate(s.stage_template_id)}
                                    >
                                      Remove
                                    </button>
                                  </div>
                                </li>
                              )
                            })}
                          </ol>
                        </>
                      ) : (
                        <p className="job-editor-field-hint" style={{ marginBottom: 12 }}>
                          Add one or more stages to define the interview flow.
                        </p>
                      )}
                      {unselectedStageTemplates.length > 0 ? (
                        <div className="rkw-pipeline-add">
                          <div className="rkw-pipeline-panel-h">Add stages</div>
                          <div className="rkw-pipeline-add-list">
                            {unselectedStageTemplates.map(tpl => (
                              <button
                                key={tpl.id}
                                type="button"
                                className="rkw-pipeline-add-btn"
                                onClick={() => toggleStageTemplate(tpl.id)}
                              >
                                + {tpl.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : selectedStages.length > 0 ? (
                        <p className="job-editor-field-hint">All workspace stage templates are included.</p>
                      ) : null}
                    </div>
                  )}
                </section>
              )}

              {stepId === 'recruiter' && (
                <section className="job-step-pane job-basic-pane">
                  <div className="job-basic-section job-basic-section--first">
                    <h3 className="job-basic-section-title">Assigned recruiter</h3>
                    <p className="job-basic-section-lead">
                      Who reviews this kickoff, requests changes if needed, and converts it into a job when approved.
                    </p>
                    <KickoffField id="rk-rec" label="Recruiter">
                      <select
                        id="rk-rec"
                        className="job-editor-select"
                        value={assignedRecruiterId}
                        onChange={e => setAssignedRecruiterId(e.target.value)}
                        required
                      >
                        <option value="">Select recruiter…</option>
                        {recruiters.map(r => (
                          <option key={r.id} value={r.id}>
                            {r.name} — {r.email}
                          </option>
                        ))}
                      </select>
                    </KickoffField>
                    {recruiters.length === 0 ? (
                      <div className="job-editor-callout job-editor-callout--info" style={{ marginTop: 16 }}>
                        <p style={{ margin: 0, fontSize: 14 }}>
                          No members with the <strong>recruiter</strong> workspace role. Add one in Team settings.
                        </p>
                      </div>
                    ) : null}
                  </div>
                </section>
              )}
            </div>
          </article>
        </div>

        <aside className="job-editor-rail" aria-label="Role kickoff steps">
          <div className="job-editor-rail-inner">
            <h2 className="job-rail-heading">Setup</h2>
            <ol className="job-stepper job-stepper--connected" role="list">
              {KICKOFF_STEPS.map((s, idx) => {
                const done = idx < stepIndex
                const active = idx === stepIndex
                return (
                  <li key={s.id} className="job-stepper-item">
                    <button
                      type="button"
                      className={`job-stepper-btn ${active ? 'job-stepper-btn--active' : ''} ${done ? 'job-stepper-btn--done' : ''}`}
                      onClick={() => {
                        if (idx > stepIndex) {
                          const err = validateStep(stepId)
                          if (err) {
                            toast.error('Validation', err)
                            return
                          }
                        }
                        goToStepIndex(idx)
                      }}
                    >
                      <span className="job-stepper-index">{done ? <Icon name="check" size={13} strokeWidth={2.6} /> : idx + 1}</span>
                      <span className="job-stepper-text">
                        <span className="job-stepper-label">{s.label}</span>
                        <span className="job-stepper-short">{s.short}</span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ol>

            <div className="job-rail-callout">
              Six steps before submit: role basics, objectives, skills, compensation, pipeline, then recruiter
              assignment.
            </div>

            <div className="job-rail-context">
              <h3 className="job-rail-context-title">{currentStep.railTitle}</h3>
              <p className="job-rail-context-body">{currentStep.railBody}</p>
            </div>

            <button
              type="button"
              className="job-rail-cta"
              onClick={handleProceed}
              disabled={saving}
            >
              {saving ? 'Saving…' : isLastStep ? (isEdit ? 'Resubmit request' : 'Submit request') : 'Continue'}
            </button>

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
                className="job-rail-nav-btn job-rail-nav-btn--ghost job-rail-nav-btn--next"
                onClick={() => goStep(1)}
                disabled={stepIndex >= KICKOFF_STEPS.length - 1}
              >
                Next
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

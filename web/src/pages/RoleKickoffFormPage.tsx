import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react'
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom'
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

const STEPS = [
  { id: 'details', label: 'Role details' },
  { id: 'objectives', label: 'Objectives' },
  { id: 'skills', label: 'Skills & comp' },
  { id: 'pipeline', label: 'Pipeline & recruiter' },
] as const

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

function RkwSvg({ children }: { children: ReactNode }) {
  return (
    <svg
      className="rkw-ico"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  )
}

const RkwSection = forwardRef<
  HTMLElement,
  {
    id?: string
    icon: ReactNode
    title: string
    description?: string
    children: ReactNode
  }
>(function RkwSection({ id, icon, title, description, children }, ref) {
  return (
    <section ref={ref} className="rkw-section" id={id}>
      <div className="rkw-section-head">
        <span className="rkw-section-icon-wrap">{icon}</span>
        <div className="rkw-section-titles">
          <h2 className="rkw-section-title">{title}</h2>
          {description ? <p className="rkw-section-desc">{description}</p> : null}
        </div>
      </div>
      <div className="rkw-section-body">{children}</div>
    </section>
  )
})

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
    <div className="rkw-field">
      <label className="rkw-label" htmlFor={id}>
        {label}
      </label>
      {children}
      {hint ? <p className="rkw-hint">{hint}</p> : null}
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
    <div className="rkw-field">
      <label className="rkw-label" htmlFor={id}>
        {label}
      </label>
      <div className="rkw-skill-chips" aria-label={label}>
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
      {hint ? <p className="rkw-hint">{hint}</p> : null}
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
  const aid = Number(accountId)

  const refDetails = useRef<HTMLElement | null>(null)
  const refObjectives = useRef<HTMLElement | null>(null)
  const refSkills = useRef<HTMLElement | null>(null)
  const refPipelineWrap = useRef<HTMLDivElement | null>(null)
  const anchorRefs: (RefObject<HTMLElement | null> | RefObject<HTMLDivElement | null>)[] = [
    refDetails,
    refObjectives,
    refSkills,
    refPipelineWrap,
  ]
  const [activeStep, setActiveStep] = useState(0)

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

  const scrollToStep = (index: number) => {
    setActiveStep(index)
    anchorRefs[index]?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

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

  const deptSettingsPath = `/account/${accountId}/settings/organization`
  const stagesSettingsPath = `/account/${accountId}/structured-hiring/stages`

  if (loadingMeta) {
    return (
      <div className="rkw-page rkw-page--loading">
        <div className="rkw-card rkw-card--narrow">
          <div className="spinner" aria-label="Loading" />
          <p>Loading form…</p>
        </div>
      </div>
    )
  }

  if (loadErr) {
    return (
      <div className="rkw-page">
        <div className="rkw-card rkw-card--narrow">
          <p className="rkw-alert-text">{loadErr}</p>
          <Link to={base} className="rkw-btn rkw-btn-secondary">
            Back to role kickoff
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="rkw-page">
      <div className="rkw-card">
        <header className="rkw-hero">
          <Link to={base} className="rkw-back">
            &lt; Back to Role Kickoff
          </Link>
          <h1 className="rkw-title">{isEdit ? 'Update role kickoff' : 'New Role Kickoff'}</h1>
          <p className="rkw-lead">
            Align with your recruiter on the role, outcomes, and hiring process before the job exists. Department,
            location, and currency follow your workspace settings.
          </p>

          <nav className="rkw-stepper" aria-label="Form sections">
            {STEPS.map((s, i) => (
              <button
                key={s.id}
                type="button"
                className={`rkw-step${activeStep === i ? ' rkw-step--active' : ''}`}
                onClick={() => scrollToStep(i)}
              >
                <span className="rkw-step-num">{i + 1}.</span>
                <span className="rkw-step-label">{s.label}</span>
              </button>
            ))}
          </nav>
        </header>

        <div className="rkw-grid">
          <div className="rkw-col rkw-col--left">
            <RkwSection
              ref={refDetails}
              id="rkw-sec-details"
              icon={
                <RkwSvg>
                  <path d="M4 21V8l8-5 8 5v13" />
                  <path d="M4 21h16" />
                  <path d="M9 21v-4h6v4" />
                  <path d="M9 13h6" />
                </RkwSvg>
              }
              title="Role"
              description="Title, org structure, and where this role sits."
            >
              <div className="rkw-field-stack">
                <Field id="rkw-title" label="Job title">
                  <input
                    id="rkw-title"
                    className="rkw-input"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. Senior Backend Engineer"
                    autoComplete="off"
                  />
                </Field>
                <Field
                  id="rkw-dept"
                  label="Department"
                  hint={
                    departmentOptions.length
                      ? 'Workspace departments. Values show in the list below.'
                      : undefined
                  }
                >
                  {departmentOptions.length > 0 ? (
                    <div className="rkw-input-icon-wrap">
                      <span className="rkw-input-icon" aria-hidden>
                        <RkwSvg>
                          <path d="M4 21V8l8-5 8 5v13" />
                          <path d="M9 13h6" />
                        </RkwSvg>
                      </span>
                      <select
                        id="rkw-dept"
                        className="rkw-select rkw-select--pad-icon"
                        value={deptSelectValue}
                        onChange={e => {
                          const v = e.target.value
                          if (v === '') setDepartment('')
                          else if (v.startsWith(LEGACY_DEPT_PREFIX)) setDepartment(v.slice(LEGACY_DEPT_PREFIX.length))
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
                    </div>
                  ) : (
                    <>
                      <input
                        id="rkw-dept"
                        className="rkw-input"
                        value={department}
                        onChange={e => setDepartment(e.target.value)}
                        placeholder="Department name"
                        autoComplete="off"
                      />
                      <p className="rkw-hint">
                        No departments configured.{' '}
                        <Link to={deptSettingsPath}>Organization settings</Link>.
                      </p>
                    </>
                  )}
                </Field>
                <Field id="rkw-openings" label="Openings">
                  <input
                    id="rkw-openings"
                    className="rkw-input"
                    type="number"
                    min={1}
                    value={openPositions}
                    onChange={e => setOpenPositions(e.target.value)}
                  />
                </Field>
                <Field
                  id="rkw-loc"
                  label="Location"
                  hint={
                    locationOptions.length ? 'Enabled countries for your workspace. Pick from the list.' : undefined
                  }
                >
                  {locationOptions.length > 0 ? (
                    <div className="rkw-input-icon-wrap">
                      <span className="rkw-input-icon" aria-hidden>
                        <RkwSvg>
                          <path d="M12 21s7-4.35 7-10a7 7 0 1 0-14 0c0 5.65 7 10 7 10z" />
                          <circle cx="12" cy="11" r="2.25" />
                        </RkwSvg>
                      </span>
                      <select
                        id="rkw-loc"
                        className="rkw-select rkw-select--pad-icon"
                        value={locSelectValue}
                        onChange={e => {
                          const v = e.target.value
                          if (v === '') setLocation('')
                          else if (v.startsWith(LEGACY_LOC_PREFIX)) setLocation(v.slice(LEGACY_LOC_PREFIX.length))
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
                    </div>
                  ) : (
                    <>
                      <input
                        id="rkw-loc"
                        className="rkw-input"
                        value={location}
                        onChange={e => setLocation(e.target.value)}
                        placeholder="City, region, or remote"
                        autoComplete="off"
                      />
                      <p className="rkw-hint">
                        Country list unavailable. <Link to={deptSettingsPath}>Organization settings</Link>.
                      </p>
                    </>
                  )}
                </Field>
              </div>
            </RkwSection>

            <RkwSection
              ref={refObjectives}
              id="rkw-sec-objectives"
              icon={
                <RkwSvg>
                  <circle cx="12" cy="12" r="9" />
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
                </RkwSvg>
              }
              title="Objective"
              description="Why this hire exists and what success looks like."
            >
              <div className="rkw-field-stack">
                <Field id="rkw-why" label="Why we are hiring">
                  <textarea
                    id="rkw-why"
                    className="rkw-textarea"
                    value={whyHiring}
                    onChange={e => setWhyHiring(e.target.value)}
                    rows={4}
                    placeholder="Business need, gap, or outcome…"
                  />
                </Field>
                <Field id="rkw-306090" label="30 / 60 / 90 day expectations">
                  <textarea
                    id="rkw-306090"
                    className="rkw-textarea"
                    value={expectation306090}
                    onChange={e => setExpectation306090(e.target.value)}
                    rows={4}
                    placeholder="Milestones for the first quarter…"
                  />
                </Field>
                <Field id="rkw-success" label="Definition of success">
                  <textarea
                    id="rkw-success"
                    className="rkw-textarea"
                    value={successDefinition}
                    onChange={e => setSuccessDefinition(e.target.value)}
                    rows={3}
                    placeholder="How we will know this hire worked…"
                  />
                </Field>
              </div>
            </RkwSection>
          </div>

          <div className="rkw-col rkw-col--right">
            <RkwSection
              ref={refSkills}
              id="rkw-sec-skills"
              icon={
                <RkwSvg>
                  <rect x="3" y="7" width="18" height="13" rx="2" />
                  <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </RkwSvg>
              }
              title="Skills & experience"
              description="Must-haves vs nice-to-haves; add tags with Space, comma, or Enter."
            >
              <div className="rkw-field-stack">
                <SkillChipsField
                  id="rkw-must"
                  label="Must-have skills"
                  hint="Paste comma-separated lists. Backspace removes the last tag."
                  chips={skillsMustChips}
                  onChange={setSkillsMustChips}
                  placeholder="TypeScript, system design…"
                />
                <SkillChipsField
                  id="rkw-nice"
                  label="Nice-to-have skills"
                  chips={skillsNiceChips}
                  onChange={setSkillsNiceChips}
                  placeholder="Optional…"
                />
                <Field id="rkw-exp" label="Experience">
                  <textarea
                    id="rkw-exp"
                    className="rkw-textarea rkw-textarea--sm"
                    value={experienceNote}
                    onChange={e => setExperienceNote(e.target.value)}
                    rows={2}
                    placeholder="Years, seniority, domain…"
                  />
                </Field>
              </div>
            </RkwSection>

            <RkwSection
              icon={
                <RkwSvg>
                  <circle cx="8" cy="8" r="3" />
                  <circle cx="16" cy="8" r="3" />
                  <path d="M5 18c.5-2.5 3-4 7-4s6.5 1.5 7 4" />
                </RkwSvg>
              }
              title="Compensation"
              description="Indicative range; you can refine this with your recruiter."
            >
              <div className="rkw-comp-panel">
                <div className="rkw-comp-panel-title">Salary range</div>
                <div className="rkw-salary-grid">
                  <Field id="rkw-smin" label="Minimum">
                    <div className="rkw-input-symbol">
                      <span className="rkw-input-symbol-char" aria-hidden>
                        {salarySym}
                      </span>
                      <input
                        id="rkw-smin"
                        className="rkw-input rkw-input--symbol"
                        type="number"
                        value={salaryMin}
                        onChange={e => setSalaryMin(e.target.value)}
                        placeholder="—"
                      />
                    </div>
                  </Field>
                  <Field id="rkw-smax" label="Maximum">
                    <div className="rkw-input-symbol">
                      <span className="rkw-input-symbol-char" aria-hidden>
                        {salarySym}
                      </span>
                      <input
                        id="rkw-smax"
                        className="rkw-input rkw-input--symbol"
                        type="number"
                        value={salaryMax}
                        onChange={e => setSalaryMax(e.target.value)}
                        placeholder="—"
                      />
                    </div>
                  </Field>
                  <Field id="rkw-cur" label="Currency">
                    <select
                      id="rkw-cur"
                      className="rkw-select"
                      value={normalizeCurrencyCode(salaryCurrency)}
                      onChange={e => setSalaryCurrency(e.target.value)}
                    >
                      {currencyOptions.map(code => (
                        <option key={code} value={code}>
                          {code}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              </div>
              <Field id="rkw-budget" label="Budget notes">
                <textarea
                  id="rkw-budget"
                  className="rkw-textarea rkw-textarea--sm"
                  value={budgetNotes}
                  onChange={e => setBudgetNotes(e.target.value)}
                  rows={3}
                  placeholder="Optional: band, equity, approval status, constraints…"
                />
              </Field>
            </RkwSection>

            <div ref={refPipelineWrap} className="rkw-anchor-stack" id="rkw-sec-pipeline">
            <RkwSection
              icon={
                <RkwSvg>
                  <circle cx="5" cy="12" r="2.5" />
                  <circle cx="12" cy="12" r="2.5" />
                  <circle cx="19" cy="12" r="2.5" />
                  <path d="M7.5 12h3M14.5 12h2.5" />
                </RkwSvg>
              }
              title="Structured hiring pipeline"
              description="Choose stages once, set order here. Scorecard attributes use each template’s defaults."
            >
              {stageTemplates.length === 0 ? (
                <p className="rkw-inline-note">
                  No stage templates. <Link to={stagesSettingsPath}>Configure stages</Link> first.
                </p>
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
                    <p className="rkw-hint rkw-hint--mb">Add one or more stages to define the interview flow.</p>
                  )}
                  {unselectedStageTemplates.length > 0 ? (
                    <div className="rkw-pipeline-add">
                      <div className="rkw-pipeline-add-h">Add stages</div>
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
                    <p className="rkw-hint rkw-hint--tight">All workspace stage templates are included.</p>
                  ) : null}
                </div>
              )}
            </RkwSection>

            <RkwSection
              icon={
                <RkwSvg>
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </RkwSvg>
              }
              title="Recruiter"
              description="Who converts this request into a job when approved."
            >
              <Field id="rkw-rec" label="Assigned recruiter">
                <select
                  id="rkw-rec"
                  className="rkw-select"
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
              </Field>
              {recruiters.length === 0 ? (
                <p className="rkw-inline-note rkw-inline-note--warn">
                  No members with the <strong>recruiter</strong> role. Add one in Team.
                </p>
              ) : null}
            </RkwSection>
            </div>
          </div>
        </div>
      </div>

      <footer className="rkw-footer">
        <div className="rkw-footer-inner">
          <Link to={base} className="rkw-btn rkw-btn-secondary">
            Cancel
          </Link>
          <button type="button" className="rkw-btn rkw-btn-primary" disabled={saving} onClick={() => void submit()}>
            {saving ? 'Saving…' : isEdit ? 'Resubmit request' : 'Submit request'}
          </button>
        </div>
      </footer>
    </div>
  )
}

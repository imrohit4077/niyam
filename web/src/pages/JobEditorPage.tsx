import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useNavigate, useOutletContext, useParams, useLocation, useSearchParams } from 'react-router-dom'
import { jobsApi, type Job, type JobAnalytics, type JobAttachment, type JobConfig, type JobReferralSettings } from '../api/jobs'
import { referralsApi } from '../api/referrals'
import { accountMembersApi, type AccountMember } from '../api/accountMembers'
import { boardsApi, type JobBoard } from '../api/boards'
import { pipelineStagesApi, type PipelineStage } from '../api/pipelineStages'
import { interviewPlansApi, type InterviewPlan } from '../api/interviewPlans'
import { useToast } from '../contexts/ToastContext'
import type { DashboardOutletContext } from '../layouts/DashboardOutletContext'
import RichTextEditor from '../components/RichTextEditor'
import CustomAttributeFields from '../components/CustomAttributeFields'
import LabelMultiSelect from '../components/LabelMultiSelect'
import { customAttributesApi, type CustomAttributeDefinition } from '../api/customAttributes'
import { labelsApi, type AccountLabelRow } from '../api/labels'
import { getOrganizationSettings, type OrganizationSettings } from '../api/accountOrganization'
import { fetchCountriesCatalog, type CountryRow } from '../api/reference'

function normalizeOrgSettings(row: OrganizationSettings): OrganizationSettings {
  return {
    ...row,
    departments: Array.isArray(row.departments) ? row.departments : [],
    enabled_country_codes:
      row.enabled_country_codes === undefined ? null : row.enabled_country_codes,
  }
}

type JobStepId =
  | 'basic_info'
  | 'skills'
  | 'compensation'
  | 'referral'
  | 'hiring_team'
  | 'pipeline'
  | 'interview'
  | 'evaluation'
  | 'posting'
  | 'automation'
  | 'analytics'
  | 'attachments'
  | 'permissions'
  | 'compliance'

const JOB_EDITOR_STEP_PARAM = 'step'

function stepIndexFromSearch(visible: readonly { id: JobStepId }[], raw: string | null): number {
  if (!raw) return 0
  const id = raw as JobStepId
  if (!visible.some(s => s.id === id)) return 0
  return visible.findIndex(s => s.id === id)
}

const ALL_STEP_DEFS: {
  id: JobStepId
  label: string
  short: string
  railTitle: string
  railBody: string
}[] = [
  {
    id: 'basic_info',
    label: 'Basic Job Info',
    short: 'Title, location, description',
    railTitle: 'Anchor the requisition',
    railBody: 'Core metadata and rich posting copy. Add required and nice-to-have skills on the next step.',
  },
  {
    id: 'skills',
    label: 'Skills',
    short: 'Required & nice-to-have',
    railTitle: 'Signal for matching',
    railBody: 'Required and nice-to-have skills feed matching, screening, and scorecards for this requisition.',
  },
  {
    id: 'compensation',
    label: 'Compensation & budget',
    short: 'Salary, bonus, finance IDs',
    railTitle: 'Finance alignment',
    railBody: 'Salary bands and budget metadata help approvals and cost tracking.',
  },
  {
    id: 'referral',
    label: 'Employee referrals',
    short: 'Bonus rules & share link',
    railTitle: 'Referral program',
    railBody:
      'Bonus amount, probation window, and minimum referrer tenure. Employees copy a unique ?ref= link for this job.',
  },
  {
    id: 'hiring_team',
    label: 'Hiring team',
    short: 'Manager, recruiter, panel',
    railTitle: 'Ownership',
    railBody: 'Clear owners for the req. Interview rounds and panel automation are configured in Interview setup.',
  },
  {
    id: 'pipeline',
    label: 'Hiring pipeline',
    short: 'Stages & automation rules',
    railTitle: 'ATS engine',
    railBody: 'Per-stage rules: auto-move and required feedback before advancing.',
  },
  {
    id: 'interview',
    label: 'Interview configuration',
    short: 'Rounds, kits, duration, format',
    railTitle: 'Structured interviews',
    railBody: 'Round names, kits, duration, and online/offline format. Tie rounds to pipeline stages.',
  },
  {
    id: 'evaluation',
    label: 'Evaluation & scorecards',
    short: 'Rubric & templates',
    railTitle: 'Consistent signal',
    railBody: 'Job-wide scorecard attributes plus template notes and mandatory fields.',
  },
  {
    id: 'posting',
    label: 'Posting & visibility',
    short: 'Boards, fields, visibility',
    railTitle: 'Where candidates apply',
    railBody: 'Which boards, internal vs external, and which application fields to collect.',
  },
  {
    id: 'automation',
    label: 'Automation & AI',
    short: 'Screening, emails, SLAs',
    railTitle: 'Scale the workflow',
    railBody: 'Rules and triggers are stored on the job; wire them to workers when ready.',
  },
  {
    id: 'analytics',
    label: 'Analytics & tracking',
    short: 'Applicants, funnel, sources',
    railTitle: 'Measure the funnel',
    railBody: 'Live counts from applications on this job—no manual entry.',
  },
  {
    id: 'attachments',
    label: 'Attachments',
    short: 'JD PDF, templates',
    railTitle: 'Supporting docs',
    railBody: 'Link files (URLs) to the requisition for hiring team reference.',
  },
  {
    id: 'permissions',
    label: 'Permissions',
    short: 'Who can view / move / score',
    railTitle: 'Access control',
    railBody: 'Account members who can view, edit, move candidates, or submit feedback.',
  },
  {
    id: 'compliance',
    label: 'Compliance & metadata',
    short: 'EEO, requisition ID, tags',
    railTitle: 'Governance',
    railBody: 'Requisition ID, compliance notes, approval narrative, and searchable tags.',
  },
]

const NEW_JOB_STEPS: JobStepId[] = ['basic_info', 'skills', 'compensation', 'hiring_team']

function defaultJobConfig(): JobConfig {
  return {
    skills_required: [],
    skills_nice: [],
    interview_defaults: {},
    evaluation: {},
    posting: {
      visibility: 'internal',
      job_board_ids: [],
      application_fields: { resume: true, portfolio: false, cover_letter: true, linkedin: false },
    },
    automation: {},
    permissions: {
      view_user_ids: [],
      edit_user_ids: [],
      move_user_ids: [],
      feedback_user_ids: [],
    },
    compliance: {},
  }
}

function mergeLoadedJobConfig(raw: JobConfig | undefined): JobConfig {
  const base = defaultJobConfig()
  if (!raw || typeof raw !== 'object') return base
  return {
    ...base,
    ...raw,
    interview_defaults: { ...base.interview_defaults, ...(raw.interview_defaults || {}) },
    evaluation: { ...base.evaluation, ...(raw.evaluation || {}) },
    posting: {
      ...base.posting,
      ...(raw.posting || {}),
      job_board_ids: raw.posting?.job_board_ids ?? base.posting?.job_board_ids ?? [],
      application_fields: {
        ...base.posting?.application_fields,
        ...(raw.posting?.application_fields || {}),
      },
    },
    automation: { ...base.automation, ...(raw.automation || {}) },
    permissions: { ...base.permissions, ...(raw.permissions || {}) },
    compliance: { ...base.compliance, ...(raw.compliance || {}) },
  }
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  )
}

function JobEditorFieldInfo({ title }: { title: string }) {
  return (
    <span className="job-editor-field-info" title={title} aria-label={title}>
      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
        <circle cx={12} cy={12} r={10} />
        <path d="M12 16v-4M12 8h.01" strokeLinecap="round" />
      </svg>
    </span>
  )
}

function JobEditorField({
  label,
  hint,
  info,
  children,
}: {
  label: string
  hint?: string
  /** Short tooltip next to label (mockup-style info icon). */
  info?: string
  children: React.ReactNode
}) {
  return (
    <div className="job-editor-field">
      <span className="job-editor-label-row">
        <span className="job-editor-label">{label}</span>
        {info ? <JobEditorFieldInfo title={info} /> : null}
      </span>
      {hint ? <p className="job-editor-field-hint">{hint}</p> : null}
      {children}
    </div>
  )
}

function htmlHasText(html: string): boolean {
  const t = html.replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ').trim()
  return t.length > 0
}

/** Curated list for the skill dropdown; custom skills can still be added. */
const SKILL_CATALOG: string[] = [
  '.NET',
  'Angular',
  'AWS',
  'Azure',
  'C#',
  'C++',
  'CI/CD',
  'CSS',
  'Dart',
  'Data engineering',
  'Docker',
  'Elasticsearch',
  'Elixir',
  'Figma',
  'Flutter',
  'GCP',
  'Go',
  'GraphQL',
  'HTML',
  'Java',
  'JavaScript',
  'Kafka',
  'Kotlin',
  'Kubernetes',
  'Linux',
  'Machine learning',
  'MongoDB',
  'MySQL',
  'Next.js',
  'Node.js',
  'PostgreSQL',
  'Product management',
  'Python',
  'PyTorch',
  'React',
  'React Native',
  'Redis',
  'Ruby',
  'Ruby on Rails',
  'Rust',
  'Salesforce',
  'Scala',
  'Snowflake',
  'Spring Boot',
  'SQL',
  'Swift',
  'Tableau',
  'Tailwind CSS',
  'TensorFlow',
  'Terraform',
  'TypeScript',
  'UI design',
  'UX research',
  'Vue.js',
].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))

/** Normalize saved skills; split legacy comma-separated single entries. */
function expandSkillEntries(raw: string[] | undefined): string[] {
  if (!raw?.length) return []
  const out: string[] = []
  for (const s of raw) {
    const t = String(s).trim()
    if (!t) continue
    if (t.includes(',')) {
      t.split(',').forEach(p => {
        const x = p.trim()
        if (x) out.push(x)
      })
    } else {
      out.push(t)
    }
  }
  const seen = new Set<string>()
  const dedup: string[] = []
  for (const s of out) {
    const k = s.toLowerCase()
    if (seen.has(k)) continue
    seen.add(k)
    dedup.push(s)
  }
  return dedup
}

/** Salary fields: digits only (stored as string for controlled inputs). */
function sanitizeSalaryDigits(raw: string): string {
  return raw.replace(/\D/g, '')
}

/** ISO 4217-style 3-letter code for job salary currency. */
function normalizeCurrencyCode(raw: string | undefined | null): string {
  const t = (raw ?? 'USD').trim().toUpperCase().replace(/[^A-Z]/g, '')
  if (t.length >= 3) return t.slice(0, 3)
  return 'USD'
}

/** Common ISO codes; workspace default is merged in the UI. */
const COMMON_CURRENCIES: readonly string[] = [
  'USD',
  'EUR',
  'GBP',
  'INR',
  'CAD',
  'AUD',
  'CHF',
  'JPY',
  'SGD',
  'HKD',
  'NZD',
  'SEK',
  'NOK',
  'MXN',
  'BRL',
  'ZAR',
]

function SkillsMatchingImpact({ requiredCount, niceCount }: { requiredCount: number; niceCount: number }) {
  const max = 20
  const reqPct = Math.min(100, (requiredCount / max) * 100)
  const nicePct = Math.min(100, (niceCount / max) * 100)
  const ticks = [0, 5, 10, 15, 20]
  return (
    <div className="job-skills-impact">
      <h4 className="job-skills-impact-title">Matching Impact</h4>
      <p className="job-skills-impact-desc">
        Visualize how skills will be used for talent matching and on scorecards.
      </p>
      <div className="job-skills-impact-bars">
        <div className="job-skills-impact-row">
          <span className="job-skills-impact-label">Strengths</span>
          <div className="job-skills-impact-track" aria-hidden>
            <div className="job-skills-impact-fill job-skills-impact-fill--req" style={{ width: `${reqPct}%` }} />
          </div>
        </div>
        <div className="job-skills-impact-row">
          <span className="job-skills-impact-label">Nice-to-have impact</span>
          <div className="job-skills-impact-track" aria-hidden>
            <div className="job-skills-impact-fill job-skills-impact-fill--nice" style={{ width: `${nicePct}%` }} />
          </div>
        </div>
      </div>
      <div className="job-skills-impact-scale" aria-hidden>
        {ticks.map(t => (
          <span key={t}>{t}</span>
        ))}
      </div>
    </div>
  )
}

function SkillsRecommendedRow({
  catalog,
  skillsRequired,
  skillsNice,
  onAddRequired,
}: {
  catalog: readonly string[]
  skillsRequired: string[]
  skillsNice: string[]
  onAddRequired: (s: string) => void
}) {
  const used = useMemo(() => {
    const set = new Set<string>()
    for (const s of skillsRequired) set.add(s.toLowerCase())
    for (const s of skillsNice) set.add(s.toLowerCase())
    return set
  }, [skillsRequired, skillsNice])

  const recommended = useMemo(() => catalog.filter(s => !used.has(s.toLowerCase())), [catalog, used])

  const show = recommended.slice(0, 12)
  const nextPlus = recommended[0]

  return (
    <div className="job-skills-recommended">
      <p className="job-skill-panel-eyebrow">Recommended skills for this job title</p>
      <div className="job-skills-reco-inner">
        <div className="job-skills-reco-cloud" role="list">
          {show.length === 0 ? (
            <span className="job-editor-muted job-skills-reco-empty">All catalog skills are already selected.</span>
          ) : (
            show.map(s => (
              <button key={s} type="button" className="job-skills-reco-pill" role="listitem" onClick={() => onAddRequired(s)}>
                {s}
              </button>
            ))
          )}
        </div>
        <button
          type="button"
          className="job-skills-reco-plus"
          aria-label="Add next suggested skill to required"
          onClick={() => {
            if (nextPlus) onAddRequired(nextPlus)
          }}
          disabled={!nextPlus}
        >
          <span className="job-skills-reco-plus-icon" aria-hidden>
            +
          </span>
          <span className="job-skills-reco-plus-label">Plus</span>
        </button>
      </div>
    </div>
  )
}

function SkillPickerColumn({
  label,
  hint,
  selected,
  onChange,
  variant,
  panel = false,
  eyebrow,
  panelTitle,
  panelHint,
  searchPlaceholder,
  searchTone = 'default',
}: {
  label: string
  hint?: string
  selected: string[]
  onChange: (skills: string[]) => void
  variant: 'required' | 'nice'
  panel?: boolean
  eyebrow?: string
  panelTitle?: string
  panelHint?: string
  searchPlaceholder?: string
  searchTone?: 'default' | 'nice'
}) {
  const [selectKey, setSelectKey] = useState(0)
  const [customDraft, setCustomDraft] = useState('')
  const [searchFilter, setSearchFilter] = useState('')

  const inSelected = useMemo(() => new Set(selected.map(s => s.toLowerCase())), [selected])
  const catalogOptions = useMemo(
    () => SKILL_CATALOG.filter(s => !inSelected.has(s.toLowerCase())),
    [inSelected],
  )

  const filteredCatalog = useMemo(() => {
    const q = searchFilter.trim().toLowerCase()
    if (!q) return catalogOptions
    return catalogOptions.filter(s => s.toLowerCase().includes(q))
  }, [catalogOptions, searchFilter])

  const quickPick = useMemo(() => {
    const q = searchFilter.trim()
    const pool = q ? filteredCatalog : catalogOptions
    return pool.slice(0, 12)
  }, [searchFilter, filteredCatalog, catalogOptions])

  const addSkill = (raw: string) => {
    const t = raw.trim()
    if (!t) return
    if (selected.some(s => s.toLowerCase() === t.toLowerCase())) return
    onChange([...selected, t])
    setSelectKey(k => k + 1)
    setCustomDraft('')
  }

  const remove = (name: string) => {
    onChange(selected.filter(s => s !== name))
  }

  const onSelectPick = (value: string) => {
    if (value) addSkill(value)
  }

  const onCustomKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addSkill(customDraft)
    }
  }

  const panelHeadId = `skill-panel-${variant}-title`

  if (panel) {
    return (
      <div className={`job-skill-panel job-skill-panel--${variant}`} aria-labelledby={panelHeadId}>
        {eyebrow ? <p className="job-skill-panel-eyebrow">{eyebrow}</p> : null}
        {panelTitle ? (
          <h3 id={panelHeadId} className="job-skill-panel-headline">
            {panelTitle}
          </h3>
        ) : null}
        {panelHint ? <p className="job-skill-panel-sub">{panelHint}</p> : null}
        {!panelHint && hint ? <p className="job-skill-panel-sub">{hint}</p> : null}

        <div className={`job-skill-search-wrap job-skill-search-wrap--${searchTone}`}>
          <svg className="job-skill-search-icon" width={18} height={18} viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth={2} />
            <path d="M20 20l-4-4" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
          </svg>
          <input
            className="job-skill-search-input"
            type="search"
            value={searchFilter}
            onChange={e => setSearchFilter(e.target.value)}
            placeholder={searchPlaceholder ?? 'Search tags'}
            aria-label={searchPlaceholder ?? 'Search skills'}
          />
        </div>

        <div className="job-skill-chips job-skill-chips--panel" role="list" aria-label={label}>
          {selected.length === 0 ? (
            <span className="job-editor-muted job-skill-chips-empty">No skills selected yet.</span>
          ) : (
            selected.map(skill => (
              <span key={skill} className={`job-skill-chip job-skill-chip--${variant}`} role="listitem">
                <span className="job-skill-chip-text">{skill}</span>
                <button
                  type="button"
                  className="job-skill-chip-remove"
                  onClick={() => remove(skill)}
                  aria-label={`Remove ${skill}`}
                >
                  ×
                </button>
              </span>
            ))
          )}
        </div>

        {quickPick.length > 0 ? (
          <div className="job-skill-quick-picks" aria-label="Suggested skills from catalog">
            {quickPick.map(s => (
              <button key={s} type="button" className="job-skill-quick-pick" onClick={() => addSkill(s)}>
                + {s}
              </button>
            ))}
          </div>
        ) : catalogOptions.length === 0 ? (
          <p className="job-skill-panel-catalog-empty">All catalog skills are selected—add a custom skill below.</p>
        ) : null}

        <div className="job-skill-custom-row">
          <input
            className="job-editor-input"
            value={customDraft}
            onChange={e => setCustomDraft(e.target.value)}
            placeholder="Add custom skill (Enter)"
            onKeyDown={onCustomKeyDown}
            aria-label="Add custom skill"
          />
          <button type="button" className="btn-row-action" onClick={() => addSkill(customDraft)}>
            Add
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="job-skill-picker">
      <span className="job-editor-label">{label}</span>
      {hint ? <p className="job-editor-field-hint">{hint}</p> : null}

      <div className="job-skill-chips" role="list" aria-label={label}>
        {selected.length === 0 ? (
          <span className="job-editor-muted job-skill-chips-empty">No skills selected.</span>
        ) : (
          selected.map(skill => (
            <span key={skill} className={`job-skill-chip job-skill-chip--${variant}`} role="listitem">
              <span className="job-skill-chip-text">{skill}</span>
              <button
                type="button"
                className="job-skill-chip-remove"
                onClick={() => remove(skill)}
                aria-label={`Remove ${skill}`}
              >
                ×
              </button>
            </span>
          ))
        )}
      </div>

      <div className="job-skill-controls">
        <label className="visually-hidden" htmlFor={`skill-dd-${variant}`}>
          Add skill from list
        </label>
        {catalogOptions.length === 0 ? (
          <p className="job-editor-muted" style={{ fontSize: 13, margin: 0 }}>
            All suggested skills are already added—use custom skill below if you need more.
          </p>
        ) : (
          <select
            key={selectKey}
            id={`skill-dd-${variant}`}
            className="job-editor-select job-skill-select"
            defaultValue=""
            onChange={e => {
              const v = e.target.value
              if (v) onSelectPick(v)
            }}
          >
            <option value="">Choose a skill…</option>
            {catalogOptions.map(s => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        )}

        <div className="job-skill-custom-row">
          <input
            className="job-editor-input"
            value={customDraft}
            onChange={e => setCustomDraft(e.target.value)}
            placeholder="Custom skill (press Enter)"
            onKeyDown={onCustomKeyDown}
            aria-label="Add custom skill"
          />
          <button type="button" className="btn-row-action" onClick={() => addSkill(customDraft)}>
            Add
          </button>
        </div>
      </div>
    </div>
  )
}

function JobScorecardCriteriaEditor({ token, jobId }: { token: string; jobId: number }) {
  const toast = useToast()
  const [lines, setLines] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const j = await jobsApi.get(token, jobId)
      const crit = j.scorecard_criteria
      if (Array.isArray(crit)) {
        setLines(
          crit
            .map(c => (typeof c === 'string' ? c : (c as { name: string }).name))
            .filter(Boolean)
            .join('\n'),
        )
      } else {
        setLines('')
      }
    } catch (e: unknown) {
      toast.error('Could not load job', e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }, [token, jobId, toast])

  useEffect(() => {
    load()
  }, [load])

  const save = async () => {
    const parts = lines
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean)
    const scorecard_criteria = parts.map(name => ({ name, scale_max: 5, required: true }))
    setSaving(true)
    try {
      await jobsApi.update(token, jobId, { scorecard_criteria })
      toast.success('Scorecard rubric saved', 'Interviewers must enter 1–5 for each attribute before submitting.')
      load()
    } catch (e: unknown) {
      toast.error('Save failed', e instanceof Error ? e.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="job-editor-card job-scorecard-criteria-card">
      <h3 className="job-editor-card-title">Scorecard attributes (job-wide)</h3>
      <p className="job-card-microcopy">
        Same rubric for every interview on this job—e.g. Communication, DSA, System design. One line per attribute.
      </p>
      {loading ? (
        <p className="job-editor-muted">Loading…</p>
      ) : (
        <>
          <FormField label="Attributes (one per line)">
            <textarea
              value={lines}
              onChange={e => setLines(e.target.value)}
              rows={5}
              placeholder={'Communication\nProblem solving\nSystem design'}
            />
          </FormField>
          <button type="button" className="btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save rubric'}
          </button>
        </>
      )}
    </div>
  )
}

function SignalModelStrip() {
  const items = [
    { k: 'Plan', d: 'Rounds per job, ordered and optionally tied to a pipeline stage.' },
    { k: 'Kit', d: 'Focus area, interviewer notes, and structured questions for that round.' },
    { k: 'Assignments', d: 'Created when candidates enter a linked stage—who interviews whom.' },
    { k: 'Scorecards', d: 'Structured outcomes (criteria + recommendation) after the interview.' },
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

function PipelineStageRulesSection({ token, jobId }: { token: string; jobId: number }) {
  const toast = useToast()
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const st = await pipelineStagesApi.listByJob(token, jobId)
      setStages(st.sort((a, b) => a.position - b.position))
    } catch (e: unknown) {
      toast.error('Could not load stages', e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }, [token, jobId, toast])

  useEffect(() => {
    load()
  }, [load])

  const ruleBool = (rules: Record<string, unknown>, key: string): boolean =>
    rules[key] === true || rules[key] === 'true'

  const patch = async (s: PipelineStage, patchRules: Record<string, unknown>) => {
    const next = { ...(s.automation_rules || {}), ...patchRules }
    try {
      await pipelineStagesApi.update(token, s.id, { automation_rules: next })
      load()
    } catch (e: unknown) {
      toast.error('Update failed', e instanceof Error ? e.message : 'Error')
    }
  }

  if (loading) return <div className="job-editor-loading">Loading pipeline…</div>

  return (
    <div className="job-step-body">
      <p className="job-editor-step-lead">
        Tune how each Kanban column behaves. These rules are stored on <code>pipeline_stages.automation_rules</code> for
        this job.
      </p>
      {stages.length === 0 ? (
        <p className="job-editor-muted">No stages yet—candidates will use default workflow until stages exist.</p>
      ) : (
        <div className="job-editor-card">
          <div className="job-pipeline-rules">
            {stages.map(s => {
              const r = (s.automation_rules || {}) as Record<string, unknown>
              return (
                <div key={s.id} className="job-pipeline-rule-row">
                  <div className="job-pipeline-rule-name">
                    <strong>{s.name}</strong>
                    <span className="job-editor-muted"> #{s.id}</span>
                  </div>
                  <label className="job-checkbox-label">
                    <input
                      type="checkbox"
                      checked={ruleBool(r, 'auto_advance')}
                      onChange={e => patch(s, { auto_advance: e.target.checked })}
                    />
                    Auto move candidate
                  </label>
                  <label className="job-checkbox-label">
                    <input
                      type="checkbox"
                      checked={ruleBool(r, 'require_feedback_before_move')}
                      onChange={e => patch(s, { require_feedback_before_move: e.target.checked })}
                    />
                    Require feedback before moving
                  </label>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function InterviewPanelSection({
  token,
  jobId,
  interviewDefaults,
  setInterviewDefaults,
}: {
  token: string
  jobId: number
  interviewDefaults: NonNullable<JobConfig['interview_defaults']>
  setInterviewDefaults: (p: NonNullable<JobConfig['interview_defaults']>) => void
}) {
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
  const [planDuration, setPlanDuration] = useState('')
  const [planFormat, setPlanFormat] = useState('online')
  const [savingKit, setSavingKit] = useState(false)
  const [savingPlanMeta, setSavingPlanMeta] = useState(false)

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
      setPlanDuration('')
      setPlanFormat('online')
      return
    }
    const k = selected.kit
    setKitFocus(k?.focus_area ?? '')
    setKitInstructions(k?.instructions ?? '')
    const qs = k?.questions
    setKitQuestions(
      Array.isArray(qs) ? qs.map(q => (typeof q === 'string' ? q : JSON.stringify(q))).join('\n') : '',
    )
    setPlanDuration(selected.duration_minutes != null ? String(selected.duration_minutes) : '')
    setPlanFormat(selected.interview_format || 'online')
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
        duration_minutes: interviewDefaults.default_duration_minutes ?? null,
        interview_format: interviewDefaults.default_format ?? null,
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

  const savePlanMeta = async () => {
    if (!selected) return
    setSavingPlanMeta(true)
    try {
      const dm = planDuration.trim() === '' ? null : Number(planDuration)
      await interviewPlansApi.update(token, jobId, selected.id, {
        duration_minutes: dm != null && !Number.isNaN(dm) ? dm : null,
        interview_format: planFormat || null,
      })
      toast.success('Round settings saved', selected.name)
      load()
    } catch (e: unknown) {
      toast.error('Save failed', e instanceof Error ? e.message : 'Error')
    } finally {
      setSavingPlanMeta(false)
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
        <p className="job-editor-step-lead">Configure rounds, duration, format, and kits for this job.</p>
        <div className="job-editor-loading">Loading interview setup…</div>
      </div>
    )
  }

  return (
    <div className="job-step-body job-step-body--interview">
      <div className="job-editor-card job-editor-card--accent" style={{ marginBottom: 16 }}>
        <h3 className="job-editor-card-title">Defaults for new rounds</h3>
        <p className="job-card-microcopy">Applied when you add a round below (you can override per round).</p>
        <div className="job-editor-grid-2">
          <JobEditorField label="Default duration (minutes)">
            <input
              className="job-editor-input"
              type="number"
              min={5}
              value={interviewDefaults.default_duration_minutes ?? ''}
              onChange={e =>
                setInterviewDefaults({
                  ...interviewDefaults,
                  default_duration_minutes: e.target.value === '' ? undefined : Number(e.target.value),
                })
              }
              placeholder="45"
            />
          </JobEditorField>
          <JobEditorField label="Default format">
            <select
              className="job-editor-select"
              value={interviewDefaults.default_format ?? 'online'}
              onChange={e => setInterviewDefaults({ ...interviewDefaults, default_format: e.target.value })}
            >
              <option value="online">Online</option>
              <option value="onsite">On-site</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </JobEditorField>
        </div>
        <JobEditorField label="Calendar integration note" hint="e.g. Google Workspace cal, scheduling link policy.">
          <textarea
            className="job-editor-input"
            style={{ minHeight: 72 }}
            value={interviewDefaults.calendar_integration_note ?? ''}
            onChange={e =>
              setInterviewDefaults({ ...interviewDefaults, calendar_integration_note: e.target.value })
            }
            placeholder="Book via Calendly / require hiring coordinator…"
          />
        </JobEditorField>
      </div>

      <div className="job-interview-intro">
        <h2 className="job-editor-block-title job-interview-intro-title">Signal map</h2>
        <p className="job-editor-step-lead">
          Each round tests one signal. Link a round to a Kanban stage so the right interview is triggered when someone
          moves.
        </p>
        <SignalModelStrip />
      </div>

      <div className="signal-map" aria-label="Interview rounds">
        {plans.length === 0 && (
          <div className="signal-map-empty">
            <strong>No rounds yet.</strong> Add a plan below—then attach duration, format, and kit.
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
                {p.duration_minutes != null && (
                  <div className="signal-card-focus">{p.duration_minutes} min · {p.interview_format || '—'}</div>
                )}
                {p.kit?.focus_area && <div className="signal-card-focus">{p.kit.focus_area}</div>}
              </button>
            </div>
          ))}
      </div>

      <div className="job-editor-grid-2 job-editor-grid-2--interview">
        <div className="job-editor-card job-editor-card--accent">
          <h3 className="job-editor-card-title">Add a round</h3>
          <FormField label="Round name *">
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="e.g. Technical, HR, Manager"
            />
          </FormField>
          <FormField label="When candidate reaches stage">
            <select value={newStageId} onChange={e => setNewStageId(e.target.value)}>
              <option value="">Not linked</option>
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
          <h3 className="job-editor-card-title">Round settings & kit</h3>
          {!selected && (
            <p className="job-editor-muted job-editor-muted--boxed">Select a round in the map to edit duration, format, and kit.</p>
          )}
          {selected && (
            <>
              <div className="job-editor-card-actions">
                <button type="button" className="btn-row-action btn-row-danger" onClick={() => removePlan(selected)}>
                  Delete this round
                </button>
              </div>
              <div className="job-editor-grid-2">
                <FormField label="Duration (minutes)">
                  <input
                    type="number"
                    min={5}
                    value={planDuration}
                    onChange={e => setPlanDuration(e.target.value)}
                    placeholder="60"
                  />
                </FormField>
                <FormField label="Interview type">
                  <select value={planFormat} onChange={e => setPlanFormat(e.target.value)}>
                    <option value="online">Online</option>
                    <option value="onsite">On-site</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </FormField>
              </div>
              <button type="button" className="btn-primary" onClick={savePlanMeta} disabled={savingPlanMeta} style={{ marginBottom: 12 }}>
                {savingPlanMeta ? 'Saving…' : 'Save round settings'}
              </button>
              <FormField label="Focus area">
                <input
                  value={kitFocus}
                  onChange={e => setKitFocus(e.target.value)}
                  placeholder="e.g. Problem solving & architecture"
                />
              </FormField>
              <FormField label="Interviewer instructions">
                <textarea value={kitInstructions} onChange={e => setKitInstructions(e.target.value)} rows={3} />
              </FormField>
              <FormField label="Questions (one per line)">
                <textarea value={kitQuestions} onChange={e => setKitQuestions(e.target.value)} rows={6} />
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

function JobAnalyticsSection({ token, jobId }: { token: string; jobId: number }) {
  const [data, setData] = useState<JobAnalytics | null>(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    let cancelled = false
    jobsApi
      .analytics(token, jobId)
      .then(d => {
        if (!cancelled) setData(d)
      })
      .catch(e => {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'Failed')
      })
    return () => {
      cancelled = true
    }
  }, [token, jobId])

  if (err) return <p className="auth-error">{err}</p>
  if (!data) return <div className="job-editor-loading">Loading analytics…</div>

  return (
    <div className="job-step-body">
      <div className="job-editor-grid-2">
        <div className="job-editor-card">
          <h3 className="job-editor-card-title">Applicants</h3>
          <p className="job-stat-big">{data.total_applicants}</p>
          <p className="job-editor-muted">Total active applications for this job.</p>
        </div>
        <div className="job-editor-card">
          <h3 className="job-editor-card-title">Offer → hired</h3>
          <p className="job-stat-big">
            {data.offer_acceptance_rate != null
              ? `${Math.round(data.offer_acceptance_rate * 100)}%`
              : '—'}
          </p>
          <p className="job-editor-muted">
            Hired {data.hired_count} / offer-stage {data.offer_stage_count}
          </p>
        </div>
      </div>
      <div className="job-editor-card">
        <h3 className="job-editor-card-title">By stage</h3>
        <ul className="job-analytics-list">
          {Object.entries(data.by_status).map(([k, v]) => (
            <li key={k}>
              <strong>{k}</strong> — {v}
            </li>
          ))}
        </ul>
      </div>
      <div className="job-editor-card">
        <h3 className="job-editor-card-title">By source</h3>
        <ul className="job-analytics-list">
          {Object.entries(data.by_source).map(([k, v]) => (
            <li key={k}>
              <strong>{k}</strong> — {v}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function JobAttachmentsSection({
  token,
  jobId,
  onChanged,
}: {
  token: string
  jobId: number
  onChanged: () => void
}) {
  const toast = useToast()
  const [rows, setRows] = useState<JobAttachment[]>([])
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [docType, setDocType] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setRows(await jobsApi.listAttachments(token, jobId))
    } catch {
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [token, jobId])

  useEffect(() => {
    load()
  }, [load])

  const add = async () => {
    const n = name.trim()
    const u = url.trim()
    if (!n || !u) {
      toast.error('Missing fields', 'Name and URL are required.')
      return
    }
    try {
      await jobsApi.createAttachment(token, jobId, { name: n, file_url: u, doc_type: docType || undefined })
      setName('')
      setUrl('')
      setDocType('')
      toast.success('Attachment added', n)
      load()
      onChanged()
    } catch (e: unknown) {
      toast.error('Failed', e instanceof Error ? e.message : 'Error')
    }
  }

  const del = async (a: JobAttachment) => {
    if (!confirm(`Remove "${a.name}"?`)) return
    try {
      await jobsApi.deleteAttachment(token, jobId, a.id)
      load()
      onChanged()
    } catch (e: unknown) {
      toast.error('Delete failed', e instanceof Error ? e.message : 'Error')
    }
  }

  return (
    <div className="job-step-body">
      <div className="job-editor-card">
        <h3 className="job-editor-card-title">Linked documents</h3>
        {loading ? (
          <p className="job-editor-muted">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="job-editor-muted">No attachments yet.</p>
        ) : (
          <ul className="job-attachments-list">
            {rows.map(a => (
              <li key={a.id} className="job-attachment-row">
                <a href={a.file_url} target="_blank" rel="noreferrer">
                  {a.name}
                </a>
                {a.doc_type && <span className="job-editor-muted"> · {a.doc_type}</span>}
                <button type="button" className="btn-row-action btn-row-danger" onClick={() => del(a)}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="job-editor-card">
        <h3 className="job-editor-card-title">Add link</h3>
        <JobEditorField label="Display name">
          <input className="job-editor-input" value={name} onChange={e => setName(e.target.value)} placeholder="JD PDF" />
        </JobEditorField>
        <JobEditorField label="File URL">
          <input className="job-editor-input" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…" />
        </JobEditorField>
        <JobEditorField label="Type (optional)">
          <input
            className="job-editor-input"
            value={docType}
            onChange={e => setDocType(e.target.value)}
            placeholder="jd_pdf, offer_template…"
          />
        </JobEditorField>
        <button type="button" className="btn-primary" onClick={add}>
          Add attachment
        </button>
      </div>
    </div>
  )
}

export default function JobEditorPage() {
  const { token, accountId } = useOutletContext<DashboardOutletContext>()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const { jobId: jobIdParam } = useParams<{ jobId: string }>()
  const toast = useToast()

  const isNew = pathname.endsWith('/jobs/new')
  const editJobId = !isNew && jobIdParam ? Number(jobIdParam) : NaN

  const [job, setJob] = useState<Job | null>(null)
  const [labelCatalog, setLabelCatalog] = useState<AccountLabelRow[]>([])
  const [savingJobLabels, setSavingJobLabels] = useState(false)
  const [controlVersionId, setControlVersionId] = useState<number | null>(null)
  const [loadErr, setLoadErr] = useState('')
  const [members, setMembers] = useState<AccountMember[]>([])
  const [boards, setBoards] = useState<JobBoard[]>([])
  const [jobConfig, setJobConfig] = useState<JobConfig>(() => defaultJobConfig())

  const [form, setForm] = useState({
    title: '',
    department: '',
    location: '',
    location_type: 'onsite',
    employment_type: 'full_time',
    experience_level: '',
    open_positions: '1',
    status: 'draft',
    descriptionHtml: '<p></p>',
    salary_min: '',
    salary_max: '',
    salary_currency: 'USD',
    salary_visible: true,
    bonus_incentives: '',
    budget_approval_status: '',
    cost_center: '',
    hiring_budget_id: '',
    hiring_manager_user_id: '',
    recruiter_user_id: '',
    requisition_id: '',
    tagsStr: '',
  })
  const [skillsRequired, setSkillsRequired] = useState<string[]>([])
  const [skillsNice, setSkillsNice] = useState<string[]>([])
  const [jobAttrDefs, setJobAttrDefs] = useState<CustomAttributeDefinition[]>([])
  const [jobCustomFields, setJobCustomFields] = useState<Record<string, unknown>>({})
  const [referralSettings, setReferralSettings] = useState({
    enabled: true,
    bonus_amount: '',
    currency: 'USD',
    probation_days: '90',
    min_referrer_tenure_days: '90',
  })
  const [referralShareUrl, setReferralShareUrl] = useState<string | null>(null)
  const [referralLinkLoading, setReferralLinkLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [orgSettings, setOrgSettings] = useState<OrganizationSettings | null>(null)
  const [countriesCatalog, setCountriesCatalog] = useState<CountryRow[]>([])

  const accountDefaultCurrency = useMemo(
    () => normalizeCurrencyCode(orgSettings?.default_currency ?? 'USD'),
    [orgSettings?.default_currency],
  )
  const accountDefaultCurrencyRef = useRef(accountDefaultCurrency)
  accountDefaultCurrencyRef.current = accountDefaultCurrency
  const orgCurrencySeededRef = useRef(false)

  const jobsBase = `/account/${accountId}/jobs`
  const numericId = isNew ? null : editJobId
  const hasPostCreateSteps = numericId != null && !Number.isNaN(numericId) && numericId > 0

  const visibleSteps = useMemo(
    () => (isNew ? ALL_STEP_DEFS.filter(s => NEW_JOB_STEPS.includes(s.id)) : ALL_STEP_DEFS),
    [isNew],
  )

  const stepParamRaw = searchParams.get(JOB_EDITOR_STEP_PARAM)
  const stepIndex = useMemo(
    () => stepIndexFromSearch(visibleSteps, stepParamRaw),
    [visibleSteps, stepParamRaw],
  )

  useEffect(() => {
    const canonicalId = visibleSteps[stepIndex]?.id
    if (!canonicalId) return
    if (stepParamRaw !== canonicalId) {
      setSearchParams(
        prev => {
          const next = new URLSearchParams(prev)
          next.set(JOB_EDITOR_STEP_PARAM, canonicalId)
          return next
        },
        { replace: true },
      )
    }
  }, [visibleSteps, stepIndex, stepParamRaw, setSearchParams])

  const currentStep = visibleSteps[stepIndex] ?? visibleSteps[0]
  const stepId = currentStep?.id ?? 'basic_info'

  const currencyOptions = useMemo(() => {
    const d = accountDefaultCurrency
    const rest = COMMON_CURRENCIES.filter(c => c !== d)
    const ordered = [d, ...rest]
    const seen = new Set(ordered)
    if (form.salary_currency && !seen.has(form.salary_currency)) {
      return [form.salary_currency, ...ordered]
    }
    return ordered
  }, [accountDefaultCurrency, form.salary_currency])

  const loadOrgMeta = useCallback(async () => {
    const aid = Number(accountId)
    if (!token || !Number.isFinite(aid)) return
    try {
      const [org, cat] = await Promise.all([getOrganizationSettings(token, aid), fetchCountriesCatalog(token)])
      setOrgSettings(normalizeOrgSettings(org))
      setCountriesCatalog(cat.countries)
    } catch {
      setOrgSettings(null)
      setCountriesCatalog([])
    }
  }, [token, accountId])

  useEffect(() => {
    void loadOrgMeta()
  }, [loadOrgMeta])

  /** New job: apply workspace default currency once org settings load. */
  useEffect(() => {
    if (!isNew) {
      orgCurrencySeededRef.current = false
      return
    }
    if (!orgSettings) return
    if (orgCurrencySeededRef.current) return
    orgCurrencySeededRef.current = true
    setForm(f => ({ ...f, salary_currency: accountDefaultCurrency }))
  }, [isNew, orgSettings, accountDefaultCurrency])

  const locationOptions = useMemo((): CountryRow[] => {
    const enabled = orgSettings?.enabled_country_codes
    if (!countriesCatalog.length) return []
    if (enabled === null || enabled === undefined) return countriesCatalog
    const allow = new Set(enabled)
    return countriesCatalog.filter(c => allow.has(c.code))
  }, [orgSettings, countriesCatalog])

  const departmentOptions = orgSettings?.departments ?? []

  useEffect(() => {
    accountMembersApi.list(token).then(setMembers).catch(() => setMembers([]))
  }, [token])

  useEffect(() => {
    if (!token) return
    customAttributesApi
      .list(token, 'job')
      .then(setJobAttrDefs)
      .catch(() => setJobAttrDefs([]))
  }, [token])

  useEffect(() => {
    if (!token) return
    labelsApi
      .list(token)
      .then(setLabelCatalog)
      .catch(() => setLabelCatalog([]))
  }, [token])

  useEffect(() => {
    if (!jobAttrDefs.length) return
    setJobCustomFields(prev => {
      const next = { ...prev }
      let changed = false
      for (const d of jobAttrDefs) {
        if (d.field_type === 'boolean' && next[d.attribute_key] === undefined) {
          next[d.attribute_key] = false
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [jobAttrDefs])

  useEffect(() => {
    if (stepId === 'posting' && hasPostCreateSteps) {
      boardsApi.list(token, { active: true }).then(setBoards).catch(() => setBoards([]))
    }
  }, [stepId, token, hasPostCreateSteps])

  useEffect(() => {
    if (isNew) {
      orgCurrencySeededRef.current = false
      setJob(null)
      setControlVersionId(null)
      setLoadErr('')
      setJobConfig(defaultJobConfig())
      setSkillsRequired([])
      setSkillsNice([])
      setJobCustomFields({})
      setForm({
        title: '',
        department: '',
        location: '',
        location_type: 'onsite',
        employment_type: 'full_time',
        experience_level: '',
        open_positions: '1',
        status: 'draft',
        descriptionHtml: '<p></p>',
        salary_min: '',
        salary_max: '',
        salary_currency: normalizeCurrencyCode(accountDefaultCurrencyRef.current),
        salary_visible: true,
        bonus_incentives: '',
        budget_approval_status: '',
        cost_center: '',
        hiring_budget_id: '',
        hiring_manager_user_id: '',
        recruiter_user_id: '',
        requisition_id: '',
        tagsStr: '',
      })
      setReferralSettings({
        enabled: true,
        bonus_amount: '',
        currency: 'USD',
        probation_days: '90',
        min_referrer_tenure_days: '90',
      })
      setReferralShareUrl(null)
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
        setJobConfig(mergeLoadedJobConfig(j.job_config))
        setSkillsRequired(expandSkillEntries(j.job_config?.skills_required))
        setSkillsNice(expandSkillEntries(j.job_config?.skills_nice))
        const cf = j.custom_fields
        setJobCustomFields(cf && typeof cf === 'object' && !Array.isArray(cf) ? { ...cf } : {})
        setForm({
          title: j.title,
          department: j.department ?? '',
          location: j.location ?? '',
          location_type: j.location_type,
          employment_type: j.employment_type,
          experience_level: j.experience_level ?? '',
          open_positions: String(j.open_positions ?? 1),
          status: j.status,
          descriptionHtml: v?.description ? v.description : '<p></p>',
          salary_min: j.salary_min != null ? sanitizeSalaryDigits(String(j.salary_min)) : '',
          salary_max: j.salary_max != null ? sanitizeSalaryDigits(String(j.salary_max)) : '',
          salary_currency: normalizeCurrencyCode(j.salary_currency || accountDefaultCurrencyRef.current),
          salary_visible: j.salary_visible !== false,
          bonus_incentives: j.bonus_incentives ?? '',
          budget_approval_status: j.budget_approval_status ?? '',
          cost_center: j.cost_center ?? '',
          hiring_budget_id: j.hiring_budget_id ?? '',
          hiring_manager_user_id: j.hiring_manager_user_id != null ? String(j.hiring_manager_user_id) : '',
          recruiter_user_id: j.recruiter_user_id != null ? String(j.recruiter_user_id) : '',
          requisition_id: j.requisition_id ?? '',
          tagsStr: (j.tags || []).join(', '),
        })
        const rs = (j.referral_settings || {}) as JobReferralSettings
        setReferralSettings({
          enabled: rs.enabled !== false,
          bonus_amount:
            rs.bonus_amount != null && !Number.isNaN(Number(rs.bonus_amount)) ? String(rs.bonus_amount) : '',
          currency: rs.currency || 'USD',
          probation_days: String(rs.probation_days ?? 90),
          min_referrer_tenure_days: String(rs.min_referrer_tenure_days ?? 90),
        })
        setReferralShareUrl(null)
      } catch (e: unknown) {
        if (!cancelled) setLoadErr(e instanceof Error ? e.message : 'Failed to load job')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token, isNew, editJobId])

  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }))

  const toggleJobLabel = async (labelId: number, next: boolean) => {
    if (!token || isNew || !job) return
    const cur = new Set((job.labels ?? []).map(l => l.id))
    if (next) cur.add(labelId)
    else cur.delete(labelId)
    setSavingJobLabels(true)
    try {
      const { labels } = await labelsApi.setJobLabels(token, job.id, Array.from(cur).sort((a, b) => a - b))
      setJob(j => (j ? { ...j, labels } : j))
      toast.success('Labels updated')
    } catch (e: unknown) {
      toast.error('Could not update labels', e instanceof Error ? e.message : undefined)
    } finally {
      setSavingJobLabels(false)
    }
  }

  const setInterviewDefaults = (p: NonNullable<JobConfig['interview_defaults']>) => {
    setJobConfig(c => ({ ...c, interview_defaults: p }))
  }

  const fetchMyReferralLink = async () => {
    if (!token || !numericId) return
    setReferralLinkLoading(true)
    try {
      const r = await referralsApi.getJobReferralLink(token, numericId)
      const url =
        r.referral_url?.trim() ||
        `${typeof window !== 'undefined' ? window.location.origin : ''}/apply/${r.apply_token}${r.path_with_query || ''}`
      setReferralShareUrl(url)
      toast.success('Referral link ready', 'Copy and share with candidates.')
    } catch (e: unknown) {
      toast.error('Could not get referral link', e instanceof Error ? e.message : undefined)
    } finally {
      setReferralLinkLoading(false)
    }
  }

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

  const buildJobConfigForSave = (): JobConfig => ({
    ...jobConfig,
    skills_required: skillsRequired,
    skills_nice: skillsNice,
  })

  const parseNum = (s: string): number | null => {
    const t = s.trim()
    if (t === '') return null
    const n = Number(t)
    return Number.isNaN(n) ? null : n
  }

  const jobPayloadCore = () => ({
    title: form.title,
    department: form.department || null,
    location: form.location || null,
    location_type: form.location_type,
    employment_type: form.employment_type,
    experience_level: form.experience_level || null,
    open_positions: Math.max(1, parseInt(form.open_positions, 10) || 1),
    status: form.status,
    salary_min: parseNum(form.salary_min),
    salary_max: parseNum(form.salary_max),
    salary_currency: normalizeCurrencyCode(form.salary_currency || accountDefaultCurrency),
    salary_visible: form.salary_visible,
    bonus_incentives: form.bonus_incentives || null,
    budget_approval_status: form.budget_approval_status || null,
    cost_center: form.cost_center || null,
    hiring_budget_id: form.hiring_budget_id || null,
    hiring_manager_user_id: form.hiring_manager_user_id ? Number(form.hiring_manager_user_id) : null,
    recruiter_user_id: form.recruiter_user_id ? Number(form.recruiter_user_id) : null,
    requisition_id: form.requisition_id || null,
    tags: form.tagsStr
      .split(',')
      .map(s => s.trim())
      .filter(Boolean),
    job_config: buildJobConfigForSave(),
    custom_fields: jobCustomFields,
    referral_settings: {
      enabled: referralSettings.enabled,
      bonus_amount:
        referralSettings.bonus_amount.trim() === '' ? null : Number(referralSettings.bonus_amount),
      currency: referralSettings.currency.trim() || 'USD',
      probation_days: Math.max(0, parseInt(referralSettings.probation_days, 10) || 90),
      min_referrer_tenure_days: Math.max(0, parseInt(referralSettings.min_referrer_tenure_days, 10) || 90),
    },
  })

  const refreshJob = async (jobId: number) => {
    const j = await jobsApi.get(token, jobId)
    setJob(j)
    const v = j.versions?.find(x => x.is_control) ?? j.versions?.[0]
    setControlVersionId(v?.id ?? null)
  }

  const saveJob = async (): Promise<boolean> => {
    setSaving(true)
    setErr('')
    try {
      if (isNew) {
        const created = await jobsApi.create(token, {
          ...jobPayloadCore(),
          description: htmlHasText(form.descriptionHtml) ? form.descriptionHtml : undefined,
        })
        toast.success('Job created', `"${created.title}" — continue with pipeline and interviews.`)
        navigate(`${jobsBase}/${created.id}/edit?${JOB_EDITOR_STEP_PARAM}=pipeline`, { replace: true })
        return true
      }
      await jobsApi.update(token, editJobId, jobPayloadCore())
      await persistDescription(editJobId, form.descriptionHtml)
      toast.success('Job updated', form.title)
      await refreshJob(editJobId)
      return true
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to save'
      setErr(msg)
      toast.error('Save failed', msg)
      return false
    } finally {
      setSaving(false)
    }
  }

  const goToStepIndex = (idx: number) => {
    if (idx < 0 || idx >= visibleSteps.length) return
    const id = visibleSteps[idx]?.id
    if (!id) return
    setSearchParams(
      prev => {
        const next = new URLSearchParams(prev)
        next.set(JOB_EDITOR_STEP_PARAM, id)
        return next
      },
      { replace: true },
    )
  }

  const goStep = (delta: number) => {
    goToStepIndex(stepIndex + delta)
  }

  const saveAndProceed = async () => {
    const ok = await saveJob()
    if (ok && !isNew && stepIndex < visibleSteps.length - 1) {
      goStep(1)
    }
  }

  const goToBasicInfoStep = () => {
    const idx = visibleSteps.findIndex(s => s.id === 'basic_info')
    if (idx >= 0) goToStepIndex(idx)
  }

  const discardSkills = () => {
    if (isNew) {
      setSkillsRequired([])
      setSkillsNice([])
      return
    }
    if (job) {
      setSkillsRequired(expandSkillEntries(job.job_config?.skills_required))
      setSkillsNice(expandSkillEntries(job.job_config?.skills_nice))
    }
  }

  const addSkillToRequired = (s: string) => {
    const t = s.trim()
    if (!t) return
    setSkillsNice(prev => prev.filter(x => x.toLowerCase() !== t.toLowerCase()))
    setSkillsRequired(prev => {
      if (prev.some(x => x.toLowerCase() === t.toLowerCase())) return prev
      return [...prev, t]
    })
  }

  if (!isNew && (Number.isNaN(editJobId) || editJobId <= 0)) {
    return (
      <div className="job-editor-page">
        <nav className="job-editor-breadcrumb" aria-label="Breadcrumb">
          <button type="button" className="job-editor-crumb-link" onClick={() => navigate(jobsBase)}>
            Jobs
          </button>
          <span className="job-editor-crumb-arrow" aria-hidden>
            →
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

  const posting = jobConfig.posting || {}
  const appFields = posting.application_fields || {}
  const boardIds = new Set(posting.job_board_ids || [])
  const automation = jobConfig.automation || {}
  const evaluation = jobConfig.evaluation || {}
  const compliance = jobConfig.compliance || {}
  const perm = jobConfig.permissions || {}

  const toggleBoard = (id: number) => {
    const cur = posting.job_board_ids || []
    const next = cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id]
    setJobConfig(c => ({ ...c, posting: { ...c.posting, job_board_ids: next } }))
  }

  const setAppField = (key: string, val: boolean) => {
    setJobConfig(c => ({
      ...c,
      posting: {
        ...c.posting,
        application_fields: { ...c.posting?.application_fields, [key]: val },
      },
    }))
  }

  const togglePerm = (role: 'view_user_ids' | 'edit_user_ids' | 'move_user_ids' | 'feedback_user_ids', uid: number) => {
    const cur = (perm[role] as number[] | undefined) || []
    const next = cur.includes(uid) ? cur.filter(x => x !== uid) : [...cur, uid]
    setJobConfig(c => ({
      ...c,
      permissions: { ...c.permissions, [role]: next },
    }))
  }

  const hasPerm = (role: 'view_user_ids' | 'edit_user_ids' | 'move_user_ids' | 'feedback_user_ids', uid: number) =>
    ((perm[role] as number[] | undefined) || []).includes(uid)

  return (
    <div className="job-editor-page job-editor-page--wizard">
      <nav className="job-editor-breadcrumb" aria-label="Breadcrumb">
        <button type="button" className="job-editor-crumb-link" onClick={() => navigate(jobsBase)}>
          Jobs
        </button>
        <span className="job-editor-crumb-arrow" aria-hidden>
          →
        </span>
        {stepId === 'skills' ? (
          <>
            <button type="button" className="job-editor-crumb-link" onClick={goToBasicInfoStep}>
              {isNew ? form.title.trim() || 'New position' : job?.title || 'Edit position'}
            </button>
            <span className="job-editor-crumb-arrow" aria-hidden>
              →
            </span>
            <span className="job-editor-crumb-current">Configure Skills</span>
          </>
        ) : (
          <span className="job-editor-crumb-current">{isNew ? 'New position' : job?.title || 'Edit position'}</span>
        )}
      </nav>

      {!isNew && loadErr && <div className="auth-error job-editor-inline-alert">{loadErr}</div>}
      {err && <div className="auth-error job-editor-inline-alert">{err}</div>}

      <div className="job-editor-split">
        <div className="job-editor-workspace">
          <article className="job-editor-sheet">
            <header className="job-editor-sheet-head">
              <div className="job-editor-sheet-titles">
                {stepId === 'skills' ? (
                  <>
                    <p className="job-editor-step-kicker">
                      Step {stepIndex + 1} of {visibleSteps.length}: Skill Requirements
                    </p>
                    <div className="job-editor-skills-hero-title">
                      <h1 className="job-editor-page-title">Configure Job Skills</h1>
                      {form.status === 'draft' ? (
                        <span className="job-editor-draft-badge" title="Job is not published yet">
                          Draft
                        </span>
                      ) : null}
                    </div>
                    <p className="job-editor-page-sub">{currentStep?.short}</p>
                  </>
                ) : (
                  <>
                    <p className="job-editor-step-kicker">
                      Step {stepIndex + 1} of {visibleSteps.length}
                      {isNew ? ' · create the job to unlock the remaining steps' : ''}
                    </p>
                    <h1 className="job-editor-page-title">{currentStep?.label}</h1>
                    <p className="job-editor-page-sub">{currentStep?.short}</p>
                  </>
                )}
              </div>
              <div className="job-editor-sheet-head-actions">
                {stepId === 'skills' ? null : isNew ? (
                  <button
                    type="button"
                    className="job-editor-btn-primary"
                    onClick={() => void saveJob()}
                    disabled={saving}
                  >
                    {saving ? 'Creating…' : 'Create job'}
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      className="job-editor-btn-outline"
                      onClick={() => void saveJob()}
                      disabled={saving || !!loadErr}
                    >
                      {saving ? 'Saving…' : 'Save Changes'}
                    </button>
                    <button
                      type="button"
                      className="job-editor-btn-primary"
                      onClick={() => void saveJob()}
                      disabled={saving || !!loadErr}
                    >
                      {saving ? 'Saving…' : 'Save changes'}
                    </button>
                  </>
                )}
              </div>
            </header>

            <div className="job-editor-sheet-body job-editor-sheet-body--step">
              {stepId === 'basic_info' && (
                <section className="job-step-pane job-basic-pane">
                  <div className="job-basic-section job-basic-section--first">
                    <h3 className="job-basic-section-title">Core details</h3>
                    <div className="job-basic-top">
                      <div className="job-basic-title-block">
                        <JobEditorField label="Job title" info="Public job title shown on postings and listings.">
                          <input
                            className="job-editor-input job-editor-input--title"
                            value={form.title}
                            onChange={e => set('title', e.target.value)}
                            placeholder="e.g. Senior Software Engineer"
                            aria-required
                          />
                        </JobEditorField>
                      </div>
                      <div className="job-basic-status-block">
                        <JobEditorField label="Status" info="Draft jobs are internal only. Open enables applications.">
                          <select className="job-editor-select" value={form.status} onChange={e => set('status', e.target.value)}>
                            <option value="draft">Draft</option>
                            <option value="open">Open</option>
                            <option value="paused">Paused</option>
                            <option value="closed">Closed</option>
                          </select>
                        </JobEditorField>
                      </div>
                    </div>
                  </div>

                  <div className="job-basic-section">
                    <h3 className="job-basic-section-title">Location &amp; mode</h3>
                    <div className="job-basic-grid">
                      <JobEditorField
                        label="Department"
                        hint="Workspace list (Settings → General)."
                        info="Organizational unit for reporting and filters."
                      >
                        <select
                          className="job-editor-select"
                          value={
                            !form.department
                              ? ''
                              : departmentOptions.some(d => d.name === form.department)
                                ? form.department
                                : `__legacy_dept__${form.department}`
                          }
                          onChange={e => {
                            const v = e.target.value
                            set('department', v.startsWith('__legacy_dept__') ? v.slice(15) : v)
                          }}
                        >
                          <option value="">Select…</option>
                          {departmentOptions.map(d => (
                            <option key={d.id} value={d.name}>
                              {d.name}
                            </option>
                          ))}
                          {form.department && !departmentOptions.some(d => d.name === form.department) ? (
                            <option value={`__legacy_dept__${form.department}`}>
                              {form.department} (legacy)
                            </option>
                          ) : null}
                        </select>
                      </JobEditorField>
                      <JobEditorField
                        label="Location"
                        hint="Enabled countries (Settings → General)."
                        info="Primary location shown to candidates."
                      >
                        <select
                          className="job-editor-select"
                          value={
                            !form.location
                              ? ''
                              : locationOptions.some(c => c.name === form.location)
                                ? form.location
                                : `__legacy_loc__${form.location}`
                          }
                          onChange={e => {
                            const v = e.target.value
                            set('location', v.startsWith('__legacy_loc__') ? v.slice(14) : v)
                          }}
                        >
                          <option value="">Select…</option>
                          {locationOptions.map(c => (
                            <option key={c.code} value={c.name}>
                              {c.name}
                            </option>
                          ))}
                          {form.location && !locationOptions.some(c => c.name === form.location) ? (
                            <option value={`__legacy_loc__${form.location}`}>{form.location} (legacy)</option>
                          ) : null}
                        </select>
                      </JobEditorField>
                      <JobEditorField label="Work mode" info="On-site, remote, or hybrid expectations.">
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
                    </div>
                  </div>

                  <div className="job-basic-section">
                    <h3 className="job-basic-section-title">Role characteristics</h3>
                    <div className="job-basic-grid job-basic-grid--pair">
                      <JobEditorField label="Employment">
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
                      <JobEditorField label="Experience">
                        <select
                          className="job-editor-select"
                          value={form.experience_level}
                          onChange={e => set('experience_level', e.target.value)}
                        >
                          <option value="">Any</option>
                          <option value="0-1">0–1 yr</option>
                          <option value="2-5">2–5 yr</option>
                          <option value="6-10">6–10 yr</option>
                          <option value="10+">10+ yr</option>
                        </select>
                      </JobEditorField>
                    </div>
                  </div>

                  <div className="job-basic-section">
                    <h3 className="job-basic-section-title">Requirements</h3>
                    <div className="job-basic-grid job-basic-grid--headcount">
                      <JobEditorField label="Headcount" info="Number of open seats for this requisition.">
                        <input
                          className="job-editor-input"
                          type="number"
                          min={1}
                          value={form.open_positions}
                          onChange={e => set('open_positions', e.target.value)}
                        />
                      </JobEditorField>
                    </div>
                  </div>

                  {jobAttrDefs.length > 0 && (
                    <div className="job-basic-section">
                      <h3 className="job-basic-section-title">Custom fields</h3>
                      <CustomAttributeFields
                        definitions={jobAttrDefs}
                        values={jobCustomFields}
                        onChange={setJobCustomFields}
                        disabled={saving}
                        idPrefix="job-cf"
                      />
                    </div>
                  )}
                  {!isNew && job && (
                    <div className="job-basic-section">
                      <h3 className="job-basic-section-title">Labels</h3>
                      <LabelMultiSelect
                        catalog={labelCatalog}
                        selectedIds={new Set((job.labels ?? []).map(l => l.id))}
                        disabled={savingJobLabels || saving}
                        emptyHint="No labels yet — add them under Settings → Labels."
                        onToggle={(id, checked) => void toggleJobLabel(id, checked)}
                      />
                    </div>
                  )}

                  <div className="job-basic-section job-basic-section--description">
                    <h3 className="job-basic-section-title">Description</h3>
                    <p className="job-basic-section-lead">Public-facing copy for the posting. Use headings and bullets for skimmability.</p>
                    <div className="job-editor-description-wrap job-editor-description-wrap--basic">
                      <RichTextEditor
                        value={form.descriptionHtml}
                        onChange={html => setForm(f => ({ ...f, descriptionHtml: html }))}
                        placeholder="Role mission, responsibilities, requirements…"
                        minHeight={isNew ? 220 : 240}
                      />
                    </div>
                  </div>

                  {!isNew && job && (
                    <footer className="job-basic-slug-foot">
                      <span className="job-basic-slug-label">URL slug</span>
                      <code className="job-basic-slug-code">{job.slug}</code>
                    </footer>
                  )}
                </section>
              )}

              {stepId === 'skills' && (
                <section className="job-step-pane job-skills-pane" aria-labelledby="step-skills">
                  <h2 id="step-skills" className="visually-hidden">
                    Configure job skills
                  </h2>
                  <div className="job-skills-card">
                    <div className="job-skills-columns">
                      <SkillPickerColumn
                        panel
                        label="Required skills"
                        eyebrow="Required skills"
                        panelTitle="Must-Haves for the Role"
                        panelHint="Select minimum proficiency and mandatory skills."
                        searchPlaceholder="Search tags"
                        selected={skillsRequired}
                        onChange={setSkillsRequired}
                        variant="required"
                      />
                      <SkillPickerColumn
                        panel
                        label="Nice-to-have skills"
                        eyebrow="Nice-to-have skills"
                        panelTitle="Bonus Strengths & Extra Value"
                        panelHint="Add non-mandatory skills that strengthen a candidate profile."
                        searchPlaceholder="Add non-mandatory skills…"
                        searchTone="nice"
                        selected={skillsNice}
                        onChange={setSkillsNice}
                        variant="nice"
                      />
                    </div>
                    <div className="job-skills-bottom">
                      <SkillsRecommendedRow
                        catalog={SKILL_CATALOG}
                        skillsRequired={skillsRequired}
                        skillsNice={skillsNice}
                        onAddRequired={addSkillToRequired}
                      />
                      <SkillsMatchingImpact requiredCount={skillsRequired.length} niceCount={skillsNice.length} />
                    </div>
                  </div>
                  <footer className="job-skills-footer">
                    <button
                      type="button"
                      className="job-editor-btn-outline job-skills-footer-discard"
                      onClick={discardSkills}
                      disabled={saving}
                    >
                      Discard changes
                    </button>
                    <button
                      type="button"
                      className="job-editor-btn-primary job-skills-footer-continue"
                      onClick={() => void saveAndProceed()}
                      disabled={saving || (!isNew && !!loadErr)}
                    >
                      {saving ? 'Saving…' : 'Save and Continue'}
                      <span className="job-skills-footer-arrow" aria-hidden>
                        →
                      </span>
                    </button>
                  </footer>
                </section>
              )}

              {stepId === 'compensation' && (
                <section className="job-step-pane job-compensation-pane">
                  <div className="job-compensation-card">
                    <div className="job-compensation-card-head">
                      <h2 className="job-compensation-card-title">Salary &amp; visibility</h2>
                      <p className="job-compensation-card-lead">
                        Amounts use whole numbers in {form.salary_currency || accountDefaultCurrency}. Currency defaults
                        from your workspace (Settings → Organization).
                      </p>
                    </div>
                    <div className="job-compensation-grid job-editor-grid-2">
                      <JobEditorField
                        label="Salary min"
                        hint="Digits only — annual or period amount for your org."
                      >
                        <input
                          className="job-editor-input job-editor-input--salary"
                          type="text"
                          inputMode="numeric"
                          autoComplete="off"
                          value={form.salary_min}
                          onChange={e => set('salary_min', sanitizeSalaryDigits(e.target.value))}
                          placeholder="e.g. 120000"
                        />
                      </JobEditorField>
                      <JobEditorField
                        label="Salary max"
                        hint="Digits only — should be ≥ min when both set."
                      >
                        <input
                          className="job-editor-input job-editor-input--salary"
                          type="text"
                          inputMode="numeric"
                          autoComplete="off"
                          value={form.salary_max}
                          onChange={e => set('salary_max', sanitizeSalaryDigits(e.target.value))}
                          placeholder="e.g. 160000"
                        />
                      </JobEditorField>
                      <JobEditorField
                        label="Currency"
                        hint={
                          orgSettings
                            ? `Workspace default: ${accountDefaultCurrency}. Override per job if needed.`
                            : 'Loads from workspace Settings → Organization when available.'
                        }
                      >
                        <select
                          className="job-editor-select job-compensation-select"
                          value={form.salary_currency}
                          onChange={e => set('salary_currency', e.target.value)}
                          aria-label="Salary currency"
                        >
                          {currencyOptions.map(c => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </JobEditorField>
                      <JobEditorField label="Show salary on posting">
                        <label className="job-checkbox-label job-compensation-checkbox">
                          <input
                            type="checkbox"
                            checked={form.salary_visible}
                            onChange={e => set('salary_visible', e.target.checked)}
                          />
                          Visible to candidates
                        </label>
                      </JobEditorField>
                    </div>

                    <div className="job-compensation-divider" aria-hidden />

                    <div className="job-compensation-grid job-editor-grid-2">
                      <JobEditorField label="Bonus / incentives">
                        <textarea
                          className="job-editor-input job-compensation-textarea"
                          rows={3}
                          value={form.bonus_incentives}
                          onChange={e => set('bonus_incentives', e.target.value)}
                          placeholder="OTE, equity, signing bonus…"
                        />
                      </JobEditorField>
                      <JobEditorField label="Budget approval status">
                        <select
                          className="job-editor-select job-compensation-select"
                          value={form.budget_approval_status}
                          onChange={e => set('budget_approval_status', e.target.value)}
                        >
                          <option value="">—</option>
                          <option value="draft">Draft</option>
                          <option value="pending">Pending approval</option>
                          <option value="approved">Approved</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      </JobEditorField>
                      <JobEditorField label="Cost center">
                        <input
                          className="job-editor-input"
                          value={form.cost_center}
                          onChange={e => set('cost_center', e.target.value)}
                        />
                      </JobEditorField>
                      <JobEditorField label="Hiring budget ID">
                        <input
                          className="job-editor-input"
                          value={form.hiring_budget_id}
                          onChange={e => set('hiring_budget_id', e.target.value)}
                          placeholder="FIN-REQ-1024"
                        />
                      </JobEditorField>
                    </div>
                  </div>
                </section>
              )}

              {stepId === 'referral' && (
                <section className="job-step-pane" aria-labelledby="step-referral">
                  <h2 id="step-referral" className="visually-hidden">
                    Employee referrals
                  </h2>
                  <p className="job-editor-step-lead" style={{ marginTop: 0 }}>
                    Configure referral bonus rules for this job. Workspace defaults (notifications, HRIS webhook, public URL
                    base) live in <strong>Settings → General → Referral program</strong>.
                  </p>
                  <label className="job-checkbox-label" style={{ marginBottom: 16 }}>
                    <input
                      type="checkbox"
                      checked={referralSettings.enabled}
                      onChange={e => setReferralSettings(s => ({ ...s, enabled: e.target.checked }))}
                    />
                    Referrals enabled for this job
                  </label>
                  <div className="job-editor-grid-2">
                    <JobEditorField label="Referral bonus amount (leave empty for no automatic bonus row)">
                      <input
                        className="job-editor-input"
                        type="number"
                        min={0}
                        step="0.01"
                        value={referralSettings.bonus_amount}
                        onChange={e => setReferralSettings(s => ({ ...s, bonus_amount: e.target.value }))}
                        placeholder="5000"
                      />
                    </JobEditorField>
                    <JobEditorField label="Currency">
                      <input
                        className="job-editor-input"
                        value={referralSettings.currency}
                        onChange={e => setReferralSettings(s => ({ ...s, currency: e.target.value.toUpperCase() }))}
                        placeholder="USD"
                      />
                    </JobEditorField>
                    <JobEditorField label="Probation days (after hire before bonus eligible)">
                      <input
                        className="job-editor-input"
                        type="number"
                        min={0}
                        value={referralSettings.probation_days}
                        onChange={e => setReferralSettings(s => ({ ...s, probation_days: e.target.value }))}
                      />
                    </JobEditorField>
                    <JobEditorField label="Min. referrer tenure (days at company)">
                      <input
                        className="job-editor-input"
                        type="number"
                        min={0}
                        value={referralSettings.min_referrer_tenure_days}
                        onChange={e => setReferralSettings(s => ({ ...s, min_referrer_tenure_days: e.target.value }))}
                      />
                    </JobEditorField>
                  </div>
                  {hasPostCreateSteps && (
                    <div className="job-editor-card" style={{ marginTop: 16 }}>
                      <h3 className="job-editor-card-title">Your referral link</h3>
                      <p className="job-editor-step-lead" style={{ marginTop: 4 }}>
                        Generates a unique <code>?ref=</code> token for your account user on this job. Save the job first if
                        you changed settings above.
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                        <button
                          type="button"
                          className="job-editor-btn-primary"
                          onClick={() => void fetchMyReferralLink()}
                          disabled={referralLinkLoading}
                        >
                          {referralLinkLoading ? 'Loading…' : 'Get or create my link'}
                        </button>
                        {referralShareUrl && (
                          <input
                            className="job-editor-input"
                            readOnly
                            value={referralShareUrl}
                            style={{ flex: 1, minWidth: 200 }}
                            onFocus={e => e.target.select()}
                          />
                        )}
                        {referralShareUrl && (
                          <button
                            type="button"
                            className="job-editor-btn-primary"
                            style={{
                              background: 'var(--surface-elevated, #f1f5f9)',
                              color: 'var(--text)',
                              boxShadow: 'none',
                            }}
                            onClick={() => {
                              void navigator.clipboard.writeText(referralShareUrl)
                              toast.success('Copied', 'Referral URL copied to clipboard.')
                            }}
                          >
                            Copy
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </section>
              )}

              {stepId === 'hiring_team' && (
                <section className="job-step-pane">
                  <div className="job-editor-grid-2">
                    <JobEditorField label="Hiring manager">
                      <select
                        className="job-editor-select"
                        value={form.hiring_manager_user_id}
                        onChange={e => set('hiring_manager_user_id', e.target.value)}
                      >
                        <option value="">—</option>
                        {members.map(m => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.email})
                          </option>
                        ))}
                      </select>
                    </JobEditorField>
                    <JobEditorField label="Recruiter / HR owner">
                      <select
                        className="job-editor-select"
                        value={form.recruiter_user_id}
                        onChange={e => set('recruiter_user_id', e.target.value)}
                      >
                        <option value="">—</option>
                        {members.map(m => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.email})
                          </option>
                        ))}
                      </select>
                    </JobEditorField>
                  </div>
                  <p className="job-editor-step-lead">
                    Interview panel and rounds are configured in <strong>Interview configuration</strong> after the job
                    exists—plans, kits, and assignments tie to this <code>job_id</code>.
                  </p>
                </section>
              )}

              {stepId === 'pipeline' && hasPostCreateSteps && (
                <section className="job-step-pane">
                  <PipelineStageRulesSection token={token} jobId={numericId!} />
                </section>
              )}

              {stepId === 'interview' && hasPostCreateSteps && (
                <section className="job-step-pane">
                  <InterviewPanelSection
                    token={token}
                    jobId={numericId!}
                    interviewDefaults={jobConfig.interview_defaults || {}}
                    setInterviewDefaults={setInterviewDefaults}
                  />
                </section>
              )}

              {stepId === 'evaluation' && hasPostCreateSteps && (
                <section className="job-step-pane">
                  <JobScorecardCriteriaEditor token={token} jobId={numericId!} />
                  <div className="job-editor-card" style={{ marginTop: 16 }}>
                    <h3 className="job-editor-card-title">Feedback template & scale</h3>
                    <JobEditorField label="Rating scale / rubric note">
                      <textarea
                        className="job-editor-input"
                        rows={2}
                        value={evaluation.rating_scale_note ?? ''}
                        onChange={e =>
                          setJobConfig(c => ({
                            ...c,
                            evaluation: { ...c.evaluation, rating_scale_note: e.target.value },
                          }))
                        }
                        placeholder="1–5 per attribute; strong hire / no hire for recommendation…"
                      />
                    </JobEditorField>
                    <JobEditorField label="Feedback form template (notes)">
                      <textarea
                        className="job-editor-input"
                        rows={4}
                        value={evaluation.feedback_template ?? ''}
                        onChange={e =>
                          setJobConfig(c => ({
                            ...c,
                            evaluation: { ...c.evaluation, feedback_template: e.target.value },
                          }))
                        }
                        placeholder="Prompts for pros/cons, bias check…"
                      />
                    </JobEditorField>
                    <label className="job-checkbox-label">
                      <input
                        type="checkbox"
                        checked={evaluation.mandatory_fields_before_submit === true}
                        onChange={e =>
                          setJobConfig(c => ({
                            ...c,
                            evaluation: { ...c.evaluation, mandatory_fields_before_submit: e.target.checked },
                          }))
                        }
                      />
                      Require all rubric fields before scorecard submit
                    </label>
                  </div>
                </section>
              )}

              {stepId === 'posting' && hasPostCreateSteps && (
                <section className="job-step-pane">
                  <div className="job-editor-card">
                    <h3 className="job-editor-card-title">Visibility</h3>
                    <JobEditorField label="Audience">
                      <select
                        className="job-editor-select"
                        value={posting.visibility ?? 'internal'}
                        onChange={e =>
                          setJobConfig(c => ({ ...c, posting: { ...c.posting, visibility: e.target.value } }))
                        }
                      >
                        <option value="internal">Internal only</option>
                        <option value="external">External + internal</option>
                        <option value="careers">Careers page</option>
                      </select>
                    </JobEditorField>
                    <p className="job-editor-muted">
                      Job <strong>status</strong> (draft / open / closed) is on the Basic step—this controls audience
                      segmentation in config for integrations.
                    </p>
                  </div>
                  <div className="job-editor-card">
                    <h3 className="job-editor-card-title">Job board targets</h3>
                    <p className="job-card-microcopy">Select boards you intend to publish to (integration wiring uses these IDs).</p>
                    <div className="job-board-checkboxes">
                      {boards.map(b => (
                        <label key={b.id} className="job-checkbox-label">
                          <input type="checkbox" checked={boardIds.has(b.id)} onChange={() => toggleBoard(b.id)} />
                          {b.name}
                        </label>
                      ))}
                      {boards.length === 0 && <p className="job-editor-muted">No active job boards in the account.</p>}
                    </div>
                  </div>
                  <div className="job-editor-card">
                    <h3 className="job-editor-card-title">Application form fields</h3>
                    {(['resume', 'cover_letter', 'portfolio', 'linkedin'] as const).map(key => (
                      <label key={key} className="job-checkbox-label">
                        <input
                          type="checkbox"
                          checked={appFields[key] === true}
                          onChange={e => setAppField(key, e.target.checked)}
                        />
                        {key.replace('_', ' ')}
                      </label>
                    ))}
                  </div>
                </section>
              )}

              {stepId === 'automation' && (
                <section className="job-step-pane">
                  <div className="job-editor-card">
                    <label className="job-checkbox-label">
                      <input
                        type="checkbox"
                        checked={automation.ai_scoring_enabled === true}
                        onChange={e =>
                          setJobConfig(c => ({
                            ...c,
                            automation: { ...c.automation, ai_scoring_enabled: e.target.checked },
                          }))
                        }
                      />
                      Enable AI scoring / ranking (when worker is configured)
                    </label>
                    <JobEditorField label="Auto resume screening rules">
                      <textarea
                        className="job-editor-input"
                        rows={4}
                        value={(automation.resume_screening_rules as string) ?? ''}
                        onChange={e =>
                          setJobConfig(c => ({
                            ...c,
                            automation: { ...c.automation, resume_screening_rules: e.target.value },
                          }))
                        }
                        placeholder="Keywords, minimum years, degree requirements…"
                      />
                    </JobEditorField>
                    <JobEditorField label="Interview invite email template (notes)">
                      <textarea
                        className="job-editor-input"
                        rows={2}
                        value={(automation.interview_invite_template as string) ?? ''}
                        onChange={e =>
                          setJobConfig(c => ({
                            ...c,
                            automation: { ...c.automation, interview_invite_template: e.target.value },
                          }))
                        }
                      />
                    </JobEditorField>
                    <JobEditorField label="Rejection email template (notes)">
                      <textarea
                        className="job-editor-input"
                        rows={2}
                        value={(automation.rejection_template as string) ?? ''}
                        onChange={e =>
                          setJobConfig(c => ({
                            ...c,
                            automation: { ...c.automation, rejection_template: e.target.value },
                          }))
                        }
                      />
                    </JobEditorField>
                    <JobEditorField label="Follow-up template (notes)">
                      <textarea
                        className="job-editor-input"
                        rows={2}
                        value={(automation.followup_template as string) ?? ''}
                        onChange={e =>
                          setJobConfig(c => ({
                            ...c,
                            automation: { ...c.automation, followup_template: e.target.value },
                          }))
                        }
                      />
                    </JobEditorField>
                    <JobEditorField label="SLA: review within (hours)">
                      <input
                        className="job-editor-input"
                        type="number"
                        min={1}
                        value={automation.sla_review_hours ?? ''}
                        onChange={e =>
                          setJobConfig(c => ({
                            ...c,
                            automation: {
                              ...c.automation,
                              sla_review_hours: e.target.value === '' ? undefined : Number(e.target.value),
                            },
                          }))
                        }
                        placeholder="48"
                      />
                    </JobEditorField>
                  </div>
                </section>
              )}

              {stepId === 'analytics' && hasPostCreateSteps && (
                <section className="job-step-pane">
                  <JobAnalyticsSection token={token} jobId={numericId!} />
                </section>
              )}

              {stepId === 'attachments' && hasPostCreateSteps && (
                <section className="job-step-pane">
                  <JobAttachmentsSection token={token} jobId={numericId!} onChanged={() => refreshJob(numericId!)} />
                </section>
              )}

              {stepId === 'permissions' && (
                <section className="job-step-pane">
                  <p className="job-editor-step-lead">
                    Stored in <code>job_config.permissions</code>. Enforcement in API routes can be added per your RBAC
                    model.
                  </p>
                  <div className="job-editor-card job-perm-table-wrap">
                    <table className="job-perm-table">
                      <thead>
                        <tr>
                          <th>Member</th>
                          <th>View</th>
                          <th>Edit</th>
                          <th>Move</th>
                          <th>Feedback</th>
                        </tr>
                      </thead>
                      <tbody>
                        {members.map(m => (
                          <tr key={m.id}>
                            <td>
                              {m.name}
                              <div className="job-editor-muted" style={{ fontSize: 12 }}>
                                {m.email}
                              </div>
                            </td>
                            {(['view_user_ids', 'edit_user_ids', 'move_user_ids', 'feedback_user_ids'] as const).map(
                              role => (
                                <td key={role}>
                                  <input
                                    type="checkbox"
                                    checked={hasPerm(role, m.id)}
                                    onChange={() => togglePerm(role, m.id)}
                                  />
                                </td>
                              ),
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {members.length === 0 && <p className="job-editor-muted">No account members loaded.</p>}
                  </div>
                </section>
              )}

              {stepId === 'compliance' && (
                <section className="job-step-pane">
                  <div className="job-editor-grid-2">
                    <JobEditorField label="Requisition / job ID">
                      <input
                        className="job-editor-input"
                        value={form.requisition_id}
                        onChange={e => set('requisition_id', e.target.value)}
                        placeholder="REQ-2026-0042"
                      />
                    </JobEditorField>
                    <JobEditorField label="Tags" hint="Comma-separated (urgent, campus, …).">
                      <input className="job-editor-input" value={form.tagsStr} onChange={e => set('tagsStr', e.target.value)} />
                    </JobEditorField>
                  </div>
                  <JobEditorField label="Diversity / EEO notes">
                    <textarea
                      className="job-editor-input"
                      rows={3}
                      value={compliance.eeo_note ?? ''}
                      onChange={e =>
                        setJobConfig(c => ({
                          ...c,
                          compliance: { ...c.compliance, eeo_note: e.target.value },
                        }))
                      }
                    />
                  </JobEditorField>
                  <JobEditorField label="Approval workflow (HR → Finance → Manager)">
                    <textarea
                      className="job-editor-input"
                      rows={3}
                      value={compliance.approval_workflow ?? ''}
                      onChange={e =>
                        setJobConfig(c => ({
                          ...c,
                          compliance: { ...c.compliance, approval_workflow: e.target.value },
                        }))
                      }
                      placeholder="Describe approvers and order…"
                    />
                  </JobEditorField>
                </section>
              )}
            </div>
          </article>
        </div>

        <aside className="job-editor-rail" aria-label="Job setup steps">
          <div className="job-editor-rail-inner">
            <h2 className="job-rail-heading">Setup</h2>
            <ol className="job-stepper job-stepper--twelve job-stepper--connected" role="list">
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

            {isNew && (
              <div className="job-rail-callout">
                Four steps before create: basics, <strong>skills</strong>, compensation, and hiring team. Then the full
                editor opens at <strong>Pipeline</strong>.
              </div>
            )}

            <div className="job-rail-context">
              <h3 className="job-rail-context-title">{currentStep?.railTitle}</h3>
              <p className="job-rail-context-body">{currentStep?.railBody}</p>
            </div>

            <button
              type="button"
              className="job-rail-cta"
              onClick={() => void saveAndProceed()}
              disabled={saving || (!isNew && !!loadErr)}
            >
              {saving ? 'Saving…' : stepIndex >= visibleSteps.length - 1 ? 'Save changes' : 'Save and Proceed'}
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
                disabled={stepIndex >= visibleSteps.length - 1}
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

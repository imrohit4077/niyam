import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useOutletContext, useParams, useSearchParams } from 'react-router-dom'
import { applicationsApi, type Application } from '../api/applications'
import { jobsApi, type Job } from '../api/jobs'
import { pipelineStagesApi, type PipelineStage } from '../api/pipelineStages'
import { esignApi, type EsignRequestRow, type EsignTemplate } from '../api/esign'
import { scorecardsApi, type ScorecardRow } from '../api/scorecards'
import type { DashboardOutletContext } from '../layouts/DashboardOutletContext'
import { useToast } from '../contexts/ToastContext'
import CustomAttributeFields from '../components/CustomAttributeFields'
import LabelMultiSelect from '../components/LabelMultiSelect'
import { customAttributesApi, type CustomAttributeDefinition } from '../api/customAttributes'
import { labelsApi, type AccountLabelRow } from '../api/labels'

const STAGES = ['applied', 'screening', 'interview', 'offer', 'hired', 'rejected', 'withdrawn'] as const

const BADGE: Record<string, string> = {
  applied: 'app-cand-badge app-cand-badge--blue',
  screening: 'app-cand-badge app-cand-badge--amber',
  interview: 'app-cand-badge app-cand-badge--indigo',
  offer: 'app-cand-badge app-cand-badge--green',
  hired: 'app-cand-badge app-cand-badge--green',
  rejected: 'app-cand-badge app-cand-badge--red',
  withdrawn: 'app-cand-badge app-cand-badge--slate',
}

const SCORE_TAG: Record<string, string> = {
  strong_yes: 'tag-green',
  yes: 'tag-blue',
  maybe: 'tag-orange',
  no: 'tag-orange',
  strong_no: 'tag-red',
}

const DETAIL_TABS = [
  { id: 'profile', label: 'Profile', desc: 'Contact & application materials' },
  { id: 'pipeline', label: 'Pipeline', desc: 'Stage, column & automation' },
  { id: 'esign', label: 'E-sign', desc: 'Documents & signing links' },
  { id: 'interviews', label: 'Interviews', desc: 'Scorecards & feedback' },
] as const

type DetailTabId = (typeof DETAIL_TABS)[number]['id']

function signingHref(url: string | null) {
  if (!url) return ''
  return url.startsWith('http') ? url : `${window.location.origin}${url}`
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="app-cand-field">
      <label className="app-cand-label">
        {label}
        {hint && <span className="app-cand-label-hint">{hint}</span>}
      </label>
      {children}
    </div>
  )
}

export default function ApplicationDetailPage() {
  const { token, accountId } = useOutletContext<DashboardOutletContext>()
  const { applicationId: appIdParam } = useParams<{ applicationId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()
  const appId = appIdParam ? Number(appIdParam) : NaN

  const [app, setApp] = useState<Application | null>(null)
  const [labelCatalog, setLabelCatalog] = useState<AccountLabelRow[]>([])
  const [savingAppLabels, setSavingAppLabels] = useState(false)
  const [job, setJob] = useState<Job | null>(null)
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [esignRows, setEsignRows] = useState<EsignRequestRow[]>([])
  const [templates, setTemplates] = useState<EsignTemplate[]>([])
  const [scoreRows, setScoreRows] = useState<ScorecardRow[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  const [candidateName, setCandidateName] = useState('')
  const [candidateEmail, setCandidateEmail] = useState('')
  const [candidatePhone, setCandidatePhone] = useState('')
  const [candidateLocation, setCandidateLocation] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [portfolioUrl, setPortfolioUrl] = useState('')
  const [resumeUrl, setResumeUrl] = useState('')
  const [coverLetter, setCoverLetter] = useState('')
  const [rejectionNote, setRejectionNote] = useState('')
  const [tagsText, setTagsText] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [custDefs, setCustDefs] = useState<CustomAttributeDefinition[]>([])
  const [custAttr, setCustAttr] = useState<Record<string, unknown>>({})

  const [stageStatus, setStageStatus] = useState<string>('applied')
  const [pipelineStageId, setPipelineStageId] = useState<number | ''>('')
  const [savingStage, setSavingStage] = useState(false)

  const [pickTemplateId, setPickTemplateId] = useState<number | ''>('')
  const [genRules, setGenRules] = useState(false)
  const [genTpl, setGenTpl] = useState(false)

  const backHref = `/account/${accountId}/job-applications`
  const docsHref = `/account/${accountId}/esign-documents`

  const tabParam = searchParams.get('tab') ?? 'profile'
  const activeTab: DetailTabId = DETAIL_TABS.some(t => t.id === tabParam) ? (tabParam as DetailTabId) : 'profile'

  const setDetailTab = (id: DetailTabId) => {
    setSearchParams(
      prev => {
        const p = new URLSearchParams(prev)
        p.set('tab', id)
        return p
      },
      { replace: true },
    )
  }

  const load = useCallback(async () => {
    if (!token || !Number.isFinite(appId)) return
    setLoading(true)
    setErr('')
    try {
      const row = await applicationsApi.get(token, appId)
      setApp(row)
      setCandidateName(row.candidate_name ?? '')
      setCandidateEmail(row.candidate_email)
      setCandidatePhone(row.candidate_phone ?? '')
      setCandidateLocation(row.candidate_location ?? '')
      setLinkedinUrl(row.linkedin_url ?? '')
      setPortfolioUrl(row.portfolio_url ?? '')
      setResumeUrl(row.resume_url ?? '')
      setCoverLetter(row.cover_letter ?? '')
      setRejectionNote(row.rejection_note ?? '')
      setTagsText(Array.isArray(row.tags) ? row.tags.join(', ') : '')
      setStageStatus(row.status)
      setPipelineStageId(row.pipeline_stage_id ?? '')

      const j = await jobsApi.get(token, row.job_id)
      setJob(j)
      const st = await pipelineStagesApi.listByJob(token, row.job_id)
      setStages(st.sort((a, b) => a.position - b.position))

      try {
        setEsignRows(await esignApi.listRequestsForApplication(token, appId))
      } catch {
        setEsignRows([])
      }
      try {
        setTemplates(await esignApi.listTemplates(token))
      } catch {
        setTemplates([])
      }
      try {
        setScoreRows(await scorecardsApi.forApplication(token, appId))
      } catch {
        setScoreRows([])
      }

      try {
        const defs = await customAttributesApi.list(token, 'application')
        setCustDefs(defs)
        const base =
          row.custom_attributes && typeof row.custom_attributes === 'object' && !Array.isArray(row.custom_attributes)
            ? { ...(row.custom_attributes as Record<string, unknown>) }
            : {}
        for (const d of defs) {
          if (d.field_type === 'boolean' && base[d.attribute_key] === undefined) base[d.attribute_key] = false
        }
        setCustAttr(base)
      } catch {
        setCustDefs([])
        setCustAttr({})
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Failed to load')
      setApp(null)
    } finally {
      setLoading(false)
    }
  }, [token, appId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!token) return
    labelsApi
      .list(token)
      .then(setLabelCatalog)
      .catch(() => setLabelCatalog([]))
  }, [token])

  const toggleAppLabel = async (labelId: number, next: boolean) => {
    if (!token || !app) return
    const cur = new Set((app.labels ?? []).map(l => l.id))
    if (next) cur.add(labelId)
    else cur.delete(labelId)
    setSavingAppLabels(true)
    try {
      const { labels } = await labelsApi.setApplicationLabels(
        token,
        app.id,
        Array.from(cur).sort((a, b) => a - b),
      )
      setApp(a => (a ? { ...a, labels } : a))
      toast.success('Labels updated')
    } catch (e: unknown) {
      toast.error('Could not update labels', e instanceof Error ? e.message : undefined)
    } finally {
      setSavingAppLabels(false)
    }
  }

  const saveProfile = async () => {
    if (!token || !app) return
    setSavingProfile(true)
    try {
      const tags = tagsText
        .split(',')
        .map(t => t.trim())
        .filter(Boolean)
      const next = await applicationsApi.patch(token, app.id, {
        candidate_name: candidateName.trim() || null,
        candidate_email: candidateEmail.trim(),
        candidate_phone: candidatePhone.trim() || null,
        candidate_location: candidateLocation.trim() || null,
        linkedin_url: linkedinUrl.trim() || null,
        portfolio_url: portfolioUrl.trim() || null,
        resume_url: resumeUrl.trim() || null,
        cover_letter: coverLetter.trim() || null,
        rejection_note: rejectionNote.trim() || null,
        tags,
        custom_attributes: custAttr,
      })
      setApp(next)
      if (next.custom_attributes && typeof next.custom_attributes === 'object' && !Array.isArray(next.custom_attributes)) {
        setCustAttr({ ...(next.custom_attributes as Record<string, unknown>) })
      }
      toast.success('Saved', 'Candidate profile updated.')
    } catch (e: unknown) {
      toast.error('Save failed', e instanceof Error ? e.message : 'Failed')
    } finally {
      setSavingProfile(false)
    }
  }

  const saveStage = async () => {
    if (!token || !app) return
    setSavingStage(true)
    try {
      const next = await applicationsApi.updateStage(token, app.id, {
        status: stageStatus,
        pipeline_stage_id: pipelineStageId === '' ? null : Number(pipelineStageId),
      })
      setApp(next)
      setStageStatus(next.status)
      setPipelineStageId(next.pipeline_stage_id ?? '')
      try {
        setEsignRows(await esignApi.listRequestsForApplication(token, app.id))
      } catch {
        /* ignore */
      }
      toast.success('Pipeline saved', 'Stage and column updated.')
    } catch (e: unknown) {
      toast.error('Could not save', e instanceof Error ? e.message : 'Failed')
    } finally {
      setSavingStage(false)
    }
  }

  const generateFromRules = async () => {
    if (!token || !app) return
    setGenRules(true)
    try {
      await esignApi.generateForApplication(token, app.id, {})
      setEsignRows(await esignApi.listRequestsForApplication(token, app.id))
      toast.success('Documents generated', 'Merged copies are stored and listed below.')
    } catch (e: unknown) {
      toast.error('Generation failed', e instanceof Error ? e.message : 'Failed')
    } finally {
      setGenRules(false)
    }
  }

  const generateFromTemplate = async () => {
    if (!token || !app || pickTemplateId === '') return
    setGenTpl(true)
    try {
      await esignApi.generateForApplication(token, app.id, { template_id: Number(pickTemplateId) })
      setEsignRows(await esignApi.listRequestsForApplication(token, app.id))
      toast.success('Document generated', 'Signing link is ready below.')
    } catch (e: unknown) {
      toast.error('Generation failed', e instanceof Error ? e.message : 'Failed')
    } finally {
      setGenTpl(false)
    }
  }

  if (!Number.isFinite(appId)) {
    return (
      <div className="app-cand-shell">
        <p className="app-cand-muted">Invalid application.</p>
        <Link to={backHref} className="app-cand-text-link">
          ← Back to applications
        </Link>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="app-cand-loading">
        <div className="spinner" style={{ width: 32, height: 32 }} />
        <span>Loading candidate…</span>
      </div>
    )
  }

  if (err || !app) {
    return (
      <div className="app-cand-shell">
        <p className="app-cand-error">{err || 'Not found'}</p>
        <button type="button" className="btn-app-cand-primary" onClick={() => navigate(backHref)}>
          Back to applications
        </button>
      </div>
    )
  }

  const who = app.candidate_name || app.candidate_email
  const initials = (app.candidate_name || app.candidate_email || '?')
    .split(/\s+/)
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="app-cand-page">
      <section className="app-cand-hero">
        <Link to={backHref} className="app-cand-back">
          ← Applications
        </Link>
        <div className="app-cand-hero-main">
          <div className="app-cand-avatar" aria-hidden>
            {initials}
          </div>
          <div className="app-cand-hero-text">
            <h1 className="app-cand-name">{who}</h1>
            <p className="app-cand-role">
              {job?.title ?? `Job #${app.job_id}`}
              {job?.department ? <span className="app-cand-role-dot">·</span> : null}
              {job?.department ? <span>{job.department}</span> : null}
            </p>
          </div>
          <span className={BADGE[app.status] ?? 'app-cand-badge app-cand-badge--slate'}>{app.status}</span>
        </div>
      </section>

      <div className="app-cand-detail-layout">
        <nav className="app-cand-detail-rail" aria-label="Candidate sections">
          <div className="app-cand-detail-rail-head">
            <p className="app-cand-detail-rail-kicker">Application</p>
            <p className="app-cand-detail-rail-title">Sections</p>
          </div>
          <div className="app-cand-detail-nav">
            {DETAIL_TABS.map(tab => {
              const count =
                tab.id === 'esign'
                  ? esignRows.length
                  : tab.id === 'interviews'
                    ? scoreRows.length
                    : null
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  className={`app-cand-detail-tab${isActive ? ' app-cand-detail-tab--active' : ''}`}
                  onClick={() => setDetailTab(tab.id)}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span className="app-cand-detail-tab-label">
                    {tab.label}
                    {count != null && count > 0 ? <span className="app-cand-detail-tab-count">{count}</span> : null}
                  </span>
                  <span className="app-cand-detail-tab-desc">{tab.desc}</span>
                </button>
              )
            })}
          </div>
        </nav>

        <div className="app-cand-detail-main">
          {activeTab === 'profile' && (
            <section className="app-cand-card app-cand-card--panel">
              <header className="app-cand-card-head">
                <h2 className="app-cand-card-title">Profile</h2>
                <p className="app-cand-card-desc">Contact and application materials—saved to your ATS.</p>
              </header>
              <div className="app-cand-card-body">
                <div className="app-cand-fields">
                  <Field label="Full name">
                    <input className="app-cand-input" value={candidateName} onChange={e => setCandidateName(e.target.value)} />
                  </Field>
                  <Field label="Email" hint="Required">
                    <input
                      className="app-cand-input"
                      type="email"
                      value={candidateEmail}
                      onChange={e => setCandidateEmail(e.target.value)}
                    />
                  </Field>
                  <Field label="Phone">
                    <input className="app-cand-input" value={candidatePhone} onChange={e => setCandidatePhone(e.target.value)} />
                  </Field>
                  <Field label="Location">
                    <input
                      className="app-cand-input"
                      value={candidateLocation}
                      onChange={e => setCandidateLocation(e.target.value)}
                    />
                  </Field>
                  <Field label="LinkedIn">
                    <input
                      className="app-cand-input"
                      value={linkedinUrl}
                      onChange={e => setLinkedinUrl(e.target.value)}
                      placeholder="https://…"
                    />
                  </Field>
                  <Field label="Portfolio">
                    <input
                      className="app-cand-input"
                      value={portfolioUrl}
                      onChange={e => setPortfolioUrl(e.target.value)}
                      placeholder="https://…"
                    />
                  </Field>
                  <Field label="Resume URL">
                    <input className="app-cand-input" value={resumeUrl} onChange={e => setResumeUrl(e.target.value)} placeholder="https://…" />
                  </Field>
                  <Field label="Cover letter">
                    <textarea className="app-cand-textarea" value={coverLetter} onChange={e => setCoverLetter(e.target.value)} rows={4} />
                  </Field>
                  <Field label="Internal notes" hint="Visible to your team only">
                    <textarea
                      className="app-cand-textarea"
                      value={rejectionNote}
                      onChange={e => setRejectionNote(e.target.value)}
                      rows={3}
                    />
                  </Field>
                  <Field label="Tags" hint="Comma-separated">
                    <input
                      className="app-cand-input"
                      value={tagsText}
                      onChange={e => setTagsText(e.target.value)}
                      placeholder="referral, priority, …"
                    />
                  </Field>
                  <Field
                    label="Labels"
                    hint="Workspace labels (Settings → Labels). Search sync runs in the background worker."
                  >
                    <LabelMultiSelect
                      catalog={labelCatalog}
                      selectedIds={new Set((app?.labels ?? []).map(l => l.id))}
                      disabled={savingAppLabels || savingProfile || !app}
                      emptyHint="No labels yet — create them under Settings → Labels."
                      onToggle={(id, checked) => void toggleAppLabel(id, checked)}
                    />
                  </Field>
                  {custDefs.length > 0 && (
                    <Field label="Custom attributes" hint="Settings → Custom fields → Candidate fields">
                      <CustomAttributeFields
                        definitions={custDefs}
                        values={custAttr}
                        onChange={setCustAttr}
                        disabled={savingProfile}
                        idPrefix="app-cf"
                      />
                    </Field>
                  )}
                </div>
                <div className="app-cand-actions">
                  <button type="button" className="btn-app-cand-primary" onClick={() => void saveProfile()} disabled={savingProfile}>
                    {savingProfile ? 'Saving…' : 'Save profile'}
                  </button>
                </div>
              </div>
            </section>
          )}

          {activeTab === 'pipeline' && (
            <section className="app-cand-card app-cand-card--panel">
              <header className="app-cand-card-head">
                <h2 className="app-cand-card-title">Pipeline</h2>
                <p className="app-cand-card-desc">
                  Column drives which automation rules apply. Saving may create documents automatically when rules match this
                  stage.
                </p>
              </header>
              <div className="app-cand-card-body">
                <div className="app-cand-fields app-cand-fields--compact">
                  <Field label="Recruiting status">
                    <select className="app-cand-select" value={stageStatus} onChange={e => setStageStatus(e.target.value)}>
                      {STAGES.map(s => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Board column">
                    <select
                      className="app-cand-select"
                      value={pipelineStageId === '' ? '' : String(pipelineStageId)}
                      onChange={e => setPipelineStageId(e.target.value ? Number(e.target.value) : '')}
                    >
                      <option value="">Unassigned</option>
                      {stages.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                          {s.stage_type ? ` · ${s.stage_type}` : ''}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                <div className="app-cand-actions">
                  <button type="button" className="btn-app-cand-primary" onClick={() => void saveStage()} disabled={savingStage}>
                    {savingStage ? 'Saving…' : 'Save pipeline'}
                  </button>
                </div>
              </div>
            </section>
          )}

          {activeTab === 'esign' && (
            <section className="app-cand-card app-cand-card--panel">
              <header className="app-cand-card-head app-cand-card-head--esign">
                <div>
                  <h2 className="app-cand-card-title">E-sign documents</h2>
                  <p className="app-cand-card-desc">
                    Stored in your workspace with merge fields applied. Generate on demand or rely on rules when the pipeline
                    updates.
                  </p>
                </div>
                <Link to={docsHref} className="btn-app-cand-ghost">
                  View all workspace documents
                </Link>
              </header>
              <div className="app-cand-card-body">
                <div className="app-cand-esign-toolbar">
                  <div className="app-cand-esign-actions">
                    <button
                      type="button"
                      className="btn-app-cand-secondary"
                      onClick={() => void generateFromRules()}
                      disabled={genRules || genTpl}
                    >
                      {genRules ? 'Generating…' : 'Generate for this column'}
                    </button>
                    <span className="app-cand-esign-or">or</span>
                    <div className="app-cand-esign-pick">
                      <select
                        className="app-cand-select app-cand-select--grow"
                        value={pickTemplateId === '' ? '' : String(pickTemplateId)}
                        onChange={e => setPickTemplateId(e.target.value ? Number(e.target.value) : '')}
                      >
                        <option value="">Choose a template…</option>
                        {templates.map(t => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="btn-app-cand-primary"
                        onClick={() => void generateFromTemplate()}
                        disabled={pickTemplateId === '' || genRules || genTpl}
                      >
                        {genTpl ? '…' : 'Generate'}
                      </button>
                    </div>
                  </div>
                  <p className="app-cand-esign-foot">
                    Configure templates and stage rules under{' '}
                    <Link to={`/account/${accountId}/settings/esign`}>Settings → E-sign</Link>.
                  </p>
                </div>

                {esignRows.length === 0 ? (
                  <div className="app-cand-esign-empty">
                    <p>No documents yet for this candidate.</p>
                  </div>
                ) : (
                  <ul className="app-cand-esign-list">
                    {esignRows.map(r => (
                      <li key={r.id} className="app-cand-esign-item">
                        <div className="app-cand-esign-item-main">
                          <span className="app-cand-esign-doc-name">{r.template_name || `Template #${r.template_id ?? '—'}`}</span>
                          <span className={`app-cand-esign-status app-cand-esign-status--${r.status}`}>{r.status}</span>
                        </div>
                        <div className="app-cand-esign-item-meta">
                          {r.sent_at && <span>Sent {new Date(r.sent_at).toLocaleString()}</span>}
                          {r.signed_at && <span>Signed {new Date(r.signed_at).toLocaleString()}</span>}
                        </div>
                        {r.signing_url && (
                          <a className="app-cand-esign-link" href={signingHref(r.signing_url)} target="_blank" rel="noreferrer">
                            Open candidate signing page
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          )}

          {activeTab === 'interviews' && (
            <section className="app-cand-card app-cand-card--panel">
              <header className="app-cand-card-head">
                <h2 className="app-cand-card-title">Interview scorecards</h2>
                <p className="app-cand-card-desc">Structured feedback from interviewers for this candidate.</p>
              </header>
              <div className="app-cand-card-body">
                {scoreRows.length === 0 ? (
                  <p className="app-cand-muted">No scorecards submitted yet.</p>
                ) : (
                  <div className="app-cand-scorecards">
                    {scoreRows.map(sc => {
                      const scores = sc.scores ?? sc.criteria_scores ?? {}
                      const entries = Object.entries(scores)
                      return (
                        <div key={sc.id} className="scorecard-summary-card">
                          <div className="scorecard-summary-head">
                            <span className={`tag ${SCORE_TAG[sc.overall_recommendation] ?? 'tag-blue'}`}>
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
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}

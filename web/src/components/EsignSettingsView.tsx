import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { jobsApi, type Job } from '../api/jobs'
import { pipelineStagesApi, type PipelineStage } from '../api/pipelineStages'
import { esignApi, type EsignAccountSettings, type EsignStageRule, type EsignTemplate } from '../api/esign'
import { useToast } from '../contexts/ToastContext'

const STAGE_TYPES = ['applied', 'screening', 'interview', 'offer', 'hired', 'rejected', 'withdrawn'] as const

const MERGE_CHIPS: { token: string; label: string }[] = [
  { token: '{candidate_name}', label: 'Name' },
  { token: '{candidate_email}', label: 'Email' },
  { token: '{job_title}', label: 'Job title' },
  { token: '{company_name}', label: 'Company' },
  { token: '{today}', label: 'Today’s date' },
  { token: '{salary_range}', label: 'Salary range' },
]

const MERGE_MORE =
  '{department} · {location} · {requisition_id} · {hiring_plan_deadline} · {candidate_phone} · {candidate_location}'

function IconLink({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" strokeLinecap="round" />
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" strokeLinecap="round" />
    </svg>
  )
}

function IconDoc({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" strokeLinejoin="round" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" strokeLinecap="round" />
    </svg>
  )
}

function IconZap({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
    </svg>
  )
}

function IconPen({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M12 19h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function EsignSettingsView() {
  const { getToken } = useAuth()
  const { error: showError, success: showSuccess, info: showInfo } = useToast()
  const token = getToken()

  const [jobs, setJobs] = useState<Job[]>([])
  const [templates, setTemplates] = useState<EsignTemplate[]>([])
  const [rules, setRules] = useState<EsignStageRule[]>([])
  const [settings, setSettings] = useState<EsignAccountSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [esignTablesMissing, setEsignTablesMissing] = useState(false)

  const [createTemplateOpen, setCreateTemplateOpen] = useState(false)
  const [tplName, setTplName] = useState('')
  const [tplDesc, setTplDesc] = useState('')
  const [tplHtml, setTplHtml] = useState(
    '<p>Dear {candidate_name},</p>\n<p>Regarding <strong>{job_title}</strong> at {company_name}…</p>',
  )

  const [ruleJobId, setRuleJobId] = useState<number | ''>('')
  const [ruleStageId, setRuleStageId] = useState<number | ''>('')
  const [ruleStageType, setRuleStageType] = useState<string>('')
  const [ruleTemplateId, setRuleTemplateId] = useState<number | ''>('')
  const [ruleScope, setRuleScope] = useState<'job' | 'account'>('job')
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [stagesByJobId, setStagesByJobId] = useState<Record<number, PipelineStage[]>>({})

  const [fieldMapText, setFieldMapText] = useState('{}')

  const copyToken = useCallback(
    async (t: string) => {
      try {
        await navigator.clipboard.writeText(t)
        showSuccess('Copied', t)
      } catch {
        showInfo('Copy', t)
      }
    },
    [showSuccess, showInfo],
  )

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setEsignTablesMissing(false)
    try {
      const [j, s] = await Promise.all([jobsApi.list(token), esignApi.getSettings(token)])
      setJobs(j)
      setSettings(s)
      setFieldMapText(JSON.stringify(s.field_map || {}, null, 2))

      let tOk = true
      let tablesMissing = false
      try {
        setTemplates(await esignApi.listTemplates(token))
      } catch (e) {
        tOk = false
        setTemplates([])
        const msg = e instanceof Error ? e.message : ''
        if (/migrate|500|Database error|does not exist|relation/i.test(msg)) {
          tablesMissing = true
        } else {
          showError('Could not load templates', msg || undefined)
        }
      }
      try {
        setRules(await esignApi.listRules(token))
      } catch (e) {
        setRules([])
        const msg = e instanceof Error ? e.message : ''
        if (/migrate|500|Database error|does not exist|relation/i.test(msg)) {
          tablesMissing = true
        } else if (tOk) {
          showError('Could not load rules', msg || undefined)
        }
      }
      setEsignTablesMissing(tablesMissing)
    } catch (e) {
      showError('Could not load settings', e instanceof Error ? e.message : undefined)
    } finally {
      setLoading(false)
    }
  }, [token, showError])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!token || ruleScope !== 'job' || ruleJobId === '') {
      setStages([])
      return
    }
    pipelineStagesApi
      .listByJob(token, Number(ruleJobId))
      .then(setStages)
      .catch(() => setStages([]))
  }, [token, ruleScope, ruleJobId])

  useEffect(() => {
    if (!token) return
    const ids = [
      ...new Set(
        rules.filter(r => r.job_id != null && r.pipeline_stage_id != null).map(r => r.job_id as number),
      ),
    ]
    if (ids.length === 0) {
      setStagesByJobId({})
      return
    }
    let cancelled = false
    void (async () => {
      const entries = await Promise.all(
        ids.map(async jid => {
          try {
            const s = await pipelineStagesApi.listByJob(token, jid)
            return [jid, s] as const
          } catch {
            return [jid, [] as PipelineStage[]] as const
          }
        }),
      )
      if (!cancelled) setStagesByJobId(Object.fromEntries(entries))
    })()
    return () => {
      cancelled = true
    }
  }, [token, rules])

  const templateById = useMemo(() => {
    const m = new Map<number, EsignTemplate>()
    templates.forEach(t => m.set(t.id, t))
    return m
  }, [templates])

  const jobById = useMemo(() => {
    const m = new Map<number, Job>()
    jobs.forEach(j => m.set(j.id, j))
    return m
  }, [jobs])

  async function saveBasics() {
    if (!token) return
    try {
      const next = await esignApi.patchSettings(token, {
        frontend_base_url: settings?.frontend_base_url ?? '',
      })
      setSettings(next)
      showSuccess('Saved', 'Signing links will use this URL.')
    } catch (e) {
      showError('Save failed', e instanceof Error ? e.message : undefined)
    }
  }

  async function saveAdvanced() {
    if (!token) return
    let field_map: Record<string, string> = {}
    try {
      const parsed = JSON.parse(fieldMapText || '{}')
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        field_map = Object.fromEntries(
          Object.entries(parsed as Record<string, unknown>).map(([k, v]) => [k, String(v)]),
        )
      } else throw new Error('invalid')
    } catch {
      showError('Invalid JSON', 'Custom fields must be a single JSON object.')
      return
    }
    try {
      const next = await esignApi.patchSettings(token, {
        webhook_secret: settings?.webhook_secret ?? '',
        field_map,
      })
      setSettings(next)
      showSuccess('Saved', 'Advanced settings updated.')
    } catch (e) {
      showError('Save failed', e instanceof Error ? e.message : undefined)
    }
  }

  async function createTemplate() {
    if (!token) return
    const name = tplName.trim()
    if (!name) {
      showError('Name required', 'Give your template a short name.')
      return
    }
    if (!tplHtml.trim()) {
      showError('Content required', 'Add HTML for the document body.')
      return
    }
    try {
      const row = await esignApi.createTemplate(token, {
        name,
        description: tplDesc.trim() || undefined,
        content_html: tplHtml.trim(),
      })
      setTemplates(prev => [row, ...prev])
      setTplName('')
      setTplDesc('')
      setCreateTemplateOpen(false)
      showSuccess('Template created')
    } catch (e) {
      showError('Create failed', e instanceof Error ? e.message : undefined)
    }
  }

  async function removeTemplate(id: number) {
    if (!token || !confirm('Delete this template? Rules using it may break.')) return
    try {
      await esignApi.deleteTemplate(token, id)
      setTemplates(prev => prev.filter(t => t.id !== id))
      showSuccess('Removed')
    } catch (e) {
      showError('Delete failed', e instanceof Error ? e.message : undefined)
    }
  }

  async function createRule() {
    if (!token) return
    if (ruleTemplateId === '') {
      showError('Pick a document', 'Choose which template to send.')
      return
    }
    try {
      const body =
        ruleScope === 'job'
          ? {
              template_id: Number(ruleTemplateId),
              job_id: Number(ruleJobId),
              pipeline_stage_id: Number(ruleStageId),
            }
          : {
              template_id: Number(ruleTemplateId),
              job_id: null,
              trigger_stage_type: ruleStageType,
            }
      if (ruleScope === 'job' && (ruleJobId === '' || ruleStageId === '')) {
        showError('Incomplete', 'Select a job and a pipeline column.')
        return
      }
      if (ruleScope === 'account' && !ruleStageType) {
        showError('Incomplete', 'Select a stage type (e.g. offer).')
        return
      }
      const row = await esignApi.createRule(token, body)
      setRules(prev => [row, ...prev])
      showSuccess('Rule added', 'Run Celery when moving cards on the pipeline.')
    } catch (e) {
      showError('Could not add rule', e instanceof Error ? e.message : undefined)
    }
  }

  async function toggleRule(r: EsignStageRule) {
    if (!token) return
    try {
      const row = await esignApi.updateRule(token, r.id, { is_active: !r.is_active })
      setRules(prev => prev.map(x => (x.id === r.id ? row : x)))
    } catch (e) {
      showError('Update failed', e instanceof Error ? e.message : undefined)
    }
  }

  async function removeRule(id: number) {
    if (!token || !confirm('Remove this automation rule?')) return
    try {
      await esignApi.deleteRule(token, id)
      setRules(prev => prev.filter(r => r.id !== id))
    } catch (e) {
      showError('Remove failed', e instanceof Error ? e.message : undefined)
    }
  }

  function ruleSummary(r: EsignStageRule): { when: string; doc: string } {
    const doc = templateById.get(r.template_id)?.name ?? `Template #${r.template_id}`
    if (r.job_id != null && r.pipeline_stage_id != null) {
      const jt = jobById.get(r.job_id)?.title ?? `Job #${r.job_id}`
      const st = stagesByJobId[r.job_id]?.find(s => s.id === r.pipeline_stage_id)?.name
      const when = st ? `${jt} → ${st}` : `${jt} → column #${r.pipeline_stage_id}`
      return { when, doc }
    }
    if (r.trigger_stage_type) {
      return {
        when: `All jobs → “${r.trigger_stage_type}” columns`,
        doc,
      }
    }
    return { when: '—', doc }
  }

  if (!token) return null

  return (
    <div className="esign-page">
      {esignTablesMissing && (
        <div className="esign-banner esign-banner--warn" role="status">
          <div className="esign-banner-icon" aria-hidden>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 9v4M12 17h.01M10.3 3.6L1.2 19A2 2 0 003 22h18a2 2 0 001.7-3l-9.1-15.4a2 2 0 00-3.4 0z" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <strong>Finish setup</strong>
            <p>
              Run <code>python manage.py db migrate</code> then <code>python manage.py db seed</code> for sample templates.
            </p>
          </div>
        </div>
      )}

      <header className="settings-pane-header esign-page-intro">
        <p className="esign-intro-badge">Built-in · no external e-sign vendor</p>
        <h1 className="settings-pane-title">E-sign automation</h1>
        <p className="settings-pane-lead">
          Candidates sign in your app. Set the URL candidates use, add HTML templates with merge tags, then tie each
          document to a pipeline move. A background worker must run for sends to queue.
        </p>
      </header>

      <details className="esign-howto">
        <summary className="esign-howto-sum">How the three pieces fit together</summary>
        <div className="esign-steps" aria-label="How it works">
          <div className="esign-step">
            <span className="esign-step-icon" aria-hidden>
              <IconDoc />
            </span>
            <div>
              <h3 className="esign-step-title">Templates</h3>
              <p className="esign-step-text">HTML plus placeholders; we merge job and candidate fields.</p>
            </div>
          </div>
          <div className="esign-step-connector" aria-hidden />
          <div className="esign-step">
            <span className="esign-step-icon" aria-hidden>
              <IconZap />
            </span>
            <div>
              <h3 className="esign-step-title">Rules</h3>
              <p className="esign-step-text">One job and column, or every column of a stage type (e.g. offer).</p>
            </div>
          </div>
          <div className="esign-step-connector" aria-hidden />
          <div className="esign-step">
            <span className="esign-step-icon" aria-hidden>
              <IconPen />
            </span>
            <div>
              <h3 className="esign-step-title">Sign</h3>
              <p className="esign-step-text">Moving a card on the board queues the document and signing link.</p>
            </div>
          </div>
        </div>
      </details>

      <div className="esign-worker-hint">
        <span className="esign-worker-dot" aria-hidden />
        <span>
          <strong>Background worker (required):</strong> in a second terminal run{' '}
          <code>python manage.py worker</code>
          {' — '}
          or <code>celery -A config.celery worker -l info</code>. Without it, e-sign still runs inline if Redis/broker is
          unavailable (slower API responses).
        </span>
      </div>

      {loading ? (
        <div className="esign-skeleton" aria-busy="true">
          <div className="esign-skel-block" />
          <div className="esign-skel-block esign-skel-short" />
          <div className="esign-skel-block" />
        </div>
      ) : (
        <div className="esign-sections">
          <section className="esign-panel">
            <div className="esign-panel-head">
              <span className="esign-panel-icon" aria-hidden>
                <IconLink />
              </span>
              <div>
                <h3 className="esign-panel-title">Where candidates open documents</h3>
                <p className="esign-panel-sub">Your live app origin (Vite dev server or production URL).</p>
              </div>
            </div>
            <div className="esign-panel-body">
              <label className="esign-floating-label" htmlFor="esign-base-url">
                App base URL
              </label>
              <div className="esign-input-row">
                <input
                  id="esign-base-url"
                  className="esign-input-lg"
                  type="url"
                  placeholder="https://app.yourcompany.com"
                  autoComplete="url"
                  value={settings?.frontend_base_url || ''}
                  onChange={e =>
                    setSettings(s => ({ ...(s || ({} as EsignAccountSettings)), frontend_base_url: e.target.value }))
                  }
                />
                <button type="button" className="btn-primary esign-btn-inline" onClick={() => void saveBasics()}>
                  Save
                </button>
              </div>
              <p className="esign-footnote">Signing URLs look like: <code>/esign/sign/…</code> after this base.</p>
            </div>
          </section>

          <section className="esign-panel">
            <div className="esign-panel-head">
              <span className="esign-panel-icon" aria-hidden>
                <IconDoc />
              </span>
              <div>
                <h3 className="esign-panel-title">Document templates</h3>
                <p className="esign-panel-sub">
                  {templates.length === 0
                    ? 'Start from scratch or use samples from db seed.'
                    : `${templates.length} template${templates.length === 1 ? '' : 's'} available for rules.`}
                </p>
              </div>
            </div>
            <div className="esign-panel-body">
              <button
                type="button"
                className={`esign-add-toggle ${createTemplateOpen ? 'is-on' : ''}`}
                onClick={() => setCreateTemplateOpen(o => !o)}
                aria-expanded={createTemplateOpen}
              >
                <span className="esign-add-toggle-plus">{createTemplateOpen ? '✕' : '+'}</span>
                {createTemplateOpen ? 'Close editor' : 'New template'}
              </button>

              {createTemplateOpen && (
                <div className="esign-editor-card">
                  <div className="esign-editor-grid">
                    <div className="esign-field-block">
                      <label htmlFor="tpl-name">Display name</label>
                      <input id="tpl-name" value={tplName} onChange={e => setTplName(e.target.value)} placeholder="Offer letter" />
                    </div>
                    <div className="esign-field-block">
                      <label htmlFor="tpl-desc">Note (optional)</label>
                      <input id="tpl-desc" value={tplDesc} onChange={e => setTplDesc(e.target.value)} placeholder="Internal description" />
                    </div>
                  </div>
                  <div className="esign-field-block">
                    <label htmlFor="tpl-html">HTML body</label>
                    <textarea id="tpl-html" className="esign-textarea" rows={9} value={tplHtml} onChange={e => setTplHtml(e.target.value)} />
                  </div>
                  <div className="esign-chips-wrap">
                    <span className="esign-chips-label">Tap to copy into HTML</span>
                    <div className="esign-chips" role="group" aria-label="Merge field tokens">
                      {MERGE_CHIPS.map(c => (
                        <button key={c.token} type="button" className="esign-chip" onClick={() => void copyToken(c.token)} title={c.token}>
                          {c.label}
                        </button>
                      ))}
                    </div>
                    <details className="esign-more-fields">
                      <summary>More placeholders</summary>
                      <p className="esign-more-fields-text">{MERGE_MORE}</p>
                    </details>
                  </div>
                  <button type="button" className="btn-primary esign-btn-inline" onClick={() => void createTemplate()}>
                    Create template
                  </button>
                </div>
              )}

              {templates.length === 0 ? (
                <div className="esign-empty">
                  <IconDoc className="esign-empty-icon" />
                  <p className="esign-empty-title">No templates yet</p>
                  <p className="esign-empty-text">Create one above, or run seeds for “Sample offer letter” and “Simple NDA”.</p>
                </div>
              ) : (
                <ul className="esign-template-grid">
                  {templates.map(t => (
                    <li key={t.id} className="esign-template-card">
                      <div className="esign-template-card-main">
                        <span className="esign-template-card-icon" aria-hidden>
                          <IconDoc />
                        </span>
                        <div>
                          <div className="esign-template-card-name">{t.name}</div>
                          {t.description && <div className="esign-template-card-desc">{t.description}</div>}
                        </div>
                      </div>
                      <button type="button" className="esign-icon-btn" onClick={() => void removeTemplate(t.id)} title="Delete template">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 6h18M8 6V4h8v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M10 11v6M14 11v6" strokeLinecap="round" />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className="esign-panel">
            <div className="esign-panel-head">
              <span className="esign-panel-icon" aria-hidden>
                <IconZap />
              </span>
              <div>
                <h3 className="esign-panel-title">Automation rules</h3>
                <p className="esign-panel-sub">When someone lands in the chosen stage, we queue the document.</p>
              </div>
            </div>
            <div className="esign-panel-body">
              <div className="esign-segment" role="group" aria-label="Rule scope">
                <button
                  type="button"
                  className={`esign-segment-btn ${ruleScope === 'job' ? 'is-active' : ''}`}
                  onClick={() => setRuleScope('job')}
                >
                  One job
                </button>
                <button
                  type="button"
                  className={`esign-segment-btn ${ruleScope === 'account' ? 'is-active' : ''}`}
                  onClick={() => setRuleScope('account')}
                >
                  All jobs
                </button>
              </div>
              <p className="esign-segment-hint">
                {ruleScope === 'job'
                  ? 'Choose a single requisition and the Kanban column that should trigger send.'
                  : 'Matches any column whose stage type is the same (e.g. all “offer” columns).'}
              </p>

              {ruleScope === 'job' ? (
                <div className="esign-editor-grid">
                  <div className="esign-field-block">
                    <label>Job</label>
                    <select
                      className="esign-select"
                      value={ruleJobId === '' ? '' : String(ruleJobId)}
                      onChange={e => setRuleJobId(e.target.value ? Number(e.target.value) : '')}
                    >
                      <option value="">Select…</option>
                      {jobs.map(j => (
                        <option key={j.id} value={j.id}>
                          {j.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="esign-field-block">
                    <label>Pipeline column</label>
                    <select
                      className="esign-select"
                      value={ruleStageId === '' ? '' : String(ruleStageId)}
                      onChange={e => setRuleStageId(e.target.value ? Number(e.target.value) : '')}
                    >
                      <option value="">Select…</option>
                      {stages.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                          {s.stage_type ? ` · ${s.stage_type}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="esign-field-block">
                  <label>Stage type to match</label>
                  <select className="esign-select" value={ruleStageType} onChange={e => setRuleStageType(e.target.value)}>
                    <option value="">Select…</option>
                    {STAGE_TYPES.map(st => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="esign-field-block">
                <label>Send this template</label>
                <select
                  className="esign-select"
                  value={ruleTemplateId === '' ? '' : String(ruleTemplateId)}
                  onChange={e => setRuleTemplateId(e.target.value ? Number(e.target.value) : '')}
                >
                  <option value="">Select…</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <button type="button" className="btn-primary esign-btn-inline" onClick={() => void createRule()}>
                Add rule
              </button>

              {rules.length === 0 ? (
                <p className="esign-rules-empty">No rules yet. Seeds add an “offer” rule if migrations ran first.</p>
              ) : (
                <ul className="esign-rule-list">
                  {rules.map(r => {
                    const { when, doc } = ruleSummary(r)
                    return (
                      <li key={r.id} className={`esign-rule-card ${r.is_active ? '' : 'is-off'}`}>
                        <div className="esign-rule-top">
                          <span className={`esign-status ${r.is_active ? 'on' : 'off'}`}>{r.is_active ? 'On' : 'Paused'}</span>
                          <div className="esign-rule-actions">
                            <button type="button" className="esign-link-btn" onClick={() => void toggleRule(r)}>
                              {r.is_active ? 'Pause' : 'Resume'}
                            </button>
                            <button type="button" className="esign-link-btn danger" onClick={() => void removeRule(r.id)}>
                              Remove
                            </button>
                          </div>
                        </div>
                        <p className="esign-rule-when">{when}</p>
                        <p className="esign-rule-doc">
                          <span className="esign-rule-doc-label">Document</span> {doc}
                        </p>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </section>

          <details className="esign-advanced">
            <summary className="esign-advanced-sum">
              <span>Advanced</span>
              <span className="esign-advanced-sub">Webhooks &amp; custom merge mapping</span>
            </summary>
            <div className="esign-advanced-body">
              <p className="esign-footnote">Optional. In-app signing works without any of this.</p>
              <div className="esign-field-block">
                <label>Webhook HMAC secret</label>
                <input
                  className="esign-select"
                  type="password"
                  autoComplete="new-password"
                  value={settings?.webhook_secret || ''}
                  onChange={e =>
                    setSettings(s => ({ ...(s || ({} as EsignAccountSettings)), webhook_secret: e.target.value }))
                  }
                />
              </div>
              <div className="esign-field-block">
                <label>Custom field map (JSON)</label>
                <textarea className="esign-textarea" rows={4} value={fieldMapText} onChange={e => setFieldMapText(e.target.value)} />
              </div>
              <button type="button" className="btn-primary esign-btn-inline" onClick={() => void saveAdvanced()}>
                Save advanced
              </button>
              <p className="esign-advanced-api">
                API: <code>POST /api/v1/webhooks/esign</code> · header <code>X-Forge-Esign-Signature</code>
              </p>
            </div>
          </details>
        </div>
      )}
    </div>
  )
}

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { jobsApi, type Job } from '../../api/jobs'
import { pipelineStagesApi, type PipelineStage } from '../../api/pipelineStages'
import { esignApi, type EsignStageRule, type EsignTemplate } from '../../api/esign'
import { useToast } from '../../contexts/ToastContext'
import { ESIGN_STAGE_TYPES } from '../../esign/esignConstants'

export default function EsignRulesPage() {
  const { getToken } = useAuth()
  const { error: showError, success: showSuccess } = useToast()
  const token = getToken()
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)

  const [jobs, setJobs] = useState<Job[]>([])
  const [templates, setTemplates] = useState<EsignTemplate[]>([])
  const [rules, setRules] = useState<EsignStageRule[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)

  const [ruleJobId, setRuleJobId] = useState<number | ''>('')
  const [ruleStageId, setRuleStageId] = useState<number | ''>('')
  const [ruleStageType, setRuleStageType] = useState<string>('')
  const [ruleTemplateId, setRuleTemplateId] = useState<number | ''>('')
  const [ruleScope, setRuleScope] = useState<'job' | 'account'>('job')
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [stagesByJobId, setStagesByJobId] = useState<Record<number, PipelineStage[]>>({})
  const [creating, setCreating] = useState(false)

  const resetCreateForm = useCallback(() => {
    setRuleJobId('')
    setRuleStageId('')
    setRuleStageType('')
    setRuleTemplateId('')
    setRuleScope('job')
  }, [])

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const [j, t, r] = await Promise.all([
        jobsApi.list(token),
        esignApi.listTemplates(token),
        esignApi.listRules(token),
      ])
      setJobs(j)
      setTemplates(t)
      setRules(r)
    } catch (e) {
      showError('Could not load automation data', e instanceof Error ? e.message : undefined)
    } finally {
      setLoading(false)
    }
  }, [token, showError])

  useEffect(() => {
    void load()
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

  useEffect(() => {
    if (!createOpen) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setCreateOpen(false)
        resetCreateForm()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', onKey)
    }
  }, [createOpen, resetCreateForm])

  useEffect(() => {
    if (!createOpen) return
    const t = window.setTimeout(() => {
      const root = panelRef.current
      const focusable = root?.querySelector<HTMLElement>(
        '.esign-modal-body button, .esign-modal-body select, .esign-modal-body input, .esign-modal-body textarea',
      )
      focusable?.focus()
    }, 0)
    return () => window.clearTimeout(t)
  }, [createOpen])

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

  async function createRule() {
    if (!token) return
    if (ruleTemplateId === '') {
      showError('Select a template to send')
      return
    }
    if (ruleScope === 'job' && (ruleJobId === '' || ruleStageId === '')) {
      showError('Select a job and pipeline column')
      return
    }
    if (ruleScope === 'account' && !ruleStageType) {
      showError('Select a stage type')
      return
    }
    setCreating(true)
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
      const row = await esignApi.createRule(token, body)
      setRules(prev => [row, ...prev])
      showSuccess('Rule created')
      setCreateOpen(false)
      resetCreateForm()
    } catch (e) {
      showError('Could not create rule', e instanceof Error ? e.message : undefined)
    } finally {
      setCreating(false)
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
    if (!token || !confirm('Remove this rule?')) return
    try {
      await esignApi.deleteRule(token, id)
      setRules(prev => prev.filter(r => r.id !== id))
      showSuccess('Rule removed')
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
      return { when: `All jobs → “${r.trigger_stage_type}” stage columns`, doc }
    }
    return { when: '—', doc }
  }

  function openCreate() {
    resetCreateForm()
    setCreateOpen(true)
  }

  function closeCreate() {
    setCreateOpen(false)
    resetCreateForm()
  }

  if (!token) return null

  return (
    <div className="esign-page-pro esign-rules-page">
      <div className="esign-templates-toolbar">
        <p className="esign-templates-lead">
          When a candidate lands in the chosen pipeline stage, the selected template is queued for signing. A background
          worker must be running to deliver documents.
        </p>
        <button type="button" className="btn-primary btn-primary--inline" onClick={openCreate}>
          <span aria-hidden>+</span> New rule
        </button>
      </div>

      {loading ? (
        <div className="esign-pro-loading">Loading…</div>
      ) : rules.length === 0 ? (
        <div className="esign-templates-empty esign-rules-empty-panel">
          <p>No automation rules yet</p>
          <button type="button" className="btn-primary btn-primary--inline" onClick={openCreate}>
            Create your first rule
          </button>
          <p className="esign-templates-empty-foot">
            Rules can target one job and column, or all jobs that use a given stage type (e.g. offer).
          </p>
        </div>
      ) : (
        <div className="esign-templates-list-card esign-rules-list-shell">
          <div className="esign-rules-list-head">
            <span className="esign-rules-list-count">{rules.length}</span>
            <span className="esign-rules-list-count-label">{rules.length === 1 ? 'rule' : 'rules'}</span>
          </div>
          <ul className="esign-rule-list esign-rule-list--flush">
            {rules.map(r => {
              const { when, doc } = ruleSummary(r)
              return (
                <li key={r.id} className={`esign-rule-card ${r.is_active ? '' : 'is-off'}`}>
                  <div className="esign-rule-top">
                    <span className={`esign-status ${r.is_active ? 'on' : 'off'}`}>
                      {r.is_active ? 'Active' : 'Paused'}
                    </span>
                    <div className="esign-rule-actions">
                      <button type="button" className="esign-pro-link" onClick={() => void toggleRule(r)}>
                        {r.is_active ? 'Pause' : 'Resume'}
                      </button>
                      <button type="button" className="esign-pro-link danger" onClick={() => void removeRule(r.id)}>
                        Remove
                      </button>
                    </div>
                  </div>
                  <p className="esign-rule-when">{when}</p>
                  <p className="esign-rule-doc">
                    <span className="esign-rule-doc-label">Template</span> {doc}
                  </p>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {createOpen && (
        <div
          className="esign-modal-backdrop"
          role="presentation"
          onClick={e => {
            if (e.target === e.currentTarget) closeCreate()
          }}
        >
          <div
            ref={panelRef}
            className="esign-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={e => e.stopPropagation()}
          >
            <header className="esign-modal-header">
              <div>
                <h2 id={titleId} className="esign-modal-title">
                  New automation rule
                </h2>
                <p className="esign-modal-sub">Choose when to send a template for e-signing.</p>
              </div>
              <button type="button" className="esign-modal-close" onClick={closeCreate} aria-label="Close">
                ×
              </button>
            </header>
            <div className="esign-modal-body">
              <div className="esign-segment" role="group" aria-label="Scope">
                <button
                  type="button"
                  className={`esign-segment-btn ${ruleScope === 'job' ? 'is-active' : ''}`}
                  onClick={() => setRuleScope('job')}
                >
                  Single job
                </button>
                <button
                  type="button"
                  className={`esign-segment-btn ${ruleScope === 'account' ? 'is-active' : ''}`}
                  onClick={() => setRuleScope('account')}
                >
                  All jobs
                </button>
              </div>
              <p className="esign-pro-field-hint esign-modal-hint">
                {ruleScope === 'job'
                  ? 'Trigger when a candidate lands in one column on one requisition.'
                  : 'Trigger for any column whose stage type matches (e.g. all offer columns).'}
              </p>

              {ruleScope === 'job' ? (
                <div className="esign-editor-meta-grid">
                  <div className="esign-field-block">
                    <label htmlFor="esign-rule-job">Job</label>
                    <select
                      id="esign-rule-job"
                      className="esign-pro-input"
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
                    <label htmlFor="esign-rule-stage">Pipeline column</label>
                    <select
                      id="esign-rule-stage"
                      className="esign-pro-input"
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
                  <label htmlFor="esign-rule-stage-type">Stage type</label>
                  <select
                    id="esign-rule-stage-type"
                    className="esign-pro-input"
                    value={ruleStageType}
                    onChange={e => setRuleStageType(e.target.value)}
                  >
                    <option value="">Select…</option>
                    {ESIGN_STAGE_TYPES.map(st => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="esign-field-block">
                <label htmlFor="esign-rule-template">Template</label>
                <select
                  id="esign-rule-template"
                  className="esign-pro-input"
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
            </div>
            <footer className="esign-modal-footer">
              <button type="button" className="esign-pro-btn-quiet" onClick={closeCreate} disabled={creating}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary btn-primary--inline"
                disabled={creating}
                onClick={() => void createRule()}
              >
                {creating ? 'Creating…' : 'Create rule'}
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  )
}

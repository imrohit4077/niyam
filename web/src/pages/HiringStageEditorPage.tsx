import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import type { DashboardOutletContext } from '../layouts/DashboardOutletContext'
import { hiringAttributesApi, hiringStageTemplatesApi, type HiringAttributeRow } from '../api/hiringStructure'
import { useToast } from '../contexts/ToastContext'
import { useAuth } from '../auth/AuthContext'
import { can } from '../permissions'

export default function HiringStageEditorPage() {
  const { token, accountId } = useOutletContext<DashboardOutletContext>()
  const { user } = useAuth()
  const { templateId } = useParams<{ templateId?: string }>()
  const isNew = !templateId || templateId === 'new'
  const navigate = useNavigate()
  const toast = useToast()
  const base = `/account/${accountId}/structured-hiring`
  const canManage = can(user, 'hiring_structure', 'manage')

  const [attrs, setAttrs] = useState<HiringAttributeRow[]>([])
  const [name, setName] = useState('')
  const [selectedAttrIds, setSelectedAttrIds] = useState<number[]>([])
  const [loading, setLoading] = useState(() => !isNew)

  const load = useCallback(async () => {
    const [a, t] = await Promise.all([
      hiringAttributesApi.list(token),
      isNew || !templateId ? Promise.resolve(null) : hiringStageTemplatesApi.get(token, Number(templateId)),
    ])
    setAttrs(a)
    if (t) {
      setName(t.name)
      setSelectedAttrIds(t.default_attribute_ids ?? [])
    }
    setLoading(false)
  }, [token, isNew, templateId])

  useEffect(() => {
    void load().catch(() => setLoading(false))
  }, [load])

  const toggleAttr = (id: number) => {
    setSelectedAttrIds(cur => (cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id]))
  }

  const save = async () => {
    if (!name.trim()) {
      toast.error('Validation', 'Stage name is required')
      return
    }
    try {
      const body = {
        name: name.trim(),
        attribute_ids: selectedAttrIds,
      }
      if (isNew) {
        await hiringStageTemplatesApi.create(token, body)
        toast.success('Created', 'Stage template saved.')
      } else {
        await hiringStageTemplatesApi.update(token, Number(templateId), body)
        toast.success('Updated', 'Stage template saved.')
      }
      navigate(`${base}/stages`)
    } catch (e: unknown) {
      toast.error('Save failed', e instanceof Error ? e.message : 'Failed')
    }
  }

  const remove = async () => {
    if (isNew || !templateId) return
    if (!window.confirm('Delete this stage template? This cannot be undone.')) return
    try {
      await hiringStageTemplatesApi.destroy(token, Number(templateId))
      toast.success('Deleted', 'Stage removed.')
      navigate(`${base}/stages`)
    } catch (e: unknown) {
      toast.error('Delete failed', e instanceof Error ? e.message : 'Failed')
    }
  }

  if (!canManage) {
    return (
      <div className="role-kickoff-page role-kickoff-page--form rk-sh-page">
        <header className="rk-sh-page-head">
          <div className="rk-sh-page-head-main">
            <Link to={`${base}/stages`} className="rk-sh-back">
              ← All stages
            </Link>
            <p className="rk-sh-eyebrow">Structured hiring</p>
            <h1 className="rk-sh-title">No access</h1>
            <p className="rk-sh-lead">You don&apos;t have permission to create or edit stage templates.</p>
            <Link to={`${base}/stages`} className="rk-btn rk-btn-secondary" style={{ marginTop: 18, display: 'inline-flex' }}>
              Back to stages
            </Link>
          </div>
        </header>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="role-kickoff-page role-kickoff-page--form rk-sh-page rk-form-loading">
        <div className="spinner" aria-label="Loading" />
        <p>Loading…</p>
      </div>
    )
  }

  return (
    <div className="role-kickoff-page role-kickoff-page--form rk-sh-page">
      <header className="rk-sh-page-head">
        <div className="rk-sh-page-head-main">
          <Link to={`${base}/stages`} className="rk-sh-back">
            ← All stages
          </Link>
          <p className="rk-sh-eyebrow">{isNew ? 'New template' : 'Edit template'}</p>
          <h1 className="rk-sh-title">{isNew ? 'Create stage' : 'Edit stage'}</h1>
          <p className="rk-sh-lead">
            {isNew
              ? 'Name the stage and choose which scorecard attributes interviewers should emphasize.'
              : 'Updates apply to new kickoffs. Requests already in flight keep their saved pipeline until the hiring manager changes them.'}
          </p>
        </div>
      </header>

      <section className="rk-card rk-sh-card">
        <div className="rk-card-body">
          <div className="rk-field">
            <label className="rk-label" htmlFor="st-name">
              Stage name
            </label>
            <input id="st-name" className="rk-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Technical round 1" />
          </div>
          <div className="rk-field">
            <span className="rk-label">Focus attributes</span>
            <p className="rk-hint">These scorecard dimensions are highlighted for this stage in kickoffs and interviews.</p>
            {attrs.length === 0 ? (
              <p className="rk-inline-note">Create attributes first.</p>
            ) : (
              <div className="rk-checkbox-grid">
                {attrs.map(a => (
                  <label key={a.id} className="rk-checkbox-row">
                    <input type="checkbox" checked={selectedAttrIds.includes(a.id)} onChange={() => toggleAttr(a.id)} />
                    <span>{a.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          <div className="rk-structured-editor-footer">
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button type="button" className="rk-btn rk-btn-primary" onClick={() => void save()}>
                {isNew ? 'Create stage' : 'Save changes'}
              </button>
              <Link to={`${base}/stages`} className="rk-btn rk-btn-secondary">
                Cancel
              </Link>
            </div>
            {!isNew ? (
              <button type="button" className="rk-btn rk-btn-danger" onClick={() => void remove()}>
                Delete stage
              </button>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  )
}

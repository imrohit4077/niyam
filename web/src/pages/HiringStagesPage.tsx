import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useOutletContext } from 'react-router-dom'
import type { DashboardOutletContext } from '../layouts/DashboardOutletContext'
import { hiringStageTemplatesApi, type HiringStageTemplateRow } from '../api/hiringStructure'
import { can } from '../permissions'
import { useAuth } from '../auth/AuthContext'
import { useToast } from '../contexts/ToastContext'

function CalloutIconManage() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  )
}

function CalloutIconReadonly() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  )
}

function EmptyStagesIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7l8-4 8 4-8 4-8-4zm0 5l8 4 8-4M4 17l8 4 8-4" />
    </svg>
  )
}

export default function HiringStagesPage() {
  const { token, accountId } = useOutletContext<DashboardOutletContext>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const base = `/account/${accountId}/structured-hiring`
  const canManage = can(user, 'hiring_structure', 'manage')

  const [rows, setRows] = useState<HiringStageTemplateRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setRows(await hiringStageTemplatesApi.list(token))
    } catch (e: unknown) {
      toast.error('Load failed', e instanceof Error ? e.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }, [token, toast])

  useEffect(() => {
    void load()
  }, [load])

  const remove = async (r: HiringStageTemplateRow) => {
    if (!window.confirm(`Delete stage “${r.name}”? This cannot be undone.`)) return
    try {
      await hiringStageTemplatesApi.destroy(token, r.id)
      toast.success('Deleted', 'Stage removed.')
      void load()
    } catch (e: unknown) {
      toast.error('Delete failed', e instanceof Error ? e.message : 'Failed')
    }
  }

  return (
    <div className="role-kickoff-page role-kickoff-page--form rk-sh-page">
      <header className="rk-sh-page-head">
        <div className="rk-sh-page-head-main">
          <Link to={base} className="rk-sh-back">
            ← Structured hiring
          </Link>
          <p className="rk-sh-eyebrow">Pipeline</p>
          <h1 className="rk-sh-title">Stages</h1>
          <p className="rk-sh-lead">
            Reusable interview and screening steps. Each stage defines which scorecard attributes interviewers focus
            on—used when hiring managers build role kickoffs.
          </p>
        </div>
        {canManage ? (
          <div className="rk-sh-page-head-actions">
            <button type="button" className="rk-sh-btn rk-sh-btn-primary" onClick={() => navigate(`${base}/stages/new`)}>
              Create stage
            </button>
          </div>
        ) : null}
      </header>

      {canManage ? (
        <div className="rk-sh-callout rk-sh-callout--manage" role="status">
          <div className="rk-sh-callout__icon">
            <CalloutIconManage />
          </div>
          <div className="rk-sh-callout__body">
            <strong>You can manage stages</strong>
            <span>Create, edit, or delete templates. Changes apply to new kickoffs; existing submitted kickoffs keep their snapshot until updated.</span>
          </div>
        </div>
      ) : (
        <div className="rk-sh-callout" role="status">
          <div className="rk-sh-callout__icon">
            <CalloutIconReadonly />
          </div>
          <div className="rk-sh-callout__body">
            <strong>View only</strong>
            <span>Only workspace admins, site admins, and hiring managers can add or change stages.</span>
          </div>
        </div>
      )}

      <section className="rk-card rk-sh-card">
        <header className="rk-card-head">
          <h2 className="rk-card-title">All stages</h2>
          {canManage ? <p className="rk-card-desc">Edit opens the builder. Delete permanently removes the template.</p> : null}
        </header>
        <div className="rk-card-body" style={{ padding: 0 }}>
          {loading ? (
            <div className="rk-sh-state">
              <div className="spinner" aria-label="Loading" />
              Loading stages…
            </div>
          ) : rows.length === 0 ? (
            <div className="rk-sh-empty">
              <div className="rk-sh-empty__icon">
                <EmptyStagesIcon />
              </div>
              <h3 className="rk-sh-empty__title">No stages yet</h3>
              <p className="rk-sh-empty__text">
                {canManage
                  ? 'Create templates such as “Technical round 1” or “Hiring manager interview”, then map focus attributes for each.'
                  : 'Stage templates will appear here once a hiring manager or admin creates them.'}
              </p>
              {canManage ? (
                <div className="rk-sh-empty__actions">
                  <button type="button" className="rk-sh-btn rk-sh-btn-primary" onClick={() => navigate(`${base}/stages/new`)}>
                    Create your first stage
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <ul className="rk-structured-list">
              {rows.map(r => (
                <li key={r.id} className="rk-structured-list-row">
                  <div className="rk-structured-list-main">
                    <div className="rk-structured-list-title">{r.name}</div>
                    <div className="rk-structured-list-meta" style={{ marginTop: 6 }}>
                      {(r.default_attribute_ids ?? []).length} focus attributes
                    </div>
                  </div>
                  {canManage ? (
                    <div className="rk-structured-row-actions rk-structured-row-actions--row">
                      <button
                        type="button"
                        className="rk-btn rk-btn-secondary rk-btn--compact"
                        onClick={() => navigate(`${base}/stages/${r.id}/edit`)}
                      >
                        Edit
                      </button>
                      <button type="button" className="rk-btn rk-btn-danger rk-btn--compact" onClick={() => void remove(r)}>
                        Delete
                      </button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}

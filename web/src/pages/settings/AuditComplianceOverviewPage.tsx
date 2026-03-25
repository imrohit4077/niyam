import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { getAuditCompliance, patchAuditTrailSettings, type AuditComplianceDoc } from '../../api/auditLog'

export default function AuditComplianceOverviewPage() {
  const { getToken } = useAuth()
  const { error: showError, success: showSuccess } = useToast()
  const token = getToken()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [doc, setDoc] = useState<AuditComplianceDoc | null>(null)

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const d = await getAuditCompliance(token)
      setDoc(d)
    } catch (e) {
      showError('Could not load overview', e instanceof Error ? e.message : undefined)
      setDoc(null)
    } finally {
      setLoading(false)
    }
  }, [token, showError])

  useEffect(() => {
    void load()
  }, [load])

  const at = doc?.audit_trail

  const patchPrefs = async (partial: { track_read_requests?: boolean; track_mutations?: boolean }) => {
    if (!token) return
    setSaving(true)
    try {
      const r = await patchAuditTrailSettings(token, partial)
      setDoc(prev =>
        prev && prev.audit_trail
          ? {
              ...prev,
              audit_trail: {
                ...prev.audit_trail,
                track_read_requests: r.track_read_requests,
                track_mutations: r.track_mutations,
              },
            }
          : prev,
      )
      showSuccess('Audit preferences saved')
    } catch (e) {
      showError('Could not save preferences', e instanceof Error ? e.message : undefined)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="settings-org-page audit-compliance-overview-page">
      <section className="audit-overview-hero">
        <h1 className="settings-org-title">Audit trails &amp; what we record</h1>
        <p className="settings-lead">
          The log is built for <strong>accountability</strong> and <strong>compliance</strong>: who did what, in which
          part of the product, and whether it succeeded. Below you can choose whether to include read traffic (Info) or
          only changes (Create / Update / Delete).
        </p>
      </section>

      {loading ? (
        <p className="settings-muted">Loading…</p>
      ) : at ? (
        <section className="audit-overview-section audit-trail-prefs" aria-labelledby="prefs-heading">
          <h2 id="prefs-heading" className="audit-overview-h2">
            What to track for this workspace
          </h2>
          <p className="settings-muted">
            Applies to new events only. Disabling a category stops enqueueing those rows (worker skips them).
          </p>
          <div className="audit-trail-toggle-grid">
            <label className="audit-trail-toggle">
              <input
                type="checkbox"
                checked={at.track_mutations}
                disabled={saving}
                onChange={e => void patchPrefs({ track_mutations: e.target.checked })}
              />
              <span className="audit-trail-toggle-body">
                <span className="audit-trail-toggle-title">Record changes (Create / Update / Delete)</span>
                <span className="audit-trail-toggle-sub">POST, PUT, PATCH, DELETE — recommended for compliance.</span>
              </span>
            </label>
            <label className="audit-trail-toggle">
              <input
                type="checkbox"
                checked={at.track_read_requests}
                disabled={saving}
                onChange={e => void patchPrefs({ track_read_requests: e.target.checked })}
              />
              <span className="audit-trail-toggle-body">
                <span className="audit-trail-toggle-title">Record reads (Info / GET)</span>
                <span className="audit-trail-toggle-sub">
                  Useful for access reviews; can be noisy on busy accounts.
                </span>
              </span>
            </label>
          </div>

          <h3 className="audit-log-subheading audit-log-subheading--spaced">Action types</h3>
          <ul className="audit-action-type-list">
            {at.action_types.map(t => (
              <li key={t.code} className="audit-action-type-item">
                <span className={`audit-log-action-kind audit-log-action-kind--${actionClass(t.label)}`}>{t.label}</span>
                <span className="audit-action-type-verbs">{t.http_verbs.join(', ')}</span>
                <span className="audit-action-type-desc">{t.description}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="audit-overview-section" aria-labelledby="examples-heading">
        <h2 id="examples-heading" className="audit-overview-h2">
          Examples
        </h2>
        <ul className="audit-log-bullet-list">
          <li>Create or update a job</li>
          <li>Move an application in the pipeline</li>
          <li>Change permissions or workspace settings</li>
          <li>Open sensitive lists (when Info tracking is on)</li>
        </ul>
      </section>

      {loading ? null : doc ? (
        <section className="audit-overview-section audit-overview-policy" aria-labelledby="policy-heading">
          <h2 id="policy-heading" className="audit-overview-h2">
            {doc.title}
          </h2>
          <p className="settings-lead">{doc.summary}</p>
          <h3 className="audit-log-subheading">{doc.write_only.heading}</h3>
          <p>{doc.write_only.body}</p>
          <ul className="audit-log-bullet-list">
            {doc.write_only.bullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
          <h3 className="audit-log-subheading audit-log-subheading--spaced">{doc.operations.heading}</h3>
          <ul className="audit-log-bullet-list">
            {doc.operations.bullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
          <p className="audit-log-info-foot">
            Stored audit rows for this workspace: <strong>{doc.stats.total_entries}</strong>. Use{' '}
            <strong>Audit logs</strong> for the feed; <strong>Delivery failures</strong> lists events that could not be
            persisted after retries.
          </p>
        </section>
      ) : null}
    </div>
  )
}

function actionClass(label: string): string {
  const u = label.toLowerCase()
  if (u === 'info') return 'info'
  if (u === 'create') return 'create'
  if (u === 'update') return 'update'
  if (u === 'delete') return 'delete'
  return 'other'
}

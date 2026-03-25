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

  const patchPrefs = async (
    partial: Partial<{
      track_mutations: boolean
      track_sensitive_reads: boolean
      track_all_reads: boolean
      track_read_requests: boolean
    }>,
  ) => {
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
                track_mutations: r.track_mutations,
                track_sensitive_reads: r.track_sensitive_reads,
                track_all_reads: r.track_all_reads,
                track_read_requests: r.track_read_requests,
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
        <h1 className="settings-org-title">Audit trails &amp; compliance design</h1>
        <p className="settings-lead">
          Aligns with common ATS practice: <strong>writes</strong> for accountability,{' '}
          <strong>sensitive reads</strong> for PII/confidential access (not every GET), optional{' '}
          <strong>full read capture</strong> for deep activity review, and separate <strong>log streams</strong>{' '}
          (audit vs activity) for reporting and future SIEM export.
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
            Policy is enforced in the audit worker. Before/after payloads on writes can be attached from application
            code where needed (not from generic middleware).
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
                <span className="audit-trail-toggle-title">Record all writes (POST / PUT / PATCH / DELETE)</span>
                <span className="audit-trail-toggle-sub">Minimum for SOC 2–style change accountability.</span>
              </span>
            </label>
            <label className="audit-trail-toggle">
              <input
                type="checkbox"
                checked={at.track_sensitive_reads}
                disabled={saving}
                onChange={e => void patchPrefs({ track_sensitive_reads: e.target.checked })}
              />
              <span className="audit-trail-toggle-body">
                <span className="audit-trail-toggle-title">Record sensitive reads (PII / confidential GET)</span>
                <span className="audit-trail-toggle-sub">
                  Routes flagged in the audit catalog (e.g. applications, profile, candidates). Recommended on.
                </span>
              </span>
            </label>
            <label className="audit-trail-toggle">
              <input
                type="checkbox"
                checked={at.track_all_reads}
                disabled={saving}
                onChange={e => void patchPrefs({ track_all_reads: e.target.checked, track_read_requests: e.target.checked })}
              />
              <span className="audit-trail-toggle-body">
                <span className="audit-trail-toggle-title">Record all reads (every GET)</span>
                <span className="audit-trail-toggle-sub">
                  Full activity-style capture; can be noisy. Emits mostly under the Activity stream.
                </span>
              </span>
            </label>
          </div>

          {at.log_streams?.length ? (
            <>
              <h3 className="audit-log-subheading audit-log-subheading--spaced">Log streams</h3>
              <ul className="audit-action-type-list audit-log-stream-list">
                {at.log_streams.map(s => (
                  <li key={s.code} className="audit-action-type-item audit-log-stream-item">
                    <span className="audit-log-stream-code">{s.label}</span>
                    <span className="audit-action-type-desc">{s.description}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}

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
          <li>Permission and workspace settings changes (audit stream)</li>
          <li>Candidate / application views (sensitive read, audit stream)</li>
          <li>Pipeline moves and job edits (writes)</li>
          <li>Broad UI browsing (activity stream, only if “all reads” is on)</li>
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
            persisted after retries. Export to SIEM/warehouse can reuse the same append-only feed.
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

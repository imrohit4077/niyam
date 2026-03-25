import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { getAuditDeliveryFailures, type AuditDeliveryFailureRow, type AuditLogMeta } from '../../api/auditLog'

/** When Celery exhausts retries, we still record an observability row (not a substitute for the append-only log). */
export default function AuditDeliveryFailuresPage() {
  const { getToken } = useAuth()
  const { error: showError } = useToast()
  const token = getToken()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<AuditDeliveryFailureRow[]>([])
  const [meta, setMeta] = useState<AuditLogMeta | null>(null)
  const [page, setPage] = useState(1)

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const r = await getAuditDeliveryFailures(token, { page, per_page: 20 })
      setRows(r.entries)
      setMeta(r.meta)
    } catch (e) {
      showError('Could not load delivery failures', e instanceof Error ? e.message : undefined)
      setRows([])
      setMeta(null)
    } finally {
      setLoading(false)
    }
  }, [token, page, showError])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="settings-org-page audit-delivery-failures-page">
      <p className="settings-lead">
        If the audit worker cannot insert into the append-only table after automatic retries (with backoff), we store a
        row here for administrators. Investigate broker/DB health and application logs; the original API request may still
        have succeeded.
      </p>

      <h2 className="settings-org-title">Delivery failures</h2>

      {loading ? (
        <p className="settings-muted">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="settings-muted">No delivery failures recorded. This is expected when workers and the DB are healthy.</p>
      ) : (
        <div className="audit-log-table-wrap">
          <table className="audit-log-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Error</th>
                <th>Task ID</th>
                <th>Actor</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id}>
                  <td className="audit-log-cell-time">{row.created_at ? formatTime(row.created_at) : '—'}</td>
                  <td className="audit-log-cell-path">
                    <code>{row.error_message}</code>
                  </td>
                  <td className="audit-log-cell-muted">{row.celery_task_id ?? '—'}</td>
                  <td className="audit-log-cell-muted">{row.actor_user_id ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {meta && meta.total > 0 && meta.total_pages > 1 && (
        <div className="audit-log-pagination">
          <button
            type="button"
            className="btn-primary btn-primary--inline"
            disabled={!meta.has_prev}
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            Previous
          </button>
          <span className="audit-log-page-indicator">
            Page {meta.page} of {meta.total_pages} ({meta.total} total)
          </span>
          <button
            type="button"
            className="btn-primary btn-primary--inline"
            disabled={!meta.has_next}
            onClick={() => setPage(p => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'medium' })
  } catch {
    return iso
  }
}

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { getAuditLog, type AuditLogEntry, type AuditLogMeta } from '../../api/auditLog'

/** User-facing audit feed: product labels, action types, and a full detail modal (technical data in a fold). */
export default function AuditLogEntriesPage() {
  const { getToken } = useAuth()
  const { error: showError } = useToast()
  const token = getToken()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<AuditLogEntry[]>([])
  const [meta, setMeta] = useState<AuditLogMeta | null>(null)
  const [page, setPage] = useState(1)
  const [filterInput, setFilterInput] = useState('')
  const [appliedFilter, setAppliedFilter] = useState('')
  const [logCategory, setLogCategory] = useState<'all' | 'audit' | 'activity' | 'system'>('all')
  const [detail, setDetail] = useState<AuditLogEntry | null>(null)

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const r = await getAuditLog(token, {
        page,
        per_page: 25,
        q: appliedFilter.trim() || undefined,
        log_category: logCategory === 'all' ? undefined : logCategory,
      })
      setRows(r.entries)
      setMeta(r.meta)
    } catch (e) {
      showError('Could not load audit log', e instanceof Error ? e.message : undefined)
      setRows([])
      setMeta(null)
    } finally {
      setLoading(false)
    }
  }, [token, page, appliedFilter, logCategory, showError])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!detail) return
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') setDetail(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [detail])

  return (
    <div className="settings-org-page audit-log-settings-page">
      <p className="settings-lead">
        <strong>Audit</strong> stream: writes, permission-style routes, and sensitive reads. <strong>Activity</strong>{' '}
        stream: routine GETs when “log all reads” is enabled. Request correlation uses <code className="audit-log-code">X-Request-ID</code>. See{' '}
        <strong>Overview</strong> for policy toggles.
      </p>

      <div className="settings-org-toolbar audit-log-toolbar">
        <h2 className="settings-org-title">Audit log</h2>
        <form
          className="audit-log-filter"
          onSubmit={e => {
            e.preventDefault()
            setAppliedFilter(filterInput.trim())
            setPage(1)
          }}
        >
          <label htmlFor="audit-stream" className="visually-hidden">
            Log stream
          </label>
          <select
            id="audit-stream"
            className="audit-log-filter-input audit-log-stream-select"
            value={logCategory}
            onChange={e => {
              setLogCategory(e.target.value as typeof logCategory)
              setPage(1)
            }}
          >
            <option value="all">All streams</option>
            <option value="audit">Audit</option>
            <option value="activity">Activity</option>
            <option value="system">System</option>
          </select>
          <label htmlFor="audit-filter" className="visually-hidden">
            Filter by summary, feature, or path
          </label>
          <input
            id="audit-filter"
            type="search"
            className="audit-log-filter-input"
            placeholder="Filter by summary, feature, path…"
            value={filterInput}
            onChange={e => setFilterInput(e.target.value)}
          />
          <button type="submit" className="btn-primary btn-primary--inline">
            Apply
          </button>
        </form>
      </div>

      {loading ? (
        <p className="settings-muted">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="settings-muted">
          No audit entries yet. With a running worker, actions from your workspace appear here. Adjust what is captured
          under <strong>Overview</strong> (Info vs changes).
        </p>
      ) : (
        <div className="audit-log-table-wrap">
          <table className="audit-log-table audit-log-table--rich">
            <thead>
              <tr>
                <th>Time</th>
                <th>Summary</th>
                <th>Feature</th>
                <th>Action</th>
                <th>Stream</th>
                <th>Outcome</th>
                <th>Actor</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map(row => {
                const m = row.metadata || {}
                const summary = displaySummary(row)
                const feature =
                  (typeof m.feature_label === 'string' && m.feature_label) ||
                  row.resource ||
                  '—'
                const kind = actionKindLabel(m, row)
                const outcome =
                  (typeof m.outcome === 'string' && m.outcome) ||
                  (row.status_code != null ? httpOutcome(row.status_code) : '—')
                const stream = row.log_category || '—'
                return (
                  <tr key={row.id}>
                    <td className="audit-log-cell-time">{row.created_at ? formatTime(row.created_at) : '—'}</td>
                    <td className="audit-log-cell-summary">{summary}</td>
                    <td className="audit-log-cell-muted">{feature}</td>
                    <td>
                      <span className={`audit-log-action-kind audit-log-action-kind--${actionKindClass(kind)}`}>
                        {kind}
                      </span>
                    </td>
                    <td className="audit-log-cell-muted audit-log-stream-cell">{stream}</td>
                    <td>
                      <span
                        className={
                          row.status_code != null && row.status_code >= 400
                            ? 'audit-log-outcome audit-log-outcome--err'
                            : 'audit-log-outcome audit-log-outcome--ok'
                        }
                      >
                        {outcome}
                      </span>
                    </td>
                    <td className="audit-log-cell-muted">{row.actor_display ?? (row.actor_user_id != null ? `#${row.actor_user_id}` : '—')}</td>
                    <td>
                      <button type="button" className="btn-link audit-log-details-btn" onClick={() => setDetail(row)}>
                        Details
                      </button>
                    </td>
                  </tr>
                )
              })}
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

      {detail ? (
        <div className="modal-overlay" role="presentation" onClick={() => setDetail(null)}>
          <div
            className="modal modal-wide audit-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="audit-detail-title"
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 id="audit-detail-title" className="modal-title">
                Audit event details
              </h2>
              <button type="button" className="modal-close" aria-label="Close" onClick={() => setDetail(null)}>
                ×
              </button>
            </div>
            <div className="modal-body audit-detail-modal-body">
              <AuditDetailSections row={detail} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function AuditDetailSections({ row }: { row: AuditLogEntry }) {
  const m = row.metadata || {}
  const summary = displaySummary(row)
  const feature =
    (typeof m.feature_label === 'string' && m.feature_label) || row.resource || '—'
  const area = typeof m.feature_area === 'string' ? m.feature_area : null
  const kind = actionKindLabel(m, row)
  const entity =
    pickString(m.entity_name) ||
    pickString(m.candidate_display) ||
    pickString(m.job_title) ||
    null
  const email = pickString(m.candidate_email)

  const technicalPairs: [string, string][] = []
  if (row.http_method) technicalPairs.push(['HTTP method', row.http_method])
  if (row.path) technicalPairs.push(['Path', row.path])
  if (row.status_code != null) technicalPairs.push(['Status', String(row.status_code)])
  if (row.action) technicalPairs.push(['Action code', row.action])
  if (typeof m.technical_path === 'string') technicalPairs.push(['Technical path', m.technical_path])
  if (typeof m.entity_type === 'string') technicalPairs.push(['Entity type', m.entity_type])
  if (typeof m.entity_id === 'number') technicalPairs.push(['Entity id', String(m.entity_id)])
  if (row.severity) technicalPairs.push(['Severity', row.severity])
  if (row.ip_address) technicalPairs.push(['IP', row.ip_address])
  if (row.user_agent) technicalPairs.push(['User agent', row.user_agent])
  if (row.request_id) technicalPairs.push(['Request ID', row.request_id])
  if (row.log_category) technicalPairs.push(['Log stream', row.log_category])
  if (row.event_source) technicalPairs.push(['Source', row.event_source])
  if (typeof m.access_kind === 'string') technicalPairs.push(['Access class', m.access_kind])
  if (typeof m.event_subtype === 'string') technicalPairs.push(['Event subtype', m.event_subtype])

  return (
    <>
      <section className="audit-detail-section">
        <h3 className="audit-detail-h3">What happened</h3>
        <dl className="audit-detail-dl">
          <div>
            <dt>Summary</dt>
            <dd>{summary}</dd>
          </div>
          <div>
            <dt>Action type</dt>
            <dd>
              <span className={`audit-log-action-kind audit-log-action-kind--${actionKindClass(kind)}`}>{kind}</span>
            </dd>
          </div>
          <div>
            <dt>Outcome</dt>
            <dd>{typeof m.outcome === 'string' ? m.outcome : row.status_code != null ? httpOutcome(row.status_code) : '—'}</dd>
          </div>
        </dl>
      </section>

      <section className="audit-detail-section">
        <h3 className="audit-detail-h3">Where in the product</h3>
        <dl className="audit-detail-dl">
          <div>
            <dt>Feature</dt>
            <dd>{feature}</dd>
          </div>
          {area ? (
            <div>
              <dt>Area</dt>
              <dd>{area}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      <section className="audit-detail-section">
        <h3 className="audit-detail-h3">Who &amp; related record</h3>
        <dl className="audit-detail-dl">
          <div>
            <dt>Actor</dt>
            <dd>{row.actor_display ?? (row.actor_user_id != null ? `User #${row.actor_user_id}` : '—')}</dd>
          </div>
          {entity ? (
            <div>
              <dt>Related record</dt>
              <dd>{entity}</dd>
            </div>
          ) : null}
          {email ? (
            <div>
              <dt>Email</dt>
              <dd>{email}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      <section className="audit-detail-section">
        <h3 className="audit-detail-h3">Technical</h3>
        <dl className="audit-detail-dl">
          {technicalPairs.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>
                {k === 'Path' ? <code className="audit-detail-code">{v}</code> : v}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {row.old_value || row.new_value ? (
        <section className="audit-detail-section">
          <h3 className="audit-detail-h3">Before / after (when provided)</h3>
          {row.old_value ? (
            <>
              <h4 className="audit-detail-h4">Previous</h4>
              <pre className="audit-detail-json">{JSON.stringify(row.old_value, null, 2)}</pre>
            </>
          ) : null}
          {row.new_value ? (
            <>
              <h4 className="audit-detail-h4">New</h4>
              <pre className="audit-detail-json">{JSON.stringify(row.new_value, null, 2)}</pre>
            </>
          ) : null}
        </section>
      ) : null}

      <section className="audit-detail-section">
        <h3 className="audit-detail-h3">Raw metadata (complete)</h3>
        <pre className="audit-detail-json">{JSON.stringify(m, null, 2)}</pre>
      </section>
    </>
  )
}

function pickString(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v : null
}

function displaySummary(row: AuditLogEntry): string {
  const m = row.metadata || {}
  const s = typeof m.summary === 'string' ? m.summary.trim() : ''
  if (s) return s
  return (row.action && String(row.action)) || '—'
}

function actionKindLabel(meta: Record<string, unknown>, row: AuditLogEntry): string {
  const fromMeta = typeof meta.action_kind_label === 'string' ? meta.action_kind_label.trim() : ''
  if (fromMeta) return fromMeta
  const t = typeof meta.action_type === 'string' ? meta.action_type : ''
  if (t === 'read') return 'Info'
  if (t === 'create') return 'Create'
  if (t === 'update') return 'Update'
  if (t === 'delete') return 'Delete'
  const method = (row.http_method || '').toUpperCase()
  if (method === 'GET') return 'Info'
  if (method === 'POST') return 'Create'
  if (method === 'PUT' || method === 'PATCH') return 'Update'
  if (method === 'DELETE') return 'Delete'
  return 'Other'
}

function actionKindClass(label: string): string {
  const u = label.toLowerCase()
  if (u === 'info') return 'info'
  if (u === 'create') return 'create'
  if (u === 'update') return 'update'
  if (u === 'delete') return 'delete'
  return 'other'
}

function httpOutcome(code: number): string {
  if (code >= 200 && code < 300) return 'Success'
  if (code >= 300 && code < 400) return 'Redirect'
  if (code >= 400 && code < 500) return 'Client error'
  if (code >= 500) return 'Server error'
  return 'Unknown'
}

function formatTime(iso: string) {
  try {
    const d = new Date(iso)
    return d.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'medium',
    })
  } catch {
    return iso
  }
}

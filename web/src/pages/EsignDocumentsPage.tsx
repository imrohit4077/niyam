import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { esignApi, type EsignRequestRow } from '../api/esign'
import type { DashboardOutletContext } from '../layouts/DashboardOutletContext'

const STATUS_OPTS = ['all', 'sent', 'viewed', 'signed', 'queued', 'error', 'declined'] as const

function statusClass(s: string) {
  if (s === 'signed') return 'esign-doc-status esign-doc-status--signed'
  if (s === 'error' || s === 'declined') return 'esign-doc-status esign-doc-status--bad'
  if (s === 'viewed') return 'esign-doc-status esign-doc-status--viewed'
  return 'esign-doc-status esign-doc-status--pending'
}

function signingHref(url: string | null) {
  if (!url) return ''
  return url.startsWith('http') ? url : `${window.location.origin}${url}`
}

export default function EsignDocumentsPage() {
  const { token, accountId } = useOutletContext<DashboardOutletContext>()
  const [rows, setRows] = useState<EsignRequestRow[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [q, setQ] = useState('')

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setErr('')
    try {
      setRows(await esignApi.listAllRequests(token))
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Failed to load')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return rows.filter(r => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false
      if (!needle) return true
      const blob = [
        r.template_name,
        r.candidate_name,
        r.candidate_email,
        r.job_title,
        String(r.id),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return blob.includes(needle)
    })
  }, [rows, statusFilter, q])

  return (
    <div className="esign-docs-page">
      <header className="esign-docs-hero">
        <div>
          <h1 className="esign-docs-title">Signed documents</h1>
          <p className="esign-docs-lead">
            Every generated e-sign request for your workspace—merged in the backend with a permanent record and signing
            link. Open a row to copy the candidate signing URL or jump to their application.
          </p>
        </div>
        <Link to={`/account/${accountId}/settings/esign`} className="btn-esign-docs-secondary">
          E-sign templates &amp; rules
        </Link>
      </header>

      <div className="esign-docs-toolbar">
        <div className="esign-docs-search">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
          </svg>
          <input
            type="search"
            placeholder="Search candidate, job, template…"
            value={q}
            onChange={e => setQ(e.target.value)}
            aria-label="Filter documents"
          />
        </div>
        <div className="esign-docs-filter">
          <label htmlFor="esign-doc-status">Status</label>
          <select id="esign-doc-status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            {STATUS_OPTS.map(s => (
              <option key={s} value={s}>
                {s === 'all' ? 'All statuses' : s}
              </option>
            ))}
          </select>
        </div>
        <button type="button" className="btn-esign-docs-refresh" onClick={() => void load()} disabled={loading}>
          Refresh
        </button>
      </div>

      {loading && (
        <div className="esign-docs-loading">
          <div className="spinner" style={{ width: 28, height: 28 }} />
          Loading documents…
        </div>
      )}
      {!loading && err && <div className="esign-docs-error">{err}</div>}

      {!loading && !err && filtered.length === 0 && (
        <div className="esign-docs-empty">
          <p>No documents match your filters.</p>
          <p className="esign-docs-empty-hint">
            Generate documents from a candidate record, or move them into a pipeline stage that has e-sign rules.
          </p>
        </div>
      )}

      {!loading && !err && filtered.length > 0 && (
        <div className="esign-docs-table-wrap">
          <table className="esign-docs-table">
            <thead>
              <tr>
                <th>Created</th>
                <th>Candidate</th>
                <th>Job</th>
                <th>Document</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id}>
                  <td className="esign-docs-td-muted">{new Date(r.created_at).toLocaleString()}</td>
                  <td>
                    <div className="esign-docs-name">{r.candidate_name || '—'}</div>
                    <div className="esign-docs-email">{r.candidate_email || '—'}</div>
                  </td>
                  <td>{r.job_title || (r.job_id != null ? `Job #${r.job_id}` : '—')}</td>
                  <td className="esign-docs-template">{r.template_name || `Template #${r.template_id ?? '—'}`}</td>
                  <td>
                    <span className={statusClass(r.status)}>{r.status}</span>
                  </td>
                  <td className="esign-docs-actions">
                    {r.signing_url && (
                      <a
                        className="esign-docs-link"
                        href={signingHref(r.signing_url)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Signing link
                      </a>
                    )}
                    <Link className="esign-docs-link esign-docs-link--sub" to={`/account/${accountId}/job-applications/${r.application_id}`}>
                      Application
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

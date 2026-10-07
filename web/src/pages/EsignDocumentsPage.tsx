import { useCallback, useEffect, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { Icon } from '../icons'
import { EmptyState, LoadingState } from '../components/EmptyState'
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
  const [debouncedQ, setDebouncedQ] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 320)
    return () => clearTimeout(t)
  }, [q])

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setErr('')
    try {
      setRows(
        await esignApi.listAllRequests(token, {
          q: debouncedQ || undefined,
          status: statusFilter,
        }),
      )
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Failed to load')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [token, debouncedQ, statusFilter])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="esign-docs-page">
      <header className="esign-docs-hero">
        <div className="esign-docs-hero-copy">
          <span className="esign-docs-hero-icon">
            <Icon name="info" size={16} />
          </span>
          <p className="esign-docs-lead">
            Every generated e-sign request for your workspace—merged in the backend with a permanent record and signing
            link. Open a row to copy the candidate signing URL or jump to their application.
          </p>
        </div>
        <Link to={`/account/${accountId}/settings/esign`} className="btn-esign-docs-secondary">
          <Icon name="esign" size={15} /> Templates &amp; rules
        </Link>
      </header>

      <div className="esign-docs-toolbar">
        <div className="esign-docs-search">
          <Icon name="search" size={17} />
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
          <Icon name="refresh" size={15} /> Refresh
        </button>
      </div>

      {loading && (
        <div className="esign-docs-table-wrap">
          <LoadingState rows={4} label="Loading documents" />
        </div>
      )}
      {!loading && err && <div className="esign-docs-error">{err}</div>}

      {!loading && !err && rows.length === 0 && (
        <div className="esign-docs-table-wrap">
          <EmptyState
            icon="signature"
            size={88}
            title="No documents match your filters"
            text="Generate documents from a candidate record, or move them into a pipeline stage that has e-sign rules."
          />
        </div>
      )}

      {!loading && !err && rows.length > 0 && (
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
              {rows.map(r => (
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

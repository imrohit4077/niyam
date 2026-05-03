import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { roleKickoffApi, type RoleKickoffRequestRow } from '../api/roleKickoff'
import type { DashboardOutletContext } from '../layouts/DashboardOutletContext'
import { can } from '../permissions'
import { useAuth } from '../auth/AuthContext'

function statusLabel(status: string): string {
  const m: Record<string, string> = {
    submitted: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    changes_requested: 'Changes requested',
    converted: 'Converted to job',
  }
  return m[status] ?? status
}

function statusTagClass(status: string): string {
  if (status === 'approved') return 'tag-green'
  if (status === 'submitted') return 'tag-orange'
  if (status === 'rejected') return 'tag-red'
  if (status === 'changes_requested') return 'tag-orange'
  if (status === 'converted') return 'tag-blue'
  return 'tag-gray'
}

export default function RoleKickoffHubPage() {
  const { token, accountId } = useOutletContext<DashboardOutletContext>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { accountId: acct } = useParams<{ accountId: string }>()
  const base = `/account/${acct ?? accountId}/jobs/role-kickoff`

  const showMy = can(user, 'kickoff', 'submit')
  const showQueue = can(user, 'kickoff', 'process')

  const [myRows, setMyRows] = useState<RoleKickoffRequestRow[]>([])
  const [queueRows, setQueueRows] = useState<RoleKickoffRequestRow[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    setErr('')
    setLoading(true)
    try {
      const tasks: Promise<void>[] = []
      if (showMy) {
        tasks.push(
          roleKickoffApi.list(token, 'my').then(r => {
            setMyRows(r)
          }),
        )
      } else {
        setMyRows([])
      }
      if (showQueue) {
        tasks.push(
          roleKickoffApi.list(token, 'queue').then(r => {
            setQueueRows(r)
          }),
        )
      } else {
        setQueueRows([])
      }
      await Promise.all(tasks)
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [token, showMy, showQueue])

  useEffect(() => {
    void load()
  }, [load])

  if (!showMy && !showQueue) {
    return (
      <div className="role-kickoff-page">
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>You do not have access to role kickoff.</p>
      </div>
    )
  }

  return (
    <div className="role-kickoff-page">
      <header className="role-kickoff-page-header">
        <h1 className="role-kickoff-page-title">Role kickoff</h1>
        {showMy ? (
          <button type="button" className="btn-jobs-primary" onClick={() => navigate(`${base}/new`)}>
            + Create role kickoff request
          </button>
        ) : null}
      </header>

      {err ? (
        <div className="panel-row-value" style={{ color: 'var(--error)', marginBottom: 16 }}>
          {err}
        </div>
      ) : null}

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }} aria-label="Loading" />
          Loading…
        </div>
      ) : null}

      {!loading && showQueue ? (
        <>
          <h2 className="role-kickoff-section-title">Assigned to you (recruiter queue)</h2>
          <div className="list-table">
            <div className="list-table-head">
              <div className="list-col list-col-main">Hiring manager</div>
              <div className="list-col">Job title</div>
              <div className="list-col">Openings</div>
              <div className="list-col">Status</div>
            </div>
            {queueRows.length === 0 ? (
              <div className="list-row">
                <div className="list-col" style={{ gridColumn: '1 / -1', padding: '24px', color: 'var(--text-muted)' }}>
                  No requests in your queue.
                </div>
              </div>
            ) : (
              queueRows.map(row => (
                <Link key={row.id} to={`${base}/${row.id}`} className="list-row">
                  <div className="list-col list-col-main">
                    <div className="list-row-name">{row.hiring_manager_name ?? '—'}</div>
                    <div className="list-row-sub">{row.hiring_manager_email ?? ''}</div>
                  </div>
                  <div className="list-col list-row-name">{row.title}</div>
                  <div className="list-col">{row.open_positions}</div>
                  <div className="list-col">
                    <span className={`tag ${statusTagClass(String(row.status))}`}>{statusLabel(String(row.status))}</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </>
      ) : null}

      {!loading && showMy ? (
        <>
          <h2 className="role-kickoff-section-title">Your requests</h2>
          <div className="list-table">
            <div className="list-table-head">
              <div className="list-col list-col-main">Job title</div>
              <div className="list-col">Recruiter</div>
              <div className="list-col">Openings</div>
              <div className="list-col">Status</div>
            </div>
            {myRows.length === 0 ? (
              <div className="list-row">
                <div className="list-col" style={{ gridColumn: '1 / -1', padding: '24px', color: 'var(--text-muted)' }}>
                  You have not submitted a role kickoff yet.
                </div>
              </div>
            ) : (
              myRows.map(row => (
                <Link key={row.id} to={`${base}/${row.id}`} className="list-row">
                  <div className="list-col list-col-main">
                    <div className="list-row-name">{row.title}</div>
                    <div className="list-row-sub">{row.department ?? '—'}</div>
                  </div>
                  <div className="list-col">
                    <div>{row.recruiter_name ?? '—'}</div>
                    <div className="list-row-sub">{row.recruiter_email ?? ''}</div>
                  </div>
                  <div className="list-col">{row.open_positions}</div>
                  <div className="list-col">
                    <span className={`tag ${statusTagClass(String(row.status))}`}>{statusLabel(String(row.status))}</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </>
      ) : null}
    </div>
  )
}

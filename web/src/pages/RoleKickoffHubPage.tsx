import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { Icon } from '../icons'
import { EmptyState, LoadingState } from '../components/EmptyState'
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
        <EmptyState icon="lock" title="No access" text="You do not have access to role kickoff." />
      </div>
    )
  }

  return (
    <div className="role-kickoff-page">
      <header className="role-kickoff-page-header">
        <h2 className="role-kickoff-page-title">Requests</h2>
        {showMy ? (
          <button type="button" className="btn-jobs-primary" onClick={() => navigate(`${base}/new`)}>
            <Icon name="plus" size={16} strokeWidth={2.2} /> New kickoff request
          </button>
        ) : null}
      </header>

      {err ? (
        <div className="nx-alert nx-alert--error" role="alert">
          <Icon name="alert" size={16} />
          {err}
        </div>
      ) : null}

      {loading ? (
        <div className="list-table">
          <LoadingState rows={3} />
        </div>
      ) : null}

      {!loading && showQueue ? (
        <>
          <h3 className="role-kickoff-section-title">
            <Icon name="inbox" size={15} /> Assigned to you
            <span className="role-kickoff-section-count">{queueRows.length}</span>
          </h3>
          <div className="list-table">
            <div className="list-table-head">
              <div className="list-col list-col-main">Hiring manager</div>
              <div className="list-col">Job title</div>
              <div className="list-col">Openings</div>
              <div className="list-col">Status</div>
            </div>
            {queueRows.length === 0 ? (
              <EmptyState icon="inbox" size={56} title="Your queue is clear" text="Kickoff requests assigned to you as recruiter will land here." />
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
          <h3 className="role-kickoff-section-title">
            <Icon name="kickoff" size={15} /> Your requests
            <span className="role-kickoff-section-count">{myRows.length}</span>
          </h3>
          <div className="list-table">
            <div className="list-table-head">
              <div className="list-col list-col-main">Job title</div>
              <div className="list-col">Recruiter</div>
              <div className="list-col">Openings</div>
              <div className="list-col">Status</div>
            </div>
            {myRows.length === 0 ? (
              <EmptyState
                icon="kickoff"
                size={56}
                title="No kickoff requests yet"
                text="Start a kickoff to align with your recruiter on scope, budget and pipeline before the role opens."
              />
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

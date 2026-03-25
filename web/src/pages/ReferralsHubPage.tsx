import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useToast } from '../contexts/ToastContext'
import type { DashboardOutletContext } from '../layouts/DashboardOutletContext'
import {
  referralsApi,
  type ReferralAdminOverview,
  type ReferralBonusEnriched,
  type ReferralEnrichedApplication,
  type ReferralGeneratedLinkRow,
  type LeaderboardEntry,
} from '../api/referrals'
import { jobsApi, type Job } from '../api/jobs'
import type { Application } from '../api/applications'
import './ReferralsHubPage.css'

type TabId = 'open_jobs' | 'my' | 'leaderboard' | 'admin_upcoming' | 'admin_past' | 'admin_claimed'

function appLink(accountId: string, id: number) {
  return `/account/${accountId}/job-applications/${id}`
}

export default function ReferralsHubPage() {
  const { token, accountId } = useOutletContext<DashboardOutletContext>()
  const { user } = useAuth()
  const { success, error: showError } = useToast()
  const isAdmin = user?.role?.slug === 'admin'

  const [tab, setTab] = useState<TabId>('open_jobs')
  const [loading, setLoading] = useState(true)
  const [openJobs, setOpenJobs] = useState<Job[]>([])
  const [myRows, setMyRows] = useState<Application[]>([])
  const [board, setBoard] = useState<LeaderboardEntry[]>([])
  const [adminOverview, setAdminOverview] = useState<ReferralAdminOverview | null>(null)
  const [linkLoadingJobId, setLinkLoadingJobId] = useState<number | null>(null)

  const jobTitleById = useMemo(() => {
    const m = new Map<number, string>()
    for (const j of openJobs) m.set(j.id, j.title)
    return m
  }, [openJobs])

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const [jobs, mine, lb, ov] = await Promise.all([
        jobsApi.list(token, { status: 'open' }),
        referralsApi.myReferrals(token),
        referralsApi.leaderboard(token, 50),
        isAdmin ? referralsApi.adminOverview(token) : Promise.resolve(null),
      ])
      setOpenJobs(jobs)
      setMyRows(mine)
      setBoard(lb.leaderboard)
      setAdminOverview(ov)
    } catch (e) {
      showError('Could not load referrals', e instanceof Error ? e.message : undefined)
    } finally {
      setLoading(false)
    }
  }, [token, isAdmin, showError])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!isAdmin && (tab === 'admin_upcoming' || tab === 'admin_past' || tab === 'admin_claimed')) {
      setTab('open_jobs')
    }
  }, [isAdmin, tab])

  async function exportCsv() {
    if (!token || !isAdmin) return
    try {
      const blob = await referralsApi.exportBonusesCsv(token)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'referral_bonuses.csv'
      a.click()
      URL.revokeObjectURL(url)
      success('Download started')
    } catch (e) {
      showError('Export failed', e instanceof Error ? e.message : undefined)
    }
  }

  async function copyReferralLinkForJob(jobId: number) {
    if (!token) return
    setLinkLoadingJobId(jobId)
    try {
      const r = await referralsApi.getJobReferralLink(token, jobId)
      const url =
        r.referral_url?.trim() ||
        `${typeof window !== 'undefined' ? window.location.origin : ''}/apply/${r.apply_token}${r.path_with_query || ''}`
      await navigator.clipboard.writeText(url)
      success('Link copied', 'Share this URL with your candidate. It attributes the application to you.')
    } catch (e) {
      showError(
        'Could not create referral link',
        e instanceof Error ? e.message : 'Referrals may be disabled for this job or workspace.',
      )
    } finally {
      setLinkLoadingJobId(null)
    }
  }

  async function markPaid(id: number) {
    if (!token) return
    try {
      await referralsApi.updateBonus(token, id, { mark_paid: true })
      success('Marked paid')
      const ov = await referralsApi.adminOverview(token)
      setAdminOverview(ov)
    } catch (e) {
      showError('Update failed', e instanceof Error ? e.message : undefined)
    }
  }

  const ov = adminOverview

  return (
    <div className="referrals-hub">
      <header className="page-header">
        <h1 className="page-title">Referrals</h1>
        <p className="page-header-lead">
          {isAdmin
            ? 'Employees use Open roles to copy links. As admin, use the Team views to monitor generated links, pipeline, closed applications, and claimed bonuses.'
            : 'Browse open roles and copy your personal referral link for each job, then track candidates and leaderboard activity.'}
        </p>
      </header>

      <div className="referrals-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'open_jobs'}
          className={tab === 'open_jobs' ? 'referrals-tab referrals-tab--active' : 'referrals-tab'}
          onClick={() => setTab('open_jobs')}
        >
          Open roles
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'my'}
          className={tab === 'my' ? 'referrals-tab referrals-tab--active' : 'referrals-tab'}
          onClick={() => setTab('my')}
        >
          My referrals
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'leaderboard'}
          className={tab === 'leaderboard' ? 'referrals-tab referrals-tab--active' : 'referrals-tab'}
          onClick={() => setTab('leaderboard')}
        >
          Leaderboard
        </button>
        {isAdmin && (
          <>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'admin_upcoming'}
              className={tab === 'admin_upcoming' ? 'referrals-tab referrals-tab--active' : 'referrals-tab'}
              onClick={() => setTab('admin_upcoming')}
            >
              Team · Upcoming
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'admin_past'}
              className={tab === 'admin_past' ? 'referrals-tab referrals-tab--active' : 'referrals-tab'}
              onClick={() => setTab('admin_past')}
            >
              Team · Past
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'admin_claimed'}
              className={tab === 'admin_claimed' ? 'referrals-tab referrals-tab--active' : 'referrals-tab'}
              onClick={() => setTab('admin_claimed')}
            >
              Team · Claimed
            </button>
          </>
        )}
      </div>

      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : (
        <>
          {tab === 'open_jobs' && (
            <div className="referrals-panel">
              <p className="referrals-open-lead">
                Every open job below has a unique link for <strong>you</strong>. When someone applies through it, they’re
                attributed as your referral. Bonus rules are set per job in the job editor (Employee referrals step).
              </p>
              {openJobs.length === 0 ? (
                <p className="text-muted">There are no open jobs right now. Check back when recruiting publishes a role.</p>
              ) : (
                <table className="referrals-table">
                  <thead>
                    <tr>
                      <th>Job</th>
                      <th>Location</th>
                      <th>Type</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {openJobs.map(job => (
                      <tr key={job.id}>
                        <td>
                          <span className="referrals-name">{job.title}</span>
                          {job.department && (
                            <span className="referrals-email" style={{ display: 'block' }}>
                              {job.department}
                            </span>
                          )}
                        </td>
                        <td>{job.location || '—'}</td>
                        <td>{job.employment_type?.replace(/_/g, ' ') ?? '—'}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <button
                            type="button"
                            className="referrals-get-link-btn"
                            disabled={linkLoadingJobId === job.id}
                            onClick={() => void copyReferralLinkForJob(job.id)}
                          >
                            {linkLoadingJobId === job.id ? '…' : 'Copy my referral link'}
                          </button>
                          {job.apply_token ? (
                            <Link
                              to={`/apply/${job.apply_token}`}
                              target="_blank"
                              rel="noreferrer"
                              className="referrals-preview-link"
                            >
                              Preview apply page
                            </Link>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {tab === 'my' && (
            <div className="referrals-panel">
              {myRows.length === 0 ? (
                <p className="text-muted">
                  You haven’t referred anyone yet. Use the <strong>Open roles</strong> tab to copy your link for each job.
                </p>
              ) : (
                <table className="referrals-table">
                  <thead>
                    <tr>
                      <th>Candidate</th>
                      <th>Job</th>
                      <th>Status</th>
                      <th>Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myRows.map(row => (
                      <tr key={row.id}>
                        <td>
                          <Link to={appLink(accountId, row.id)} className="referrals-link">
                            {row.candidate_name || row.candidate_email}
                          </Link>
                        </td>
                        <td>{jobTitleById.get(row.job_id) ?? `Job #${row.job_id}`}</td>
                        <td>
                          <span className="referrals-pill">{row.status}</span>
                        </td>
                        <td>{row.referral_source || row.source_type}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {tab === 'leaderboard' && (
            <div className="referrals-panel">
              {board.length === 0 ? (
                <p className="text-muted">No referral activity yet.</p>
              ) : (
                <table className="referrals-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Employee</th>
                      <th>Referrals</th>
                      <th>Hires</th>
                    </tr>
                  </thead>
                  <tbody>
                    {board.map((row, i) => (
                      <tr key={row.user_id}>
                        <td>{i + 1}</td>
                        <td>
                          <span className="referrals-name">{row.name}</span>
                          <span className="referrals-email">{row.email}</span>
                        </td>
                        <td>{row.referrals_count}</td>
                        <td>{row.hires_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {tab === 'admin_upcoming' && isAdmin && !ov && (
            <div className="referrals-panel">
              <p className="text-muted">Team referral data could not be loaded. Refresh the page or check your admin role.</p>
            </div>
          )}

          {tab === 'admin_upcoming' && isAdmin && ov && (
            <div className="referrals-panel referrals-panel--admin">
              <p className="referrals-admin-lead">
                <strong>Upcoming</strong> covers links employees generated (even before anyone applies), candidates still
                in the pipeline, and hires where a bonus may still be pending or eligible.
              </p>

              <h3 className="referrals-section-title">1. Links generated</h3>
              <p className="referrals-section-hint">Each row is a unique <code>?ref=</code> token created for an employee on a job.</p>
              {ov.generated_links.length === 0 ? (
                <p className="text-muted">No referral links created yet.</p>
              ) : (
                <table className="referrals-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Job</th>
                      <th>Created</th>
                      <th>Applies</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ov.generated_links.map((row: ReferralGeneratedLinkRow) => (
                      <tr key={row.id}>
                        <td>
                          <span className="referrals-name">{row.employee?.name ?? '—'}</span>
                          <span className="referrals-email">{row.employee?.email ?? ''}</span>
                        </td>
                        <td>{row.job?.title ?? `Job #${row.job_id}`}</td>
                        <td>{row.created_at?.slice(0, 10) ?? '—'}</td>
                        <td>{row.applications_count}</td>
                        <td>
                          {row.awaiting_first_apply ? (
                            <span className="referrals-badge referrals-badge--amber">Awaiting first apply</span>
                          ) : (
                            <span className="referrals-badge referrals-badge--teal">Link in use</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <h3 className="referrals-section-title">2. In pipeline</h3>
              <p className="referrals-section-hint">Referred candidates in active stages (applied → offer).</p>
              {ov.active_referrals.length === 0 ? (
                <p className="text-muted">None right now.</p>
              ) : (
                <ReferralAppTable rows={ov.active_referrals} accountId={accountId} />
              )}

              <h3 className="referrals-section-title">3. Hired (referral)</h3>
              <p className="referrals-section-hint">Hires attributed to a referrer—bonus row may be pending, eligible, or paid (see Team · Claimed).</p>
              {ov.hired_referrals.length === 0 ? (
                <p className="text-muted">No hired referrals yet.</p>
              ) : (
                <ReferralAppTable rows={ov.hired_referrals} accountId={accountId} showBonus />
              )}
            </div>
          )}

          {tab === 'admin_past' && isAdmin && !ov && (
            <div className="referrals-panel">
              <p className="text-muted">Team referral data could not be loaded.</p>
            </div>
          )}

          {tab === 'admin_past' && isAdmin && ov && (
            <div className="referrals-panel referrals-panel--admin">
              <p className="referrals-admin-lead">
                <strong>Past</strong> referrals: applications that ended as rejected or withdrawn (no longer active in the
                pipeline).
              </p>
              {ov.past_referrals.length === 0 ? (
                <p className="text-muted">No closed referral outcomes yet.</p>
              ) : (
                <ReferralAppTable rows={ov.past_referrals} accountId={accountId} />
              )}
            </div>
          )}

          {tab === 'admin_claimed' && isAdmin && !ov && (
            <div className="referrals-panel">
              <p className="text-muted">Team referral data could not be loaded.</p>
            </div>
          )}

          {tab === 'admin_claimed' && isAdmin && ov && (
            <div className="referrals-panel referrals-panel--admin">
              <p className="referrals-admin-lead">
                <strong>Claimed</strong> shows bonuses marked paid. Pending / eligible payouts are listed first for payroll
                processing.
              </p>
              <div className="referrals-toolbar">
                <button type="button" className="referrals-btn-outline" onClick={() => void exportCsv()}>
                  Export all bonus rows (CSV)
                </button>
              </div>

              <h3 className="referrals-section-title">Pending & eligible (not paid yet)</h3>
              {ov.bonuses_pending.length === 0 ? (
                <p className="text-muted">No pending or eligible bonus rows.</p>
              ) : (
                <BonusTable
                  rows={ov.bonuses_pending}
                  accountId={accountId}
                  onMarkPaid={id => void markPaid(id)}
                />
              )}

              <h3 className="referrals-section-title">Successfully claimed (paid)</h3>
              {ov.bonuses_paid.length === 0 ? (
                <p className="text-muted">No paid referral bonuses yet.</p>
              ) : (
                <BonusTable rows={ov.bonuses_paid} accountId={accountId} paidOnly />
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function ReferralAppTable({
  rows,
  accountId,
  showBonus,
}: {
  rows: ReferralEnrichedApplication[]
  accountId: string
  showBonus?: boolean
}) {
  return (
    <table className="referrals-table">
      <thead>
        <tr>
          <th>Candidate</th>
          <th>Job</th>
          <th>Referrer</th>
          <th>Status</th>
          {showBonus ? <th>Bonus</th> : null}
        </tr>
      </thead>
      <tbody>
        {rows.map(row => (
          <tr key={row.id}>
            <td>
              <Link to={appLink(accountId, row.id)} className="referrals-link">
                {row.candidate_name || row.candidate_email}
              </Link>
            </td>
            <td>{row.job?.title ?? `Job #${row.job_id}`}</td>
            <td>
              <span className="referrals-name">{row.referrer?.name ?? '—'}</span>
              <span className="referrals-email">{row.referrer?.email ?? ''}</span>
            </td>
            <td>
              <span className="referrals-pill">{row.status}</span>
            </td>
            {showBonus ? (
              <td>
                {row.bonus ? (
                  <span className="referrals-pill">
                    {row.bonus.status} · {row.bonus.amount} {row.bonus.currency}
                  </span>
                ) : (
                  <span className="text-muted">—</span>
                )}
              </td>
            ) : null}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function BonusTable({
  rows,
  accountId,
  onMarkPaid,
  paidOnly,
}: {
  rows: ReferralBonusEnriched[]
  accountId: string
  onMarkPaid?: (id: number) => void
  paidOnly?: boolean
}) {
  const showActions = !paidOnly && onMarkPaid
  return (
    <table className="referrals-table">
      <thead>
        <tr>
          <th>Candidate</th>
          <th>Job</th>
          <th>Referrer</th>
          <th>Amount</th>
          <th>Status</th>
          <th>Eligible / paid</th>
          {showActions ? <th /> : null}
        </tr>
      </thead>
      <tbody>
        {rows.map(b => {
          const app = b.application
          const email = app?.candidate_email ?? '—'
          return (
            <tr key={b.id}>
              <td>
                {app ? (
                  <Link to={appLink(accountId, app.id)} className="referrals-link">
                    {app.candidate_name || email}
                  </Link>
                ) : (
                  email
                )}
              </td>
              <td>{b.job?.title ?? (app ? `Job #${app.job_id}` : '—')}</td>
              <td>
                <span className="referrals-name">{b.referrer?.name ?? '—'}</span>
                <span className="referrals-email">{b.referrer?.email ?? ''}</span>
              </td>
              <td>
                {b.amount.toLocaleString()} {b.currency}
              </td>
              <td>
                <span className="referrals-pill">{b.status}</span>
              </td>
              <td>
                {b.paid_at ? (
                  <span>Paid {b.paid_at.slice(0, 10)}</span>
                ) : (
                  <span>{b.eligible_after ? `Eligible after ${b.eligible_after}` : '—'}</span>
                )}
              </td>
              {showActions ? (
                <td>
                  {b.status !== 'paid' ? (
                    <button type="button" className="btn-text" onClick={() => onMarkPaid!(b.id)}>
                      Mark paid
                    </button>
                  ) : null}
                </td>
              ) : null}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

import { Link } from 'react-router-dom'
import type { Application } from '../../api/applications'
import type { Job } from '../../api/jobs'
import { dominantApplicantStage, formatDashboardLabel } from './dashboardMetrics'

const STAGE_COLORS: Record<string, string> = {
  applied: 'tag-blue',
  screening: 'tag-orange',
  interview: 'tag-blue',
  offer: 'tag-green',
  hired: 'tag-green',
  rejected: 'tag-red',
  withdrawn: 'tag-gray',
  draft: 'tag-gray',
  open: 'tag-green',
  closed: 'tag-gray',
  paused: 'tag-orange',
}

export function DashboardJobsTable({
  jobs,
  applications,
  accountId,
  loading,
  error,
  selectedJobId,
  onSelectJob,
}: {
  jobs: Job[]
  applications: Application[]
  accountId: string
  loading: boolean
  error: string
  selectedJobId: string
  onSelectJob: (id: string) => void
}) {
  if (loading) {
    return (
      <div className="dashboard-jobs-table-wrap" aria-busy="true">
        <table className="dashboard-jobs-table">
          <thead>
            <tr>
              <th>Job title</th>
              <th>Status</th>
              <th>Applicants</th>
              <th>Top stage</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                <td colSpan={5}>
                  <div className="dashboard-skeleton dashboard-skeleton-line" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (error) {
    return (
      <div className="dashboard-jobs-table-error" role="alert">
        {error}
      </div>
    )
  }

  if (jobs.length === 0) {
    return <div className="dashboard-empty">No jobs yet. Create a role to start hiring.</div>
  }

  const byJob = applications.reduce<Record<number, Application[]>>((acc, a) => {
    if (!acc[a.job_id]) acc[a.job_id] = []
    acc[a.job_id].push(a)
    return acc
  }, {})

  return (
    <div className="dashboard-jobs-table-wrap">
      <table className="dashboard-jobs-table">
        <thead>
          <tr>
            <th>Job title</th>
            <th>Status</th>
            <th>Applicants</th>
            <th>Top stage</th>
            <th className="dashboard-jobs-table-th-actions" />
          </tr>
        </thead>
        <tbody>
          {jobs.map(job => {
            const list = byJob[job.id] ?? []
            const stage = dominantApplicantStage(list)
            const active = selectedJobId === String(job.id)
            return (
              <tr key={job.id} className={active ? 'dashboard-jobs-table-row--active' : undefined}>
                <td>
                  <button
                    type="button"
                    className="dashboard-jobs-table-title-btn"
                    onClick={() => onSelectJob(String(job.id))}
                  >
                    {job.title}
                  </button>
                  <div className="dashboard-jobs-table-sub">{job.department ?? '—'} · {job.location ?? 'TBD'}</div>
                </td>
                <td>
                  <span className={`tag ${STAGE_COLORS[job.status] ?? 'tag-gray'}`}>{formatDashboardLabel(job.status)}</span>
                </td>
                <td>
                  <span className="dashboard-jobs-table-num">{list.length}</span>
                </td>
                <td>
                  <span className="dashboard-jobs-table-stage">{list.length ? stage : '—'}</span>
                </td>
                <td className="dashboard-jobs-table-actions">
                  <Link className="dashboard-link dashboard-link--compact" to={`/account/${accountId}/jobs/${job.id}/edit`}>
                    Open
                  </Link>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

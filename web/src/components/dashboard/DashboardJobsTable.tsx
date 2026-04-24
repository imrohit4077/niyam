import { Link } from 'react-router-dom'
import type { Job } from '../../api/jobs'

export type DashboardJobRow = {
  job: Job
  applicantCount: number
  topStageLabel: string | null
}

export function DashboardJobsTable({
  rows,
  selectedJobId,
  onSelectJob,
  accountId,
  loading,
}: {
  rows: DashboardJobRow[]
  selectedJobId: string
  onSelectJob: (jobId: string) => void
  accountId: string
  loading?: boolean
}) {
  if (loading) {
    return (
      <div className="dashboard-jobs-table-wrap">
        <table className="dashboard-jobs-table">
          <thead>
            <tr>
              <th>Job title</th>
              <th>Status</th>
              <th>Applicants</th>
              <th>Top stage</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                <td colSpan={4}>
                  <span className="dashboard-skeleton-line dashboard-skeleton-line--table" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (rows.length === 0) {
    return <div className="dashboard-empty dashboard-empty--compact">No jobs yet. Create a role to get started.</div>
  }

  return (
    <div className="dashboard-jobs-table-wrap">
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
          {rows.map(({ job, applicantCount, topStageLabel }) => (
            <tr
              key={job.id}
              className={selectedJobId === String(job.id) ? 'dashboard-jobs-table-row--active' : undefined}
            >
              <td>
                <button type="button" className="dashboard-jobs-table-title-btn" onClick={() => onSelectJob(String(job.id))}>
                  {job.title}
                </button>
              </td>
              <td>
                <span className={`dashboard-jobs-status dashboard-jobs-status--${job.status}`}>{formatJobStatus(job.status)}</span>
              </td>
              <td>{applicantCount}</td>
              <td>{topStageLabel ?? '—'}</td>
              <td className="dashboard-jobs-table-actions">
                <Link className="dashboard-link dashboard-link--table" to={`/account/${accountId}/jobs/${job.id}/edit`}>
                  Open
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function formatJobStatus(status: string) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())
}

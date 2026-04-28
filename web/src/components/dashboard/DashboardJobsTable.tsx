import { Link } from 'react-router-dom'
import { formatDashboardLabel } from './dashboardFormat'
import { STAGE_COLORS } from './dashboardConstants'
import type { JobTableRow } from './dashboardJobsModel'

export function DashboardJobsTable({
  rows,
  loading,
  accountId,
}: {
  rows: JobTableRow[]
  loading: boolean
  accountId: string
}) {
  if (loading) {
    return (
      <div className="dashboard-jobs-table-wrap">
        <table className="dashboard-jobs-table">
          <thead>
            <tr>
              <th>Job</th>
              <th>Status</th>
              <th>Applicants</th>
              <th>Stage</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 4 }).map((_, i) => (
              <tr key={i}>
                <td colSpan={4}>
                  <div className="dashboard-table-skeleton-cell" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (rows.length === 0) {
    return <div className="dashboard-empty">No jobs yet. Create a role to start hiring.</div>
  }

  const sorted = [...rows].sort((a, b) => b.applicants - a.applicants)

  return (
    <div className="dashboard-jobs-table-wrap">
      <table className="dashboard-jobs-table">
        <thead>
          <tr>
            <th>Job title</th>
            <th>Status</th>
            <th>Applicants</th>
            <th>Stage</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(({ job, applicants, stageLabel, stageKey }) => (
            <tr key={job.id}>
              <td>
                <Link className="dashboard-jobs-table-title" to={`/account/${accountId}/jobs/${job.id}/edit`}>
                  {job.title}
                </Link>
                <span className="dashboard-jobs-table-sub">{job.department ?? 'General'}</span>
              </td>
              <td>
                <span className={`tag ${STAGE_COLORS[job.status] ?? 'tag-blue'}`}>{formatDashboardLabel(job.status)}</span>
              </td>
              <td>
                <span className="dashboard-jobs-table-num">{applicants}</span>
              </td>
              <td>
                <span className={`tag ${STAGE_COLORS[stageKey] ?? 'tag-blue'}`}>{stageLabel}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="dashboard-panel-footer">
        <Link className="dashboard-link" to={`/account/${accountId}/jobs`}>
          View all jobs
        </Link>
      </div>
    </div>
  )
}

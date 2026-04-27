import { Link } from 'react-router-dom'
import type { Job } from '../../api/jobs'

function formatStatus(status: string) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

/** Primary hiring stage label derived from job record (not pipeline board). */
function jobHiringStage(job: Job) {
  if (job.status === 'open') return 'Active hiring'
  if (job.status === 'paused') return 'Paused'
  if (job.status === 'closed') return 'Closed'
  if (job.status === 'draft') return 'Draft'
  return formatStatus(job.status)
}

export function DashboardJobsOverviewTable({
  jobs,
  applicationsByJobId,
  accountId,
  maxRows = 12,
}: {
  jobs: Job[]
  applicationsByJobId: Map<number, number>
  accountId: string
  maxRows?: number
}) {
  const rows = [...jobs].sort((a, b) => a.title.localeCompare(b.title)).slice(0, maxRows)

  if (rows.length === 0) {
    return <div className="dashboard-empty">No jobs yet. Create a role to start tracking applicants.</div>
  }

  return (
    <div className="dashboard-table-wrap">
      <table className="dashboard-table">
        <thead>
          <tr>
            <th scope="col">Job title</th>
            <th scope="col">Status</th>
            <th scope="col" className="dashboard-table-numeric">
              Applicants
            </th>
            <th scope="col">Stage</th>
            <th scope="col" className="dashboard-table-actions">
              {' '}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(job => (
            <tr key={job.id}>
              <td>
                <span className="dashboard-table-title">{job.title}</span>
                <span className="dashboard-table-muted">
                  {job.department ?? 'General'} · {job.location ?? 'Location TBD'}
                </span>
              </td>
              <td>
                <span className={`dashboard-table-pill dashboard-table-pill--${job.status}`}>{formatStatus(job.status)}</span>
              </td>
              <td className="dashboard-table-numeric">{applicationsByJobId.get(job.id) ?? 0}</td>
              <td>{jobHiringStage(job)}</td>
              <td className="dashboard-table-actions">
                <Link className="dashboard-link dashboard-link--table" to={`/account/${accountId}/jobs/${job.id}/edit`}>
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

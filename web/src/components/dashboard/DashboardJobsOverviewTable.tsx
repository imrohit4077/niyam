import { Link } from 'react-router-dom'
import type { JobOverviewRow } from './dashboardJobOverview'

function formatStatus(status: string) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

type Props = {
  rows: JobOverviewRow[]
  accountId: string
  loading?: boolean
}

export default function DashboardJobsOverviewTable({ rows, accountId, loading }: Props) {
  if (loading) {
    return (
      <div className="dashboard-table-wrap" role="status" aria-label="Loading jobs">
        <table className="dashboard-table">
          <thead>
            <tr>
              <th>Job title</th>
              <th>Status</th>
              <th>Applicants</th>
              <th>Stage</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                <td>
                  <span className="dashboard-table-skeleton" />
                </td>
                <td>
                  <span className="dashboard-table-skeleton dashboard-table-skeleton--short" />
                </td>
                <td>
                  <span className="dashboard-table-skeleton dashboard-table-skeleton--narrow" />
                </td>
                <td>
                  <span className="dashboard-table-skeleton" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (rows.length === 0) {
    return <div className="dashboard-empty">No jobs yet. Create a role to start tracking applicants.</div>
  }

  return (
    <div className="dashboard-table-wrap">
      <table className="dashboard-table">
        <thead>
          <tr>
            <th>Job title</th>
            <th>Status</th>
            <th>Applicants</th>
            <th>Stage</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ job, applicants, stageLabel }) => (
            <tr key={job.id}>
              <td>
                <Link className="dashboard-table-title-link" to={`/account/${accountId}/jobs/${job.id}/edit`}>
                  {job.title}
                </Link>
                <span className="dashboard-table-meta">{job.department ?? 'General'} · {job.location ?? 'Location TBD'}</span>
              </td>
              <td>
                <span className={`dashboard-table-status dashboard-table-status--${job.status}`}>{formatStatus(job.status)}</span>
              </td>
              <td>{applicants}</td>
              <td>{stageLabel}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

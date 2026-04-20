import { Link } from 'react-router-dom'
import type { Job } from '../../api/jobs'
import { formatDashboardLabel } from './dashboardUtils'

type Props = {
  jobs: Job[]
  applicantCountByJobId: Record<number, number>
  dominantStageByJobId: Record<number, string>
  accountId: string
  loading: boolean
}

export function DashboardJobsOverview({
  jobs,
  applicantCountByJobId,
  dominantStageByJobId,
  accountId,
  loading,
}: Props) {
  if (loading) {
    return (
      <div className="dashboard-table-wrap" aria-busy="true">
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
            {Array.from({ length: 4 }, (_, i) => (
              <tr key={i}>
                <td>
                  <span className="dashboard-skeleton dashboard-skeleton--text-md" />
                </td>
                <td>
                  <span className="dashboard-skeleton dashboard-skeleton--pill" />
                </td>
                <td>
                  <span className="dashboard-skeleton dashboard-skeleton--text-sm" />
                </td>
                <td>
                  <span className="dashboard-skeleton dashboard-skeleton--text-sm" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (jobs.length === 0) {
    return <div className="dashboard-empty">No jobs yet. Create a role to start hiring.</div>
  }

  const sorted = [...jobs].sort((a, b) => (applicantCountByJobId[b.id] ?? 0) - (applicantCountByJobId[a.id] ?? 0))

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
          {sorted.map(job => (
            <tr key={job.id}>
              <td>
                <Link className="dashboard-table-link" to={`/account/${accountId}/jobs/${job.id}/edit`}>
                  {job.title}
                </Link>
                <span className="dashboard-table-sub">{job.department ?? 'General'}</span>
              </td>
              <td>
                <span className={`dashboard-status-pill dashboard-status-pill--${job.status}`}>
                  {formatDashboardLabel(job.status)}
                </span>
              </td>
              <td>{applicantCountByJobId[job.id] ?? 0}</td>
              <td>{formatDashboardLabel(dominantStageByJobId[job.id] ?? '—')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

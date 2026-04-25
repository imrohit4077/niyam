import { Link } from 'react-router-dom'
import type { Job } from '../../api/jobs'
import type { Application } from '../../api/applications'
import { dominantApplicantStage, formatDashboardLabel } from './dashboardUtils'

type Props = {
  jobs: Job[]
  applications: Application[]
  accountId: string
}

export function DashboardJobsOverviewTable({ jobs, applications, accountId }: Props) {
  if (jobs.length === 0) {
    return <div className="dashboard-empty">No jobs yet. Create a role to start hiring.</div>
  }

  const sorted = [...jobs].sort((a, b) => a.title.localeCompare(b.title))

  return (
    <div className="dashboard-table-wrap">
      <table className="dashboard-jobs-table">
        <thead>
          <tr>
            <th scope="col">Job title</th>
            <th scope="col">Status</th>
            <th scope="col" className="dashboard-jobs-table-num">
              Applicants
            </th>
            <th scope="col">Dominant stage</th>
            <th scope="col" className="dashboard-jobs-table-actions">
              {/* link */}
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(job => {
            const count = applications.filter(a => a.job_id === job.id).length
            const stage = dominantApplicantStage(job, applications)
            return (
              <tr key={job.id}>
                <td>
                  <span className="dashboard-jobs-table-title">{job.title}</span>
                  {(job.department || job.location) && (
                    <span className="dashboard-jobs-table-sub">
                      {[job.department, job.location].filter(Boolean).join(' · ')}
                    </span>
                  )}
                </td>
                <td>
                  <span className={`dashboard-job-status-tag dashboard-job-status-tag--${job.status}`}>
                    {formatDashboardLabel(job.status)}
                  </span>
                </td>
                <td className="dashboard-jobs-table-num">{count}</td>
                <td>{stage}</td>
                <td className="dashboard-jobs-table-actions">
                  <Link className="dashboard-link dashboard-link--compact" to={`/account/${accountId}/jobs/${job.id}/edit`}>
                    View
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

import { Link } from 'react-router-dom'
import type { Application } from '../api/applications'
import type { Job } from '../api/jobs'
import { STAGE_COLORS } from './dashboardConstants'
import { dominantApplicantStage, formatDashboardLabel } from './dashboardUtils'

type Props = {
  jobs: Job[]
  applications: Application[]
  accountId: string
  maxRows?: number
}

export function DashboardJobsOverviewTable({ jobs, applications, accountId, maxRows = 8 }: Props) {
  const rows = [...jobs].sort((a, b) => a.title.localeCompare(b.title)).slice(0, maxRows)
  if (rows.length === 0) {
    return <div className="dashboard-empty">No jobs yet. Create a role to start tracking applicants.</div>
  }

  return (
    <div className="dashboard-table-wrap">
      <table className="dashboard-table">
        <thead>
          <tr>
            <th>Job</th>
            <th>Status</th>
            <th className="dashboard-table-num">Applicants</th>
            <th>Stage</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(job => {
            const count = applications.filter(a => a.job_id === job.id).length
            const stage = dominantApplicantStage(applications, job.id)
            return (
              <tr key={job.id}>
                <td>
                  <Link className="dashboard-table-job-link" to={`/account/${accountId}/jobs/${job.id}/edit`}>
                    {job.title}
                  </Link>
                  <div className="dashboard-table-sub">{job.department ?? '—'} · {job.location ?? 'Location TBD'}</div>
                </td>
                <td>
                  <span className={`tag ${STAGE_COLORS[job.status] ?? 'tag-blue'}`}>{formatDashboardLabel(job.status)}</span>
                </td>
                <td className="dashboard-table-num">{count}</td>
                <td>
                  {stage ? (
                    <span className={`tag ${STAGE_COLORS[stage] ?? 'tag-blue'}`}>{formatDashboardLabel(stage)}</span>
                  ) : (
                    <span className="dashboard-table-muted">—</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

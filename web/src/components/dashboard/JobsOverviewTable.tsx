import { Link } from 'react-router-dom'
import type { Job } from '../../api/jobs'
import { dominantApplicantStage, formatStageLabel } from './dashboardMetrics'
import type { Application } from '../../api/applications'

type Props = {
  jobs: Job[]
  applications: Application[]
  accountId: string
  selectedJobId: string
  onSelectJob: (jobId: string) => void
}

export function JobsOverviewTable({ jobs, applications, accountId, selectedJobId, onSelectJob }: Props) {
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
            <th scope="col" className="dashboard-table-num">
              Applicants
            </th>
            <th scope="col">Top stage</th>
            <th scope="col" />
          </tr>
        </thead>
        <tbody>
          {sorted.map(job => {
            const count = applications.filter(a => a.job_id === job.id).length
            const stage = dominantApplicantStage(job.id, applications)
            const active = selectedJobId === String(job.id)
            return (
              <tr key={job.id} className={active ? 'dashboard-jobs-table-row-active' : undefined}>
                <td>
                  <button type="button" className="dashboard-table-job-title" onClick={() => onSelectJob(String(job.id))}>
                    {job.title}
                  </button>
                  <span className="dashboard-table-sub">{job.department ?? '—'}</span>
                </td>
                <td>
                  <span className={`dashboard-pill dashboard-pill-status dashboard-pill-${job.status}`}>
                    {formatStageLabel(job.status)}
                  </span>
                </td>
                <td className="dashboard-table-num">{count}</td>
                <td>
                  <span className="dashboard-table-stage">{stage}</span>
                </td>
                <td className="dashboard-table-actions">
                  <Link className="dashboard-link dashboard-link-inline" to={`/account/${accountId}/jobs/${job.id}/edit`}>
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

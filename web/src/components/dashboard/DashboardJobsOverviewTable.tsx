import { Link } from 'react-router-dom'
import type { Job } from '../../api/jobs'
import type { Application } from '../../api/applications'
import { dominantApplicationStatus, formatStageLabel } from './dashboardMetrics'

type Props = {
  jobs: Job[]
  applications: Application[]
  accountId: string
  loading?: boolean
}

export function DashboardJobsOverviewTable({ jobs, applications, accountId, loading }: Props) {
  const byJob = applications.reduce<Map<number, Application[]>>((acc, a) => {
    const list = acc.get(a.job_id) ?? []
    list.push(a)
    acc.set(a.job_id, list)
    return acc
  }, new Map())

  if (loading) {
    return (
      <div className="dashboard-jobs-table-wrap" aria-busy>
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
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                <td>
                  <span className="dashboard-table-skeleton dashboard-table-skeleton--long" />
                </td>
                <td>
                  <span className="dashboard-table-skeleton dashboard-table-skeleton--short" />
                </td>
                <td>
                  <span className="dashboard-table-skeleton dashboard-table-skeleton--short" />
                </td>
                <td>
                  <span className="dashboard-table-skeleton dashboard-table-skeleton--mid" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (jobs.length === 0) {
    return <div className="dashboard-empty dashboard-empty--compact">No jobs yet. Create a role to start hiring.</div>
  }

  const rows = [...jobs].sort((a, b) => a.title.localeCompare(b.title)).slice(0, 12)

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
          {rows.map(job => {
            const apps = byJob.get(job.id) ?? []
            const stage = dominantApplicationStatus(apps)
            return (
              <tr key={job.id}>
                <td>
                  <Link className="dashboard-jobs-table-link" to={`/account/${accountId}/jobs/${job.id}/edit`}>
                    {job.title}
                  </Link>
                </td>
                <td>
                  <span className="dashboard-jobs-status">{formatStageLabel(job.status)}</span>
                </td>
                <td>{apps.length}</td>
                <td>{stage ? formatStageLabel(stage) : '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

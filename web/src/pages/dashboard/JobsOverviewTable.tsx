import { Link } from 'react-router-dom'
import type { Job } from '../../api/jobs'
import { formatDashboardLabel, dominantStageForJob } from './dashboardUtils'
import type { Application } from '../../api/applications'

const STAGE_TAG_CLASS: Record<string, string> = {
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

type Props = {
  jobs: Job[]
  applications: Application[]
  accountId: string
  loading?: boolean
}

export function JobsOverviewTable({ jobs, applications, accountId, loading }: Props) {
  if (loading) {
    return (
      <div className="dashboard-table-wrap" aria-busy>
        <table className="dashboard-table">
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
                  <span className="dashboard-skeleton-line dashboard-skeleton-line--md" />
                </td>
                <td>
                  <span className="dashboard-skeleton-line dashboard-skeleton-line--sm" />
                </td>
                <td>
                  <span className="dashboard-skeleton-line dashboard-skeleton-line--xs" />
                </td>
                <td>
                  <span className="dashboard-skeleton-line dashboard-skeleton-line--sm" />
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

  const countsByJob = applications.reduce<Record<number, number>>((acc, a) => {
    acc[a.job_id] = (acc[a.job_id] ?? 0) + 1
    return acc
  }, {})

  const sorted = [...jobs].sort((a, b) => (countsByJob[b.id] ?? 0) - (countsByJob[a.id] ?? 0))

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
          {sorted.slice(0, 12).map(job => {
            const n = countsByJob[job.id] ?? 0
            const stageLabel = dominantStageForJob(job.id, applications)
            const statusKey = job.status
            return (
              <tr key={job.id}>
                <td>
                  <Link className="dashboard-table-job-link" to={`/account/${accountId}/jobs/${job.id}/edit`}>
                    {job.title}
                  </Link>
                  {job.department ? <span className="dashboard-table-sub">{job.department}</span> : null}
                </td>
                <td>
                  <span className={`tag ${STAGE_TAG_CLASS[statusKey] ?? 'tag-blue'}`}>{formatDashboardLabel(statusKey)}</span>
                </td>
                <td className="dashboard-table-num">{n}</td>
                <td>
                  <span className="dashboard-table-stage">{stageLabel}</span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

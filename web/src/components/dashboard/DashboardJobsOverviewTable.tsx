import { Link } from 'react-router-dom'
import type { Job } from '../../api/jobs'
import { dominantApplicantStageLabel } from './dashboardMetrics'
import type { Application } from '../../api/applications'

type Props = {
  jobs: Job[]
  applications: Application[]
  accountId: string
  loading?: boolean
}

const STATUS_CLASS: Record<string, string> = {
  open: 'tag-green',
  draft: 'tag-gray',
  paused: 'tag-orange',
  closed: 'tag-gray',
}

function TableSkeleton() {
  return (
    <div className="dashboard-table-wrap" aria-hidden>
      <table className="dashboard-table">
        <thead>
          <tr>
            <th>Job title</th>
            <th>Status</th>
            <th>Applicants</th>
            <th>Top stage</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 5 }, (_, i) => (
            <tr key={i}>
              <td>
                <span className="dashboard-kpi-skel dashboard-kpi-skel--line" />
              </td>
              <td>
                <span className="dashboard-kpi-skel dashboard-kpi-skel--meta" />
              </td>
              <td>
                <span className="dashboard-kpi-skel dashboard-kpi-skel--meta" />
              </td>
              <td>
                <span className="dashboard-kpi-skel dashboard-kpi-skel--meta" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function DashboardJobsOverviewTable({ jobs, applications, accountId, loading }: Props) {
  if (loading) {
    return <TableSkeleton />
  }
  if (jobs.length === 0) {
    return <div className="dashboard-empty">No jobs to show yet.</div>
  }

  const appsByJob = new Map<number, Application[]>()
  for (const a of applications) {
    const list = appsByJob.get(a.job_id) ?? []
    list.push(a)
    appsByJob.set(a.job_id, list)
  }

  const rows = [...jobs]
    .map(job => ({
      job,
      apps: appsByJob.get(job.id) ?? [],
    }))
    .sort((a, b) => b.apps.length - a.apps.length)
    .slice(0, 12)

  return (
    <div className="dashboard-table-wrap">
      <table className="dashboard-table">
        <thead>
          <tr>
            <th>Job title</th>
            <th>Status</th>
            <th>Applicants</th>
            <th>Top stage</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ job, apps }) => (
            <tr key={job.id}>
              <td>
                <Link className="dashboard-table-job-link" to={`/account/${accountId}/jobs/${job.id}/edit`}>
                  {job.title}
                </Link>
                {job.department ? (
                  <span className="dashboard-table-sub">{job.department}</span>
                ) : null}
              </td>
              <td>
                <span className={`tag ${STATUS_CLASS[job.status] ?? 'tag-blue'}`}>
                  {job.status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </span>
              </td>
              <td className="dashboard-table-num">{apps.length}</td>
              <td>{dominantApplicantStageLabel(apps)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

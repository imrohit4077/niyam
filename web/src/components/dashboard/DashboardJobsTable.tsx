import { Link } from 'react-router-dom'
import type { Application } from '../../api/applications'
import type { Job } from '../../api/jobs'

function formatDashboardLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())
}

const STAGE_COLORS: Record<string, string> = {
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

export function DashboardJobsTable({
  jobs,
  applications,
  accountId,
}: {
  jobs: Job[]
  applications: Application[]
  accountId: string
}) {
  if (jobs.length === 0) {
    return <div className="dashboard-empty">No jobs yet. Create a role to start hiring.</div>
  }

  const rows = [...jobs].sort((a, b) => a.title.localeCompare(b.title))

  return (
    <div className="dashboard-table-wrap">
      <table className="dashboard-table">
        <thead>
          <tr>
            <th scope="col">Job title</th>
            <th scope="col">Status</th>
            <th scope="col">Applicants</th>
            <th scope="col">Pipeline stage</th>
            <th scope="col" className="dashboard-table-col-action">
              {' '}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(job => {
            const jobApps = applications.filter(a => a.job_id === job.id)
            const counts = jobApps.reduce<Record<string, number>>((acc, a) => {
              acc[a.status] = (acc[a.status] ?? 0) + 1
              return acc
            }, {})
            const dominant =
              Object.entries(counts).sort((x, y) => y[1] - x[1])[0]?.[0] ??
              (job.status === 'open' ? 'applied' : '—')
            const stageLabel = dominant === '—' ? '—' : formatDashboardLabel(dominant)
            return (
              <tr key={job.id}>
                <td>
                  <strong className="dashboard-table-title">{job.title}</strong>
                  <div className="dashboard-table-meta">{job.department ?? 'General'} · {job.location ?? 'Location TBD'}</div>
                </td>
                <td>
                  <span className={`tag ${STAGE_COLORS[job.status] ?? 'tag-gray'}`}>{formatDashboardLabel(job.status)}</span>
                </td>
                <td>{jobApps.length}</td>
                <td>
                  {dominant === '—' ? (
                    '—'
                  ) : (
                    <span className={`tag ${STAGE_COLORS[dominant] ?? 'tag-blue'}`}>{stageLabel}</span>
                  )}
                </td>
                <td className="dashboard-table-col-action">
                  <Link className="dashboard-link dashboard-link--table" to={`/account/${accountId}/jobs/${job.id}/edit`}>
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

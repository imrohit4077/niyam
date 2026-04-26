import { Link } from 'react-router-dom'
import type { Job } from '../../api/jobs'
import type { Application } from '../../api/applications'
import { formatDashboardLabel } from './dashboardUtils'

function dominantApplicantStage(applications: Application[]): string {
  const counts: Record<string, number> = {}
  for (const app of applications) {
    counts[app.status] = (counts[app.status] ?? 0) + 1
  }
  let best = ''
  let bestN = 0
  for (const [status, n] of Object.entries(counts)) {
    if (n > bestN) {
      best = status
      bestN = n
    }
  }
  return best ? formatDashboardLabel(best) : '—'
}

export function DashboardJobsTable({
  jobs,
  applicationsByJobId,
  accountId,
}: {
  jobs: Job[]
  applicationsByJobId: Map<number, Application[]>
  accountId: string
}) {
  if (jobs.length === 0) {
    return <div className="dashboard-empty">No jobs yet. Create a role to start tracking applicants.</div>
  }

  const sorted = [...jobs].sort((a, b) => {
    const ca = applicationsByJobId.get(a.id)?.length ?? 0
    const cb = applicationsByJobId.get(b.id)?.length ?? 0
    return cb - ca
  })

  return (
    <div className="dashboard-table-wrap">
      <table className="dashboard-table">
        <thead>
          <tr>
            <th>Job title</th>
            <th>Status</th>
            <th>Applicants</th>
            <th>Leading stage</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {sorted.map(job => {
            const apps = applicationsByJobId.get(job.id) ?? []
            return (
              <tr key={job.id}>
                <td>
                  <strong>{job.title}</strong>
                  <div className="dashboard-table-sub">{job.department ?? 'General'} · {job.location ?? '—'}</div>
                </td>
                <td>
                  <span className={`dashboard-table-status dashboard-table-status--${job.status}`}>
                    {formatDashboardLabel(job.status)}
                  </span>
                </td>
                <td>{apps.length}</td>
                <td>{apps.length ? dominantApplicantStage(apps) : '—'}</td>
                <td className="dashboard-table-actions">
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

import { Link } from 'react-router-dom'
import { formatDashboardLabel } from './dashboardUtils'
import type { Application } from '../../api/applications'
import type { Job } from '../../api/jobs'

function dominantStage(apps: Application[]): string {
  if (apps.length === 0) return '—'
  const counts: Record<string, number> = {}
  for (const a of apps) {
    counts[a.status] = (counts[a.status] ?? 0) + 1
  }
  let best = ''
  let bestN = -1
  for (const [stage, n] of Object.entries(counts)) {
    if (n > bestN) {
      bestN = n
      best = stage
    }
  }
  return best ? formatDashboardLabel(best) : '—'
}

export function JobsOverviewTable({
  jobs,
  applicationsByJobId,
  accountId,
  selectedJobId,
  onSelectJob,
  loading,
}: {
  jobs: Job[]
  applicationsByJobId: Map<number, Application[]>
  accountId: string
  selectedJobId: string
  onSelectJob: (id: string) => void
  loading?: boolean
}) {
  if (loading) {
    return (
      <div className="dashboard-table-skeleton-wrap" aria-busy>
        <div className="dashboard-table-skeleton-row dashboard-table-skeleton-header" />
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} className="dashboard-table-skeleton-row" />
        ))}
      </div>
    )
  }

  if (jobs.length === 0) {
    return <div className="dashboard-empty dashboard-empty--compact">No jobs yet. Create a role to get started.</div>
  }

  const sorted = [...jobs].sort((a, b) => a.title.localeCompare(b.title))

  return (
    <div className="dashboard-jobs-table-wrap">
      <table className="dashboard-jobs-table">
        <thead>
          <tr>
            <th>Job</th>
            <th>Status</th>
            <th>Applicants</th>
            <th>Typical stage</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {sorted.map(job => {
            const apps = applicationsByJobId.get(job.id) ?? []
            const active = selectedJobId === String(job.id)
            return (
              <tr key={job.id} className={active ? 'dashboard-jobs-table-row--active' : undefined}>
                <td>
                  <button type="button" className="dashboard-jobs-table-select" onClick={() => onSelectJob(String(job.id))}>
                    {job.title}
                  </button>
                </td>
                <td>
                  <span className={`dashboard-jobs-status dashboard-jobs-status--${job.status}`}>
                    {formatDashboardLabel(job.status)}
                  </span>
                </td>
                <td>{apps.length}</td>
                <td className="dashboard-jobs-table-muted">{dominantStage(apps)}</td>
                <td className="dashboard-jobs-table-actions">
                  <Link className="dashboard-link dashboard-link--table" to={`/account/${accountId}/jobs/${job.id}/edit`}>
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

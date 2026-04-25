import { Link } from 'react-router-dom'
import type { Job } from '../../api/jobs'
import { formatDashboardLabel } from './dashboardUtils'

function dominantStage(counts: Record<string, number>): string {
  const order = ['hired', 'offer', 'interview', 'screening', 'applied', 'rejected', 'withdrawn']
  let best = ''
  let bestN = -1
  for (const k of order) {
    const n = counts[k] ?? 0
    if (n > bestN) {
      best = k
      bestN = n
    }
  }
  if (bestN <= 0) {
    const entries = Object.entries(counts).filter(([, v]) => v > 0)
    if (entries.length === 0) return '—'
    entries.sort((a, b) => b[1] - a[1])
    return formatDashboardLabel(entries[0][0])
  }
  return formatDashboardLabel(best)
}

export function DashboardJobsOverviewTable({
  jobs,
  applicantsByJobId,
  loading,
  accountId,
}: {
  jobs: Job[]
  applicantsByJobId: Map<number, { total: number; byStatus: Record<string, number> }>
  loading?: boolean
  accountId: string
}) {
  if (loading) {
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
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                <td>
                  <div className="dashboard-skeleton dashboard-skeleton-line dashboard-skeleton-line--md" />
                </td>
                <td>
                  <div className="dashboard-skeleton dashboard-skeleton-line dashboard-skeleton-line--sm" />
                </td>
                <td>
                  <div className="dashboard-skeleton dashboard-skeleton-line dashboard-skeleton-line--xs" />
                </td>
                <td>
                  <div className="dashboard-skeleton dashboard-skeleton-line dashboard-skeleton-line--sm" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (jobs.length === 0) {
    return <div className="dashboard-empty dashboard-empty--compact">No jobs yet. Create a role to get started.</div>
  }

  const rows = [...jobs].sort((a, b) => a.title.localeCompare(b.title)).slice(0, 12)

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
          {rows.map(job => {
            const agg = applicantsByJobId.get(job.id)
            const total = agg?.total ?? 0
            const stage = agg ? dominantStage(agg.byStatus) : '—'
            return (
              <tr key={job.id}>
                <td>
                  <Link className="dashboard-table-job-link" to={`/account/${accountId}/jobs/${job.id}/edit`}>
                    {job.title}
                  </Link>
                </td>
                <td>
                  <span className={`dashboard-table-status dashboard-table-status--${job.status}`}>
                    {formatDashboardLabel(job.status)}
                  </span>
                </td>
                <td>{total}</td>
                <td>{stage}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

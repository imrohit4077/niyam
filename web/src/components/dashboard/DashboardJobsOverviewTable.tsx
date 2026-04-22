import { Link } from 'react-router-dom'
import type { Job } from '../../api/jobs'
import { formatDashboardLabel } from './dashboardFormatters'

const JOB_STATUS_TAG: Record<string, string> = {
  open: 'tag-green',
  draft: 'tag-gray',
  closed: 'tag-gray',
  paused: 'tag-orange',
  pending: 'tag-orange',
}

function dominantStage(counts: Record<string, number>): string {
  const entries = Object.entries(counts).filter(([, n]) => n > 0)
  if (entries.length === 0) return '—'
  entries.sort((a, b) => b[1] - a[1])
  return formatDashboardLabel(entries[0][0])
}

export function DashboardJobsOverviewTable({
  jobs,
  applicantsByJobId,
  accountId,
}: {
  jobs: Job[]
  applicantsByJobId: Map<number, Record<string, number>>
  accountId: string
}) {
  if (jobs.length === 0) {
    return <div className="dashboard-empty">No jobs yet. Create a role to start tracking applicants.</div>
  }

  const sorted = [...jobs].sort((a, b) => {
    const ca = Object.values(applicantsByJobId.get(a.id) ?? {}).reduce((s, n) => s + n, 0)
    const cb = Object.values(applicantsByJobId.get(b.id) ?? {}).reduce((s, n) => s + n, 0)
    return cb - ca
  })

  return (
    <div className="dashboard-table-wrap">
      <table className="dashboard-table">
        <thead>
          <tr>
            <th>Job</th>
            <th>Status</th>
            <th className="dashboard-table-num">Applicants</th>
            <th>Top stage</th>
            <th className="dashboard-table-action" />
          </tr>
        </thead>
        <tbody>
          {sorted.map(job => {
            const byStatus = applicantsByJobId.get(job.id) ?? {}
            const total = Object.values(byStatus).reduce((s, n) => s + n, 0)
            return (
              <tr key={job.id}>
                <td>
                  <div className="dashboard-table-job">
                    <strong>{job.title}</strong>
                    <span>{job.department ?? 'General'}</span>
                  </div>
                </td>
                <td>
                  <span className={`tag ${JOB_STATUS_TAG[job.status] ?? 'tag-blue'}`}>{formatDashboardLabel(job.status)}</span>
                </td>
                <td className="dashboard-table-num">{total}</td>
                <td>{dominantStage(byStatus)}</td>
                <td className="dashboard-table-action">
                  <Link className="dashboard-link" to={`/account/${accountId}/jobs/${job.id}/edit`}>
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

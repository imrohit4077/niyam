import { Link } from 'react-router-dom'
import type { Job } from '../../api/jobs'
import type { Application } from '../../api/applications'
import { formatDashboardLabel } from './dashboardFormat'
import { STAGE_COLORS } from './dashboardConstants'

function dominantStage(counts: Record<string, number>): string {
  const entries = Object.entries(counts).filter(([, n]) => n > 0)
  if (entries.length === 0) return '—'
  entries.sort((a, b) => b[1] - a[1])
  return entries[0][0]
}

export function DashboardJobsOverviewTable({
  jobs,
  applicationsByJobId,
  accountId,
}: {
  jobs: Job[]
  applicationsByJobId: Map<number, Application[]>
  accountId: string
}) {
  const sorted = [...jobs].sort((a, b) => a.title.localeCompare(b.title))

  return (
    <div className="dashboard-table-wrap">
      <table className="dashboard-jobs-table">
        <thead>
          <tr>
            <th>Job title</th>
            <th>Status</th>
            <th>Applicants</th>
            <th>Stage</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {sorted.map(job => {
            const apps = applicationsByJobId.get(job.id) ?? []
            const byStatus = apps.reduce<Record<string, number>>((acc, a) => {
              acc[a.status] = (acc[a.status] ?? 0) + 1
              return acc
            }, {})
            const stage = dominantStage(byStatus)
            return (
              <tr key={job.id}>
                <td>
                  <strong className="dashboard-jobs-table-title">{job.title}</strong>
                  <span className="dashboard-jobs-table-muted">
                    {job.department ?? 'General'} · {job.location ?? '—'}
                  </span>
                </td>
                <td>
                  <span className={`tag ${STAGE_COLORS[job.status] ?? 'tag-blue'}`}>{formatDashboardLabel(job.status)}</span>
                </td>
                <td className="dashboard-jobs-table-num">{apps.length}</td>
                <td>
                  {stage === '—' ? (
                    <span className="dashboard-jobs-table-muted">—</span>
                  ) : (
                    <span className={`tag ${STAGE_COLORS[stage] ?? 'tag-gray'}`}>{formatDashboardLabel(stage)}</span>
                  )}
                </td>
                <td className="dashboard-jobs-table-actions">
                  <Link className="dashboard-link dashboard-link-compact" to={`/account/${accountId}/jobs/${job.id}/edit`}>
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

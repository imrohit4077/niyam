import { Link } from 'react-router-dom'
import type { Job } from '../../api/jobs'
import { formatDashboardLabel } from './dashboardHelpers'

export function DashboardJobsOverviewTable({
  jobs,
  applicantsByJobId,
  dominantStatusByJobId,
  accountId,
  selectedJobId,
  onSelectJob,
}: {
  jobs: Job[]
  applicantsByJobId: Record<number, number>
  dominantStatusByJobId: Record<number, string | null>
  accountId: string
  selectedJobId: string
  onSelectJob: (jobId: string) => void
}) {
  if (jobs.length === 0) {
    return <div className="dashboard-empty">No jobs yet. Create a role to get started.</div>
  }

  const sorted = [...jobs].sort((a, b) => (applicantsByJobId[b.id] ?? 0) - (applicantsByJobId[a.id] ?? 0))

  return (
    <div className="dashboard-table-wrap">
      <table className="dashboard-table">
        <thead>
          <tr>
            <th scope="col">Job title</th>
            <th scope="col">Status</th>
            <th scope="col" className="dashboard-table-numeric">
              Applicants
            </th>
            <th scope="col">Stage</th>
            <th scope="col" className="dashboard-table-actions">
              {/* link column */}
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(job => {
            const applicants = applicantsByJobId[job.id] ?? 0
            const stage = dominantStatusByJobId[job.id]
            const active = selectedJobId === String(job.id)
            return (
              <tr key={job.id} className={active ? 'dashboard-table-row-active' : undefined}>
                <td>
                  <button
                    type="button"
                    className="dashboard-table-job-title"
                    onClick={() => onSelectJob(String(job.id))}
                  >
                    {job.title}
                  </button>
                  {(job.department || job.location) && (
                    <span className="dashboard-table-sub">
                      {[job.department, job.location].filter(Boolean).join(' · ')}
                    </span>
                  )}
                </td>
                <td>
                  <span className={`dashboard-status-pill dashboard-status-pill--${job.status}`}>
                    {formatDashboardLabel(job.status)}
                  </span>
                </td>
                <td className="dashboard-table-numeric">{applicants}</td>
                <td>
                  {stage ? (
                    <span className="dashboard-table-stage">{formatDashboardLabel(stage)}</span>
                  ) : (
                    <span className="dashboard-table-muted">—</span>
                  )}
                </td>
                <td className="dashboard-table-actions">
                  <Link className="dashboard-link dashboard-link--compact" to={`/account/${accountId}/jobs/${job.id}/edit`}>
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

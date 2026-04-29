import { Link } from 'react-router-dom'
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

export function JobsOverviewTable({
  jobs,
  applicantsByJobId,
  stageByJobId,
  accountId,
  selectedJobId,
  onSelectJob,
  loading,
}: {
  jobs: Job[]
  applicantsByJobId: Map<number, number>
  stageByJobId: Map<number, { status: string; count: number } | null>
  accountId: string
  selectedJobId: string
  onSelectJob: (jobId: string) => void
  loading?: boolean
}) {
  if (loading) {
    return (
      <div className="dashboard-table-wrap" aria-busy>
        <table className="dashboard-table">
          <thead>
            <tr>
              <th>Job</th>
              <th>Status</th>
              <th>Applicants</th>
              <th>Top stage</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                <td>
                  <span className="dashboard-skeleton-line dashboard-skeleton-table-cell" />
                </td>
                <td>
                  <span className="dashboard-skeleton-line dashboard-skeleton-table-cell short" />
                </td>
                <td>
                  <span className="dashboard-skeleton-line dashboard-skeleton-table-cell short" />
                </td>
                <td>
                  <span className="dashboard-skeleton-line dashboard-skeleton-table-cell" />
                </td>
                <td>
                  <span className="dashboard-skeleton-line dashboard-skeleton-table-cell short" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (jobs.length === 0) {
    return <div className="dashboard-empty">No jobs yet. Create a job to see pipeline overview.</div>
  }

  const sorted = [...jobs].sort((a, b) => a.title.localeCompare(b.title))

  return (
    <div className="dashboard-table-wrap">
      <table className="dashboard-table">
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
            const applicants = applicantsByJobId.get(job.id) ?? 0
            const top = stageByJobId.get(job.id) ?? null
            const selected = selectedJobId === String(job.id)
            return (
              <tr key={job.id} className={selected ? 'dashboard-table-row-selected' : undefined}>
                <td>
                  <button type="button" className="dashboard-table-job-title" onClick={() => onSelectJob(String(job.id))}>
                    {job.title}
                  </button>
                  <div className="dashboard-table-sub">{job.department ?? '—'} · {job.location ?? 'Location TBD'}</div>
                </td>
                <td>
                  <span className={`tag ${STAGE_COLORS[job.status] ?? 'tag-blue'}`}>{formatDashboardLabel(job.status)}</span>
                </td>
                <td>{applicants}</td>
                <td>
                  {top && top.count > 0 ? (
                    <span className={`tag ${STAGE_COLORS[top.status] ?? 'tag-blue'}`}>
                      {formatDashboardLabel(top.status)} ({top.count})
                    </span>
                  ) : (
                    <span className="dashboard-table-muted">—</span>
                  )}
                </td>
                <td className="dashboard-table-actions">
                  <Link className="dashboard-link dashboard-link-table" to={`/account/${accountId}/jobs/${job.id}/edit`}>
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

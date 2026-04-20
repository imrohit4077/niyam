import { Link } from 'react-router-dom'
import type { Job } from '../../api/jobs'

export type JobOverviewRow = {
  job: Job
  applicantCount: number
  /** Most common application status for this job (pipeline stage proxy). */
  dominantStage: string | null
}

type Props = {
  rows: JobOverviewRow[]
  accountId: string
  loading: boolean
  error: string
  selectedJobId: string
  onSelectJob: (jobId: string) => void
}

function StageTag({ stage }: { stage: string | null }) {
  if (!stage) return <span className="dashboard-table-muted">—</span>
  const label = stage.replace(/_/g, ' ')
  return <span className="tag tag-blue dashboard-table-stage">{label}</span>
}

function StatusTag({ status }: { status: string }) {
  const map: Record<string, string> = {
    open: 'tag-green',
    closed: 'tag-gray',
    paused: 'tag-orange',
    draft: 'tag-gray',
  }
  const cls = map[status] ?? 'tag-blue'
  return <span className={`tag ${cls}`}>{status}</span>
}

export function DashboardJobsOverview({
  rows,
  accountId,
  loading,
  error,
  selectedJobId,
  onSelectJob,
}: Props) {
  if (loading) {
    return (
      <div className="dashboard-table-wrap dashboard-table-wrap--loading" aria-busy>
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
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                <td colSpan={5}>
                  <div className="dashboard-skeleton-line" style={{ width: `${68 + i * 5}%` }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (error) {
    return <div className="dashboard-empty dashboard-empty--error">{error}</div>
  }

  if (rows.length === 0) {
    return <div className="dashboard-empty">No jobs yet. Create a role to start hiring.</div>
  }

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
          {rows.map(({ job, applicantCount, dominantStage }) => {
            const active = selectedJobId === String(job.id)
            return (
              <tr key={job.id} className={active ? 'dashboard-table-row--active' : undefined}>
                <td>
                  <button
                    type="button"
                    className="dashboard-table-job-title"
                    onClick={() => onSelectJob(String(job.id))}
                  >
                    {job.title}
                  </button>
                  <div className="dashboard-table-sub">{job.department ?? 'General'} · {job.location ?? 'Location TBD'}</div>
                </td>
                <td>
                  <StatusTag status={job.status} />
                </td>
                <td>
                  <span className="dashboard-table-num">{applicantCount}</span>
                </td>
                <td>
                  <StageTag stage={dominantStage} />
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

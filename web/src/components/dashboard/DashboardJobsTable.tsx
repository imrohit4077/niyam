import { Link } from 'react-router-dom'
import type { Job } from '../../api/jobs'
import { formatDashboardLabel } from './dashboardFormatters'

export type JobRowStage = {
  label: string
  tone: 'neutral' | 'progress' | 'success' | 'warning'
}

type Props = {
  jobs: Job[]
  applicantCountByJobId: Record<number, number>
  dominantStageByJobId: Record<number, JobRowStage | null>
  accountId: string
  selectedJobId: string
  onSelectJob: (jobId: string) => void
  loading?: boolean
}

const TONE_CLASS: Record<JobRowStage['tone'], string> = {
  neutral: 'tag-gray',
  progress: 'tag-blue',
  success: 'tag-green',
  warning: 'tag-orange',
}

export function DashboardJobsTable({
  jobs,
  applicantCountByJobId,
  dominantStageByJobId,
  accountId,
  selectedJobId,
  onSelectJob,
  loading,
}: Props) {
  if (loading) {
    return (
      <div className="dashboard-table-wrap">
        <table className="dashboard-table">
          <thead>
            <tr>
              <th>Job</th>
              <th>Status</th>
              <th>Applicants</th>
              <th>Pipeline focus</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                <td colSpan={5}>
                  <div className="dashboard-skeleton-line dashboard-skeleton-line-table" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (jobs.length === 0) {
    return <div className="dashboard-empty">No jobs yet. Create a role to start tracking applicants.</div>
  }

  const sorted = [...jobs].sort((a, b) => (b.updated_at ?? '').localeCompare(a.updated_at ?? ''))

  return (
    <div className="dashboard-table-wrap">
      <table className="dashboard-table">
        <thead>
          <tr>
            <th>Job title</th>
            <th>Status</th>
            <th>Applicants</th>
            <th>Pipeline focus</th>
            <th className="dashboard-table-actions-col" />
          </tr>
        </thead>
        <tbody>
          {sorted.map(job => {
            const count = applicantCountByJobId[job.id] ?? 0
            const stage = dominantStageByJobId[job.id]
            const active = selectedJobId === String(job.id)
            return (
              <tr key={job.id} className={active ? 'dashboard-table-row-active' : undefined}>
                <td>
                  <button type="button" className="dashboard-table-job-title" onClick={() => onSelectJob(String(job.id))}>
                    {job.title}
                  </button>
                  <div className="dashboard-table-meta">
                    {job.department ?? 'General'}
                    {job.location ? ` · ${job.location}` : ''}
                  </div>
                </td>
                <td>
                  <span className={`tag ${job.status === 'open' ? 'tag-green' : job.status === 'paused' ? 'tag-orange' : 'tag-gray'}`}>
                    {formatDashboardLabel(job.status)}
                  </span>
                </td>
                <td>
                  <span className="dashboard-table-num">{count}</span>
                </td>
                <td>
                  {stage ? (
                    <span className={`tag ${TONE_CLASS[stage.tone]}`}>{stage.label}</span>
                  ) : (
                    <span className="dashboard-table-muted">—</span>
                  )}
                </td>
                <td className="dashboard-table-actions-col">
                  <Link className="dashboard-link dashboard-link-quiet" to={`/account/${accountId}/jobs/${job.id}/edit`}>
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

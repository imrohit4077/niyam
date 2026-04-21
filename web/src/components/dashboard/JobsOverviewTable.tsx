import { Link } from 'react-router-dom'
import type { Application } from '../../api/applications'
import type { Job } from '../../api/jobs'
import { formatDashboardLabel } from './dashboardFormat'

const STAGE_ORDER = ['applied', 'screening', 'interview', 'offer', 'hired', 'rejected', 'withdrawn']

const STAGE_TAG_CLASS: Record<string, string> = {
  applied: 'tag-blue',
  screening: 'tag-orange',
  interview: 'tag-blue',
  offer: 'tag-green',
  hired: 'tag-green',
  rejected: 'tag-red',
  withdrawn: 'tag-gray',
}

const JOB_STATUS_TAG: Record<string, string> = {
  draft: 'tag-gray',
  open: 'tag-green',
  paused: 'tag-orange',
  closed: 'tag-gray',
  pending: 'tag-orange',
}

function dominantStageForJob(applications: Application[], jobId: number): string | null {
  const counts: Record<string, number> = {}
  applications
    .filter(a => a.job_id === jobId)
    .forEach(a => {
      counts[a.status] = (counts[a.status] ?? 0) + 1
    })
  const keys = Object.keys(counts)
  if (keys.length === 0) return null
  let best = keys[0]
  let bestN = counts[best]
  for (const k of keys) {
    const n = counts[k]
    if (n > bestN) {
      best = k
      bestN = n
    } else if (n === bestN) {
      const ia = STAGE_ORDER.indexOf(k)
      const ib = STAGE_ORDER.indexOf(best)
      if (ia !== -1 && (ib === -1 || ia < ib)) best = k
    }
  }
  return best
}

export function JobsOverviewTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="dashboard-table-wrap" aria-busy="true">
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
          {Array.from({ length: rows }, (_, i) => (
            <tr key={i}>
              <td>
                <div className="dashboard-skeleton dashboard-skeleton-table-cell-lg" />
              </td>
              <td>
                <div className="dashboard-skeleton dashboard-skeleton-table-cell-sm" />
              </td>
              <td>
                <div className="dashboard-skeleton dashboard-skeleton-table-cell-xs" />
              </td>
              <td>
                <div className="dashboard-skeleton dashboard-skeleton-table-cell-sm" />
              </td>
              <td />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function JobsOverviewTable({
  jobs,
  applications,
  accountId,
  loading,
  error,
  selectedJobId,
  onSelectJob,
}: {
  jobs: Job[]
  applications: Application[]
  accountId: string
  loading: boolean
  error: string
  selectedJobId: string
  onSelectJob: (id: string) => void
}) {
  if (loading) return <JobsOverviewTableSkeleton />
  if (error) {
    return <div className="dashboard-empty dashboard-activity-error">{error}</div>
  }
  if (jobs.length === 0) {
    return <div className="dashboard-empty">No jobs yet. Create a role to start tracking applicants.</div>
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
            <th>Top stage</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {sorted.map(job => {
            const count = applications.filter(a => a.job_id === job.id).length
            const stage = dominantStageForJob(applications, job.id)
            const isSelected = selectedJobId === String(job.id)
            return (
              <tr key={job.id} className={isSelected ? 'dashboard-table-row-selected' : undefined}>
                <td>
                  <button type="button" className="dashboard-table-job-title" onClick={() => onSelectJob(String(job.id))}>
                    {job.title}
                  </button>
                  <div className="dashboard-table-sub">{job.department ?? 'General'}</div>
                </td>
                <td>
                  <span className={`tag ${JOB_STATUS_TAG[job.status] ?? 'tag-blue'}`}>{formatDashboardLabel(job.status)}</span>
                </td>
                <td className="dashboard-table-num">{count}</td>
                <td>
                  {stage ? (
                    <span className={`tag ${STAGE_TAG_CLASS[stage] ?? 'tag-blue'}`}>{formatDashboardLabel(stage)}</span>
                  ) : (
                    <span className="dashboard-table-muted">—</span>
                  )}
                </td>
                <td className="dashboard-table-actions">
                  <Link className="dashboard-link dashboard-link-quiet" to={`/account/${accountId}/jobs/${job.id}/edit`}>
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

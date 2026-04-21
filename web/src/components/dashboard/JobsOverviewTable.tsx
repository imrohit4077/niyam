import { Link } from 'react-router-dom'
import type { Job } from '../../api/jobs'
import type { Application } from '../../api/applications'
import { formatDashboardLabel } from './dashboardUtils'

const STAGE_TAG: Record<string, string> = {
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

function dominantStageForJob(jobId: number, applications: Application[]): string {
  const rows = applications.filter(a => a.job_id === jobId)
  if (rows.length === 0) return '—'
  const counts: Record<string, number> = {}
  for (const r of rows) {
    counts[r.status] = (counts[r.status] ?? 0) + 1
  }
  let best = ''
  let bestN = -1
  for (const [st, n] of Object.entries(counts)) {
    if (n > bestN) {
      bestN = n
      best = st
    }
  }
  return best || '—'
}

type JobsOverviewTableProps = {
  jobs: Job[]
  applications: Application[]
  accountId: string
  loading: boolean
  selectedJobId: string
  onSelectJob: (id: string) => void
}

export function JobsOverviewTableSkeleton() {
  return (
    <div className="dashboard-table-wrap dashboard-table-wrap--skeleton" aria-busy="true">
      <table className="dashboard-jobs-table">
        <thead>
          <tr>
            <th>Job</th>
            <th>Status</th>
            <th>Applicants</th>
            <th>Stage</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 6 }).map((_, i) => (
            <tr key={i}>
              <td>
                <span className="dashboard-table-skel dashboard-table-skel--lg" />
              </td>
              <td>
                <span className="dashboard-table-skel dashboard-table-skel--sm" />
              </td>
              <td>
                <span className="dashboard-table-skel dashboard-table-skel--xs" />
              </td>
              <td>
                <span className="dashboard-table-skel dashboard-table-skel--md" />
              </td>
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
  selectedJobId,
  onSelectJob,
}: JobsOverviewTableProps) {
  if (loading) {
    return <JobsOverviewTableSkeleton />
  }
  if (jobs.length === 0) {
    return <div className="dashboard-empty">No jobs yet. Create a role to see pipeline metrics here.</div>
  }
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
            const count = applications.filter(a => a.job_id === job.id).length
            const stage = dominantStageForJob(job.id, applications)
            const active = selectedJobId === String(job.id)
            return (
              <tr key={job.id} className={active ? 'dashboard-jobs-table-row--active' : undefined}>
                <td>
                  <button
                    type="button"
                    className="dashboard-job-table-title"
                    onClick={() => onSelectJob(String(job.id))}
                  >
                    {job.title}
                  </button>
                  <div className="dashboard-job-table-sub">
                    {job.department ?? 'General'} · {job.location ?? 'Location TBD'}
                  </div>
                </td>
                <td>
                  <span className={`tag ${STAGE_TAG[job.status] ?? 'tag-blue'}`}>{formatDashboardLabel(job.status)}</span>
                </td>
                <td className="dashboard-jobs-table-num">{count}</td>
                <td>
                  <span className={`tag ${STAGE_TAG[stage] ?? 'tag-blue'}`}>{formatDashboardLabel(stage)}</span>
                </td>
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

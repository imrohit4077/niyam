import { Link } from 'react-router-dom'
import type { Application } from '../../api/applications'
import type { Job } from '../../api/jobs'
import { formatDashboardStageLabel } from './formatDashboard'

type Props = {
  jobs: Job[]
  applications: Application[]
  accountId: string
  selectedJobId: string
  onSelectJob: (jobId: string) => void
}

const STAGE_TAG: Record<string, string> = {
  applied: 'tag-blue',
  screening: 'tag-orange',
  interview: 'tag-blue',
  offer: 'tag-green',
  hired: 'tag-green',
  rejected: 'tag-red',
  withdrawn: 'tag-gray',
}

const JOB_STATUS_TAG: Record<string, string> = {
  open: 'tag-green',
  draft: 'tag-gray',
  paused: 'tag-orange',
  closed: 'tag-gray',
  pending: 'tag-orange',
}

export function DashboardJobsOverviewTable({
  jobs,
  applications,
  accountId,
  selectedJobId,
  onSelectJob,
}: Props) {
  if (jobs.length === 0) {
    return <div className="dashboard-empty">Create a job to see the overview table.</div>
  }

  const byJob = applications.reduce<Record<number, Application[]>>((acc, a) => {
    if (!acc[a.job_id]) acc[a.job_id] = []
    acc[a.job_id].push(a)
    return acc
  }, {})

  const rows = [...jobs].sort((a, b) => (byJob[b.id]?.length ?? 0) - (byJob[a.id]?.length ?? 0))

  return (
    <div className="dashboard-table-wrap">
      <table className="dashboard-jobs-table">
        <thead>
          <tr>
            <th>Job title</th>
            <th>Status</th>
            <th>Applicants</th>
            <th>Pipeline stage</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map(job => {
            const apps = byJob[job.id] ?? []
            const counts = apps.reduce<Record<string, number>>((acc, app) => {
              acc[app.status] = (acc[app.status] ?? 0) + 1
              return acc
            }, {})
            const dominant =
              Object.entries(counts).sort(([, ca], [, cb]) => cb - ca)[0]?.[0] ?? '—'
            const isSelected = selectedJobId === String(job.id)
            return (
              <tr key={job.id} className={isSelected ? 'dashboard-jobs-table-row--active' : undefined}>
                <td>
                  <button type="button" className="dashboard-jobs-table-title-btn" onClick={() => onSelectJob(String(job.id))}>
                    {job.title}
                  </button>
                </td>
                <td>
                  <span className={`tag ${JOB_STATUS_TAG[job.status] ?? 'tag-gray'}`}>{formatDashboardStageLabel(job.status)}</span>
                </td>
                <td>
                  <span className="dashboard-jobs-table-num">{apps.length}</span>
                </td>
                <td>
                  {dominant === '—' ? (
                    <span className="dashboard-jobs-table-muted">—</span>
                  ) : (
                    <span className={`tag ${STAGE_TAG[dominant] ?? 'tag-blue'}`}>{formatDashboardStageLabel(dominant)}</span>
                  )}
                </td>
                <td className="dashboard-jobs-table-actions">
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

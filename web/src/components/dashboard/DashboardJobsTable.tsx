import { Link } from 'react-router-dom'
import type { Job } from '../../api/jobs'

export type JobTableRow = {
  job: Job
  applicants: number
  /** Dominant application status for this job, if any */
  topStage: string | null
}

const STAGE_TAG_CLASS: Record<string, string> = {
  applied: 'tag-blue',
  screening: 'tag-orange',
  interview: 'tag-blue',
  offer: 'tag-green',
  hired: 'tag-green',
  rejected: 'tag-red',
  withdrawn: 'tag-gray',
}

function formatStage(status: string | null) {
  if (!status) return '—'
  return status.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())
}

function statusTagClass(status: string) {
  return STAGE_TAG_CLASS[status] ?? 'tag-blue'
}

export function DashboardJobsTable({
  rows,
  accountId,
  loading,
}: {
  rows: JobTableRow[]
  accountId: string | number
  loading?: boolean
}) {
  if (loading) {
    return (
      <div className="dashboard-jobs-table-wrap" aria-busy="true">
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
            {Array.from({ length: 5 }, (_, i) => (
              <tr key={i} className="dashboard-jobs-table-skel-row">
                <td><div className="dashboard-table-skel-cell long" /></td>
                <td><div className="dashboard-table-skel-cell short" /></td>
                <td><div className="dashboard-table-skel-cell short" /></td>
                <td><div className="dashboard-table-skel-cell medium" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (rows.length === 0) {
    return <div className="dashboard-empty">No jobs to show.</div>
  }

  return (
    <div className="dashboard-jobs-table-wrap">
      <table className="dashboard-jobs-table">
        <thead>
          <tr>
            <th>Job title</th>
            <th>Status</th>
            <th>Applicants</th>
            <th>Stage</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ job, applicants, topStage }) => (
            <tr key={job.id}>
              <td>
                <Link className="dashboard-jobs-table-title" to={`/account/${accountId}/jobs/${job.id}/edit`}>
                  {job.title}
                </Link>
                <span className="dashboard-jobs-table-sub">{job.department ?? '—'} · {job.location ?? 'Remote / TBD'}</span>
              </td>
              <td>
                <span className={`tag ${job.status === 'open' ? 'tag-green' : job.status === 'paused' ? 'tag-orange' : 'tag-gray'}`}>
                  {formatStage(job.status)}
                </span>
              </td>
              <td className="dashboard-jobs-table-num">{applicants}</td>
              <td>
                {topStage ? (
                  <span className={`tag ${statusTagClass(topStage)}`}>{formatStage(topStage)}</span>
                ) : (
                  <span className="dashboard-jobs-table-dash">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

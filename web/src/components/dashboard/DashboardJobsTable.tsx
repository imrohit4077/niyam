import { Link } from 'react-router-dom'
import type { Application } from '../../api/applications'
import type { Job } from '../../api/jobs'

type Props = {
  jobs: Job[]
  applications: Application[]
  accountId: string
  loading?: boolean
}

function dominantStage(counts: Record<string, number>): string {
  const entries = Object.entries(counts).filter(([, n]) => n > 0)
  if (entries.length === 0) return '—'
  entries.sort((a, b) => b[1] - a[1])
  return entries[0][0].replace(/_/g, ' ')
}

function formatJobStatus(status: string) {
  return status.replace(/_/g, ' ')
}

export default function DashboardJobsTable({ jobs, applications, accountId, loading }: Props) {
  if (loading) {
    return (
      <div className="dashboard-jobs-table-wrap">
        <table className="dashboard-jobs-table">
          <thead>
            <tr>
              <th>Job title</th>
              <th>Status</th>
              <th>Applicants</th>
              <th>Top stage</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                <td>
                  <span className="dashboard-table-skel" style={{ width: '70%' }} />
                </td>
                <td>
                  <span className="dashboard-table-skel" style={{ width: '48px' }} />
                </td>
                <td>
                  <span className="dashboard-table-skel" style={{ width: '32px' }} />
                </td>
                <td>
                  <span className="dashboard-table-skel" style={{ width: '56%' }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (jobs.length === 0) {
    return <div className="dashboard-empty">No jobs yet. Create a job to see it in this overview.</div>
  }

  const rows = jobs.map(job => {
    const apps = applications.filter(a => a.job_id === job.id)
    const byStatus = apps.reduce<Record<string, number>>((acc, a) => {
      acc[a.status] = (acc[a.status] ?? 0) + 1
      return acc
    }, {})
    return {
      job,
      applicantCount: apps.length,
      topStage: dominantStage(byStatus),
    }
  }).sort((a, b) => b.applicantCount - a.applicantCount)

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
          {rows.map(({ job, applicantCount, topStage }) => (
            <tr key={job.id}>
              <td>
                <Link className="dashboard-jobs-table-title" to={`/account/${accountId}/jobs/${job.id}/edit`}>
                  {job.title}
                </Link>
                {job.department ? <span className="dashboard-jobs-table-meta">{job.department}</span> : null}
              </td>
              <td>
                <span className={`tag ${job.status === 'open' ? 'tag-green' : job.status === 'paused' ? 'tag-orange' : 'tag-gray'}`}>
                  {formatJobStatus(job.status)}
                </span>
              </td>
              <td className="dashboard-jobs-table-num">{applicantCount}</td>
              <td className="dashboard-jobs-table-stage">{topStage}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

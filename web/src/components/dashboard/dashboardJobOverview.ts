import type { Job } from '../../api/jobs'
import type { Application } from '../../api/applications'

export type JobOverviewRow = {
  job: Job
  applicants: number
  /** Dominant pipeline stage label for display */
  stageLabel: string
}

function formatStageLabel(status: string) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

/** Aggregate applications per job and pick a simple "dominant" stage for the overview column. */
export function buildJobOverviewRows(jobs: Job[], applications: Application[]): JobOverviewRow[] {
  const statusOrder = ['hired', 'offer', 'interview', 'screening', 'applied', 'rejected', 'withdrawn']

  return jobs.map(job => {
    const apps = applications.filter(a => a.job_id === job.id)
    const byStatus = apps.reduce<Record<string, number>>((acc, a) => {
      acc[a.status] = (acc[a.status] ?? 0) + 1
      return acc
    }, {})
    let stageLabel = '—'
    for (const st of statusOrder) {
      if ((byStatus[st] ?? 0) > 0) {
        stageLabel = formatStageLabel(st)
        break
      }
    }
    return { job, applicants: apps.length, stageLabel }
  })
}

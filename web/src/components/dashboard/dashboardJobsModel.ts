import type { Job } from '../../api/jobs'
import { formatDashboardLabel } from './dashboardFormat'

export type JobTableRow = {
  job: Job
  applicants: number
  /** Dominant applicant stage label for this job */
  stageLabel: string
  stageKey: string
}

function dominantStage(counts: Record<string, number>): { key: string; label: string } {
  const entries = Object.entries(counts).filter(([, n]) => n > 0)
  if (entries.length === 0) return { key: 'applied', label: 'Applied' }
  const [key] = entries.sort((a, b) => b[1] - a[1])[0]
  return { key, label: formatDashboardLabel(key) }
}

export function buildJobTableRows(jobs: Job[], applicationsByJobId: Map<number, Record<string, number>>): JobTableRow[] {
  return jobs.map(job => {
    const byStatus = applicationsByJobId.get(job.id) ?? {}
    const applicants = Object.values(byStatus).reduce((s, n) => s + n, 0)
    const { key, label } = dominantStage(byStatus)
    return { job, applicants, stageLabel: label, stageKey: key }
  })
}

import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PieController,
  PointElement,
  Tooltip,
  type ChartOptions,
} from 'chart.js'
import { Doughnut } from 'react-chartjs-2'
import type { DashboardOutletContext } from '../layouts/DashboardOutletContext'
import { jobsApi, type Job } from '../api/jobs'
import { applicationsApi, type Application } from '../api/applications'
import { interviewsApi, type InterviewAssignmentRow } from '../api/interviews'
import { DashboardSummaryCard, type DashboardTrend } from '../components/dashboard/DashboardSummaryCard'
import {
  DashboardApplicationsLineChart,
  DashboardJobsDistributionChart,
  DashboardPipelineFunnelChart,
  DashboardSourcePieChart,
} from '../components/dashboard/DashboardWorkspaceCharts'
import { countFunnelByStatus } from '../components/dashboard/pipelineFunnel'
import { IconBriefcase, IconCalendar, IconGift, IconUsers } from '../components/dashboard/DashboardIcons'

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
  pending: 'tag-orange',
  scheduled: 'tag-blue',
  completed: 'tag-green',
  cancelled: 'tag-gray',
}

const DASHBOARD_CHART_COLORS = ['#00b4d8', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6b7280', '#8b5cf6']

type DashboardSlice = {
  key: string
  label: string
  value: number
  color: string
}

type PipelineModalKind = 'applicants' | 'interviews' | 'offers' | 'hired'

ChartJS.register(
  ArcElement,
  PieController,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Filler,
)

function LoadingRow() {
  return (
    <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
      <div className="spinner" style={{ margin: '0 auto 8px', width: 24, height: 24 }} />
      Loading...
    </div>
  )
}

function ErrorRow({ msg }: { msg: string }) {
  return (
    <div
      style={{
        padding: '16px 20px',
        color: 'var(--error)',
        fontSize: 13,
        background: 'var(--error-bg)',
        borderBottom: '1px solid var(--error-border)',
      }}
    >
      {msg}
    </div>
  )
}

function formatDashboardLabel(value: string) {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, ch => ch.toUpperCase())
}

function formatDateTimeShort(value: string | null) {
  if (!value) return 'Not scheduled'
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function makeDashboardSlices(entries: Array<[string, number]>) {
  return entries
    .filter(([, value]) => value > 0)
    .map(([label, value], index) => ({
      key: label,
      label: formatDashboardLabel(label),
      value,
      color: DASHBOARD_CHART_COLORS[index % DASHBOARD_CHART_COLORS.length],
    }))
}

function trendFromPeriodCounts(current: number, previous: number): DashboardTrend {
  if (previous === 0 && current === 0) {
    return { direction: 'flat', label: '—', hint: 'No change vs prior month' }
  }
  if (previous === 0 && current > 0) {
    return { direction: 'new', label: 'New', hint: 'First activity in the prior window' }
  }
  const pct = Math.round(((current - previous) / previous) * 100)
  if (pct === 0) {
    return { direction: 'flat', label: '0%', hint: 'Even with prior month' }
  }
  if (pct > 0) {
    return { direction: 'up', label: `${pct}%`, hint: `Up ${pct}% vs prior month` }
  }
  return { direction: 'down', label: `${Math.abs(pct)}%`, hint: `Down ${Math.abs(pct)}% vs prior month` }
}

function countInterviewsScheduledInCalendarMonth(rows: InterviewAssignmentRow[], year: number, monthIndex: number) {
  return rows.filter(row => {
    if (!row.scheduled_at) return false
    const d = new Date(row.scheduled_at)
    return d.getFullYear() === year && d.getMonth() === monthIndex
  }).length
}

function countApplicationsStatusUpdatedInMonth(
  applications: Application[],
  status: string,
  year: number,
  monthIndex: number,
) {
  return applications.filter(app => {
    if (app.status !== status) return false
    const d = new Date(app.updated_at)
    return d.getFullYear() === year && d.getMonth() === monthIndex
  }).length
}

function jobsCreatedInMonth(jobs: Job[], year: number, monthIndex: number) {
  return jobs.filter(job => {
    const d = new Date(job.created_at)
    return d.getFullYear() === year && d.getMonth() === monthIndex
  }).length
}

function dominantApplicantStage(statusCounts: Record<string, number>): string {
  const weighted: Array<[string, number]> = [
    ['interview', statusCounts.interview ?? 0],
    ['offer', statusCounts.offer ?? 0],
    ['screening', statusCounts.screening ?? 0],
    ['applied', statusCounts.applied ?? 0],
    ['hired', statusCounts.hired ?? 0],
  ]
  let best = ''
  let bestN = -1
  for (const [key, n] of weighted) {
    if (n > bestN) {
      best = key
      bestN = n
    }
  }
  if (bestN > 0 && best) return formatDashboardLabel(best)
  const entries = Object.entries(statusCounts).filter(([, n]) => n > 0)
  if (entries.length === 0) return '—'
  entries.sort((a, b) => b[1] - a[1])
  return formatDashboardLabel(entries[0][0])
}

function DashboardDoughnutChart({
  slices,
  emptyLabel,
  legendLabel,
}: {
  slices: DashboardSlice[]
  emptyLabel: string
  legendLabel: string
}) {
  if (slices.length === 0) return <div className="dashboard-empty">{emptyLabel}</div>

  const chartData = {
    labels: slices.map(slice => slice.label),
    datasets: [
      {
        label: legendLabel,
        data: slices.map(slice => slice.value),
        backgroundColor: slices.map(slice => slice.color),
        borderColor: '#ffffff',
        borderWidth: 2,
      },
    ],
  }

  const options: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '68%',
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 12, usePointStyle: true, pointStyle: 'circle' } },
    },
  }

  return (
    <div className="dashboard-chart-shell">
      <Doughnut data={chartData} options={options} />
    </div>
  )
}

function DashboardPanel({ title, wide, children }: { title: string; wide?: boolean; children: ReactNode }) {
  return (
    <section className={`panel dashboard-panel dashboard-modern-panel${wide ? ' dashboard-panel--full' : ''}`}>
      <div className="panel-header dashboard-modern-panel-header">
        <span className="panel-header-title">{title}</span>
      </div>
      <div className="panel-body dashboard-modern-panel-body">{children}</div>
    </section>
  )
}

export default function HomeDashboardPage() {
  const { user, token, accountId } = useOutletContext<DashboardOutletContext>()
  const [jobs, setJobs] = useState<Job[]>([])
  const [jobsLoading, setJobsLoading] = useState(true)
  const [jobsError, setJobsError] = useState('')
  const [selectedJobId, setSelectedJobId] = useState('')
  const [interviews, setInterviews] = useState<InterviewAssignmentRow[]>([])
  const [interviewsLoading, setInterviewsLoading] = useState(true)
  const [interviewsError, setInterviewsError] = useState('')
  const [allApplications, setAllApplications] = useState<Application[]>([])
  const [applicationsLoading, setApplicationsLoading] = useState(true)
  const [jobApplications, setJobApplications] = useState<Application[]>([])
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [analyticsError, setAnalyticsError] = useState('')
  const [activePipelineModal, setActivePipelineModal] = useState<PipelineModalKind | null>(null)

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) {
        setJobsLoading(true)
        setJobsError('')
      }
    })

    jobsApi
      .list(token)
      .then(rows => {
        if (cancelled) return
        setJobs(rows)
        setSelectedJobId(current => {
          if (current && rows.some(job => String(job.id) === current)) return current
          const preferred = rows.find(job => job.status === 'open') ?? rows[0]
          return preferred ? String(preferred.id) : ''
        })
      })
      .catch(e => {
        if (!cancelled) setJobsError(e instanceof Error ? e.message : 'Failed to load jobs')
      })
      .finally(() => {
        if (!cancelled) setJobsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [token])

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) {
        setInterviewsLoading(true)
        setInterviewsError('')
      }
    })

    interviewsApi
      .myAssignments(token, {
        include_open: true,
        page: 1,
        per_page: 12,
      })
      .then(res => {
        if (!cancelled) setInterviews(res.entries)
      })
      .catch(e => {
        if (!cancelled) setInterviewsError(e instanceof Error ? e.message : 'Failed to load interviews')
      })
      .finally(() => {
        if (!cancelled) setInterviewsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [token])

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) setApplicationsLoading(true)
    })

    applicationsApi
      .list(token)
      .then(rows => {
        if (!cancelled) setAllApplications(rows)
      })
      .catch(() => {
        if (!cancelled) setAllApplications([])
      })
      .finally(() => {
        if (!cancelled) setApplicationsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [token])

  useEffect(() => {
    if (!selectedJobId) {
      queueMicrotask(() => {
        setJobApplications([])
        setAnalyticsError('')
      })
      return
    }

    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) {
        setAnalyticsLoading(true)
        setAnalyticsError('')
      }
    })

    applicationsApi
      .list(token, { jobId: Number(selectedJobId) })
      .then(rows => {
        if (!cancelled) setJobApplications(rows)
      })
      .catch(e => {
        if (!cancelled) {
          setJobApplications([])
          setAnalyticsError(e instanceof Error ? e.message : 'Failed to load job applications')
        }
      })
      .finally(() => {
        if (!cancelled) setAnalyticsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [token, selectedJobId])

  const selectedJob = jobs.find(job => String(job.id) === selectedJobId) ?? null
  const jobsByStatus = makeDashboardSlices(
    Object.entries(
      jobs.reduce<Record<string, number>>((acc, job) => {
        acc[job.status] = (acc[job.status] ?? 0) + 1
        return acc
      }, {}),
    ),
  )
  const jobApplicationsByStatus = jobApplications.reduce<Record<string, number>>((acc, application) => {
    acc[application.status] = (acc[application.status] ?? 0) + 1
    return acc
  }, {})
  const analyticsSlices = makeDashboardSlices(Object.entries(jobApplicationsByStatus))
  const totalApplicants = jobApplications.length
  const hiredCount = jobApplicationsByStatus.hired ?? 0
  const offerStageCount = jobApplicationsByStatus.offer ?? 0
  const rejectedCount = (jobApplicationsByStatus.rejected ?? 0) + (jobApplicationsByStatus.withdrawn ?? 0)
  const conversionRate = totalApplicants > 0 ? Math.round((hiredCount / totalApplicants) * 100) : 0
  const jobStatusGroups = jobsByStatus.map(slice => ({
    ...slice,
    jobs: jobs.filter(job => job.status === slice.key),
  }))
  const filteredUpcomingInterviews = interviews
    .filter(row => {
      if (!selectedJobId) return true
      const jobId = row.job?.id ?? row.application?.job_id
      return String(jobId ?? '') === selectedJobId
    })
    .sort((a, b) => {
      const aTime = a.scheduled_at ? new Date(a.scheduled_at).getTime() : Number.MAX_SAFE_INTEGER
      const bTime = b.scheduled_at ? new Date(b.scheduled_at).getTime() : Number.MAX_SAFE_INTEGER
      return aTime - bTime
    })
  const interviewPanelRows = filteredUpcomingInterviews.filter(
    row => row.status === 'scheduled' || row.status === 'pending' || !!row.scheduled_at,
  )
  const workspaceUpcomingInterviews = interviews.filter(
    row => row.status === 'scheduled' || row.status === 'pending' || !!row.scheduled_at,
  ).length
  const offerRows = jobApplications.filter(application => application.status === 'offer')
  const hiredRows = jobApplications.filter(application => application.status === 'hired')
  const openJobs = jobs.filter(job => job.status === 'open').length
  const scheduledInterviews = interviewPanelRows.length
  const totalHiredCandidates = allApplications.filter(application => application.status === 'hired').length
  const totalApplicantsAcrossJobs = allApplications.length
  const totalOpenings = jobs.reduce((sum, job) => sum + (job.open_positions ?? 0), 0)
  const openingFillRate = totalOpenings > 0 ? Math.round((totalHiredCandidates / totalOpenings) * 100) : 0
  const avgApplicantsPerJob = jobs.length > 0 ? (totalApplicantsAcrossJobs / jobs.length).toFixed(1) : '0.0'
  const sourceSlices = makeDashboardSlices(
    Object.entries(
      jobApplications.reduce<Record<string, number>>((acc, application) => {
        const source = application.source_type || 'unknown'
        acc[source] = (acc[source] ?? 0) + 1
        return acc
      }, {}),
    ),
  )

  const uniqueCandidateCount = useMemo(() => {
    const emails = new Set<string>()
    for (const a of allApplications) {
      if (a.candidate_email?.trim()) emails.add(a.candidate_email.trim().toLowerCase())
    }
    return emails.size
  }, [allApplications])

  const workspaceStatusCounts = useMemo(() => {
    return allApplications.reduce<Record<string, number>>((acc, application) => {
      acc[application.status] = (acc[application.status] ?? 0) + 1
      return acc
    }, {})
  }, [allApplications])

  const workspaceFunnelValues = useMemo(() => countFunnelByStatus(workspaceStatusCounts), [workspaceStatusCounts])

  const workspaceSourceSlices = useMemo(
    () =>
      makeDashboardSlices(
        Object.entries(
          allApplications.reduce<Record<string, number>>((acc, application) => {
            const source = application.source_type || 'unknown'
            acc[source] = (acc[source] ?? 0) + 1
            return acc
          }, {}),
        ),
      ),
    [allApplications],
  )

  const jobDistributionRows = useMemo(() => {
    const byJob = allApplications.reduce<Record<number, number>>((acc, application) => {
      acc[application.job_id] = (acc[application.job_id] ?? 0) + 1
      return acc
    }, {})
    return Object.entries(byJob)
      .map(([jobId, count]) => {
        const job = jobs.find(j => j.id === Number(jobId))
        return {
          title: job?.title ?? `Job #${jobId}`,
          count,
          color: DASHBOARD_CHART_COLORS[Number(jobId) % DASHBOARD_CHART_COLORS.length],
        }
      })
      .sort((a, b) => b.count - a.count)
  }, [allApplications, jobs])

  const activityFeed = useMemo(() => {
    type FeedItem = { id: string; at: number; text: string; href?: string }
    const items: FeedItem[] = []

    for (const app of allApplications) {
      const t = new Date(app.created_at).getTime()
      items.push({
        id: `app-created-${app.id}`,
        at: t,
        text: `Application: ${app.candidate_name || app.candidate_email} applied`,
        href: `/account/${accountId}/job-applications/${app.id}`,
      })
    }
    for (const app of allApplications) {
      const last = app.stage_history?.length ? app.stage_history[app.stage_history.length - 1] : null
      if (last?.changed_at) {
        const t = new Date(last.changed_at).getTime()
        items.push({
          id: `stage-${app.id}-${last.changed_at}`,
          at: t,
          text: `Pipeline: ${app.candidate_name || app.candidate_email} → ${formatDashboardLabel(last.stage)}`,
          href: `/account/${accountId}/job-applications/${app.id}`,
        })
      }
    }
    for (const job of jobs) {
      const t = new Date(job.created_at).getTime()
      items.push({
        id: `job-${job.id}`,
        at: t,
        text: `Job published: ${job.title}`,
        href: `/account/${accountId}/jobs/${job.id}/edit`,
      })
    }
    for (const row of interviews) {
      if (!row.scheduled_at) continue
      const t = new Date(row.scheduled_at).getTime()
      const who = row.application?.candidate_name || row.application?.candidate_email || 'Candidate'
      const role = row.job?.title ?? 'a role'
      items.push({
        id: `int-${row.id}-${row.scheduled_at}`,
        at: t,
        text: `Interview scheduled: ${who} · ${role}`,
        href: `/account/${accountId}/interviews`,
      })
    }

    const seen = new Set<string>()
    return items
      .filter(i => {
        if (seen.has(i.id)) return false
        seen.add(i.id)
        return true
      })
      .sort((a, b) => b.at - a.at)
      .slice(0, 12)
  }, [allApplications, jobs, interviews, accountId])

  const monthlyTrend = useMemo(() => {
    const now = new Date()
    const keys = Array.from({ length: 6 }, (_, idx) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - idx), 1)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const label = date.toLocaleDateString('en-US', { month: 'short' })
      return { key, label }
    })
    const counters = keys.reduce<Record<string, number>>((acc, item) => {
      acc[item.key] = 0
      return acc
    }, {})
    allApplications.forEach(application => {
      const date = new Date(application.created_at)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      if (key in counters) counters[key] += 1
    })
    return keys.map(item => ({ label: item.label, value: counters[item.key] ?? 0 }))
  }, [allApplications])

  const now = useMemo(() => new Date(), [])
  const cy = now.getFullYear()
  const cm = now.getMonth()
  const pmDate = new Date(cy, cm - 1, 1)
  const py = pmDate.getFullYear()
  const pm = pmDate.getMonth()

  const applicationsCreatedThisMonth = useMemo(() => {
    return allApplications.filter(a => {
      const d = new Date(a.created_at)
      return d.getFullYear() === cy && d.getMonth() === cm
    }).length
  }, [allApplications, cy, cm])

  const applicationsCreatedPrevMonth = useMemo(() => {
    return allApplications.filter(a => {
      const d = new Date(a.created_at)
      return d.getFullYear() === py && d.getMonth() === pm
    }).length
  }, [allApplications, py, pm])

  const interviewsScheduledThisMonth = useMemo(
    () => countInterviewsScheduledInCalendarMonth(interviews, cy, cm),
    [interviews, cy, cm],
  )
  const interviewsScheduledPrevMonth = useMemo(
    () => countInterviewsScheduledInCalendarMonth(interviews, py, pm),
    [interviews, py, pm],
  )

  const offersReleasedThisMonth = useMemo(
    () => countApplicationsStatusUpdatedInMonth(allApplications, 'offer', cy, cm),
    [allApplications, cy, cm],
  )
  const offersReleasedPrevMonth = useMemo(
    () => countApplicationsStatusUpdatedInMonth(allApplications, 'offer', py, pm),
    [allApplications, py, pm],
  )

  const jobsCreatedThisMonth = useMemo(() => jobsCreatedInMonth(jobs, cy, cm), [jobs, cy, cm])
  const jobsCreatedPrevMonth = useMemo(() => jobsCreatedInMonth(jobs, py, pm), [jobs, py, pm])

  const candidateTrend = useMemo(
    () => trendFromPeriodCounts(applicationsCreatedThisMonth, applicationsCreatedPrevMonth),
    [applicationsCreatedThisMonth, applicationsCreatedPrevMonth],
  )
  const jobsTrend = useMemo(
    () => trendFromPeriodCounts(jobsCreatedThisMonth, jobsCreatedPrevMonth),
    [jobsCreatedThisMonth, jobsCreatedPrevMonth],
  )
  const interviewTrend = useMemo(
    () => trendFromPeriodCounts(interviewsScheduledThisMonth, interviewsScheduledPrevMonth),
    [interviewsScheduledThisMonth, interviewsScheduledPrevMonth],
  )
  const offerTrend = useMemo(
    () => trendFromPeriodCounts(offersReleasedThisMonth, offersReleasedPrevMonth),
    [offersReleasedThisMonth, offersReleasedPrevMonth],
  )

  const applicantsByJobId = useMemo(() => {
    return allApplications.reduce<Record<number, number>>((acc, a) => {
      acc[a.job_id] = (acc[a.job_id] ?? 0) + 1
      return acc
    }, {})
  }, [allApplications])

  const dominantStageByJobId = useMemo(() => {
    const statusByJob = allApplications.reduce<Record<number, Record<string, number>>>((acc, a) => {
      if (!acc[a.job_id]) acc[a.job_id] = {}
      acc[a.job_id][a.status] = (acc[a.job_id][a.status] ?? 0) + 1
      return acc
    }, {})
    const out: Record<number, string> = {}
    for (const jobId of Object.keys(statusByJob)) {
      out[Number(jobId)] = dominantApplicantStage(statusByJob[Number(jobId)]!)
    }
    return out
  }, [allApplications])

  const selectedJobFunnelValues = useMemo(
    () => countFunnelByStatus(jobApplicationsByStatus),
    [jobApplicationsByStatus],
  )

  const maxSourceValue = Math.max(...sourceSlices.map(slice => slice.value), 0)
  const sourceTopLabel = sourceSlices.find(slice => slice.value === maxSourceValue)?.label ?? 'No data'

  const modalTitle =
    activePipelineModal === 'applicants'
      ? 'Applicants'
      : activePipelineModal === 'interviews'
        ? 'Interviews'
        : activePipelineModal === 'offers'
          ? 'Offers'
          : activePipelineModal === 'hired'
            ? 'Hired candidates'
            : ''

  return (
    <>
      {activePipelineModal && (
        <div className="modal-overlay" onClick={() => setActivePipelineModal(null)}>
          <div className="modal dashboard-interviews-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{modalTitle}</span>
              <button className="modal-close" onClick={() => setActivePipelineModal(null)} aria-label="Close">
                ×
              </button>
            </div>
            <div className="modal-body dashboard-interviews-modal-body">
              <p className="dashboard-modal-lead">{selectedJob ? `${modalTitle} for ${selectedJob.title}` : modalTitle}</p>
              {activePipelineModal === 'interviews' ? (
                interviewsLoading ? (
                  <LoadingRow />
                ) : interviewsError ? (
                  <ErrorRow msg={interviewsError} />
                ) : interviewPanelRows.length === 0 ? (
                  <div className="dashboard-empty">No interview records for this job.</div>
                ) : (
                  <div className="dashboard-schedule">
                    {interviewPanelRows.map(row => (
                      <div key={row.id} className="dashboard-schedule-item">
                        <div>
                          <strong>{row.application?.candidate_name || row.application?.candidate_email || 'Candidate'}</strong>
                          <span>{row.job?.title ?? `Job #${row.application?.job_id ?? '—'}`}</span>
                        </div>
                        <div className="dashboard-schedule-meta">
                          <span className={`tag ${STAGE_COLORS[row.status] ?? 'tag-blue'}`}>{formatDashboardLabel(row.status)}</span>
                          <span>{formatDateTimeShort(row.scheduled_at)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : activePipelineModal === 'applicants' ? (
                jobApplications.length === 0 ? (
                  <div className="dashboard-empty">No applicants for this job.</div>
                ) : (
                  <div className="dashboard-schedule">
                    {jobApplications.map(application => (
                      <div key={application.id} className="dashboard-schedule-item">
                        <div>
                          <strong>{application.candidate_name || application.candidate_email}</strong>
                          <span>{application.candidate_email}</span>
                        </div>
                        <div className="dashboard-schedule-meta">
                          <span className={`tag ${STAGE_COLORS[application.status] ?? 'tag-blue'}`}>{formatDashboardLabel(application.status)}</span>
                          <span>{new Date(application.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : activePipelineModal === 'offers' ? (
                offerRows.length === 0 ? (
                  <div className="dashboard-empty">No candidates in offer stage for this job.</div>
                ) : (
                  <div className="dashboard-schedule">
                    {offerRows.map(application => (
                      <div key={application.id} className="dashboard-schedule-item">
                        <div>
                          <strong>{application.candidate_name || application.candidate_email}</strong>
                          <span>{application.candidate_email}</span>
                        </div>
                        <div className="dashboard-schedule-meta">
                          <span className={`tag ${STAGE_COLORS[application.status] ?? 'tag-blue'}`}>{formatDashboardLabel(application.status)}</span>
                          <span>{new Date(application.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : hiredRows.length === 0 ? (
                <div className="dashboard-empty">No hired candidates for this job.</div>
              ) : (
                <div className="dashboard-schedule">
                  {hiredRows.map(application => (
                    <div key={application.id} className="dashboard-schedule-item">
                      <div>
                        <strong>{application.candidate_name || application.candidate_email}</strong>
                        <span>{application.candidate_email}</span>
                      </div>
                      <div className="dashboard-schedule-meta">
                        <span className={`tag ${STAGE_COLORS[application.status] ?? 'tag-blue'}`}>{formatDashboardLabel(application.status)}</span>
                        <span>{new Date(application.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="dashboard-hero dashboard-hero-modern">
        <div className="dashboard-hero-main">
          <p className="dashboard-eyebrow">Talent intelligence</p>
          <h2 className="dashboard-title">{user.account?.name ?? 'Your Workspace'} Hiring Overview</h2>
          <p className="dashboard-subtitle">
            Beautiful, real-time visibility into pipeline velocity, candidate quality, source performance, and hiring outcomes.
          </p>
        </div>
        <div className="dashboard-hero-meta">
          <div className="dashboard-hero-meta-item">
            <span>Pipeline Health</span>
            <strong>{conversionRate >= 25 ? 'Strong' : conversionRate >= 10 ? 'Stable' : 'Needs Attention'}</strong>
          </div>
          <div className="dashboard-hero-meta-item">
            <span>Openings Fill Rate</span>
            <strong>{openingFillRate}%</strong>
          </div>
          <div className="dashboard-hero-meta-item">
            <span>Avg Applicants / Job</span>
            <strong>{avgApplicantsPerJob}</strong>
          </div>
          <div className="dashboard-hero-meta-item">
            <span>Unique Candidates</span>
            <strong>{uniqueCandidateCount}</strong>
          </div>
        </div>
      </div>

      <div className="dashboard-kpi-grid dashboard-kpi-grid--quad">
        <DashboardSummaryCard
          primary
          title="Total Candidates"
          value={uniqueCandidateCount}
          subtitle={`${totalApplicantsAcrossJobs} applications · ${avgApplicantsPerJob} avg per job`}
          icon={<IconUsers />}
          trend={candidateTrend}
          loading={applicationsLoading || jobsLoading}
        />
        <DashboardSummaryCard
          title="Active Jobs"
          value={openJobs}
          subtitle={`${jobs.length} total requisitions`}
          icon={<IconBriefcase />}
          trend={jobsTrend}
          loading={jobsLoading}
        />
        <DashboardSummaryCard
          title="Interviews Scheduled"
          value={workspaceUpcomingInterviews}
          subtitle={`${interviewsScheduledThisMonth} with a date this month`}
          icon={<IconCalendar />}
          trend={interviewTrend}
          loading={interviewsLoading || jobsLoading}
        />
        <DashboardSummaryCard
          title="Offers Released"
          value={offersReleasedThisMonth}
          subtitle={`${allApplications.filter(a => a.status === 'offer').length} currently in offer stage`}
          icon={<IconGift />}
          trend={offerTrend}
          loading={applicationsLoading || jobsLoading}
        />
      </div>

      <div className="dashboard-grid">
        <DashboardPanel title="Pipeline Funnel (Workspace)">
          <div className="dashboard-panel-content">
            {applicationsLoading ? (
              <LoadingRow />
            ) : workspaceFunnelValues.every(v => v === 0) ? (
              <div className="dashboard-empty">No candidates in pipeline stages yet.</div>
            ) : (
              <DashboardPipelineFunnelChart values={workspaceFunnelValues} />
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Applications Over Time">
          <div className="dashboard-panel-content">
            {applicationsLoading ? (
              <LoadingRow />
            ) : monthlyTrend.every(item => item.value === 0) ? (
              <div className="dashboard-empty">No recent application activity yet.</div>
            ) : (
              <DashboardApplicationsLineChart points={monthlyTrend} />
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Jobs By Status">
          <div className="dashboard-panel-content">
            {jobsLoading ? (
              <LoadingRow />
            ) : jobsError ? (
              <ErrorRow msg={jobsError} />
            ) : (
              <>
                <DashboardDoughnutChart slices={jobsByStatus} emptyLabel="No jobs yet." legendLabel="Jobs" />
                <div className="dashboard-status-groups">
                  {jobStatusGroups.map(group => (
                    <details key={group.key} className="dashboard-status-group">
                      <summary className="dashboard-status-summary">
                        <div className="dashboard-status-summary-left">
                          <span className="dashboard-legend-dot" style={{ backgroundColor: group.color }} />
                          <span>{group.label}</span>
                        </div>
                        <span className="dashboard-status-count">{group.jobs.length} jobs</span>
                      </summary>
                      <div className="dashboard-status-jobs">
                        {group.jobs.map(job => (
                          <div key={job.id} className="dashboard-job-item">
                            <button
                              type="button"
                              className={`dashboard-job-select ${selectedJobId === String(job.id) ? 'dashboard-job-select-active' : ''}`}
                              onClick={() => setSelectedJobId(String(job.id))}
                            >
                              <strong>{job.title}</strong>
                              <span>{job.department ?? 'General'} • {job.location ?? 'Remote / TBD'}</span>
                            </button>
                            <div className="dashboard-job-meta">
                              <span>{job.open_positions ?? 0} openings</span>
                              <Link className="dashboard-link" to={`/account/${accountId}/jobs/${job.id}/edit`}>
                                Open job
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                  ))}
                </div>
                <div className="dashboard-footnote">Tip: select a role to instantly update pipeline and source analytics.</div>
              </>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Selected Job Pipeline">
          <div className="dashboard-panel-content">
            {analyticsLoading ? (
              <LoadingRow />
            ) : analyticsError ? (
              <ErrorRow msg={analyticsError} />
            ) : (
              <>
                <div className="dashboard-panel-headline">
                  <div>
                    <div className="field dashboard-filter-field dashboard-filter-field-inline">
                      <label htmlFor="dashboard-job-filter">Job</label>
                      <select
                        id="dashboard-job-filter"
                        value={selectedJobId}
                        onChange={e => setSelectedJobId(e.target.value)}
                        disabled={jobsLoading || jobs.length === 0}
                      >
                        {jobs.length === 0 && <option value="">No jobs yet</option>}
                        {jobs.map(job => (
                          <option key={job.id} value={String(job.id)}>
                            {job.title}
                          </option>
                        ))}
                      </select>
                    </div>
                    <strong>{selectedJob?.title ?? 'No job selected'}</strong>
                    <span>
                      {selectedJob ? `${selectedJob.department ?? 'General'} • ${selectedJob.location ?? 'Location not set'}` : 'Pick a job to view analytics'}
                    </span>
                  </div>
                  {selectedJob && (
                    <Link className="dashboard-link" to={`/account/${accountId}/jobs/${selectedJob.id}/edit`}>
                      Open job
                    </Link>
                  )}
                </div>
                <p className="dashboard-chart-caption">Stage funnel · this job</p>
                <DashboardPipelineFunnelChart values={selectedJobFunnelValues} />
                <p className="dashboard-chart-caption">Status distribution</p>
                <DashboardDoughnutChart
                  slices={analyticsSlices}
                  emptyLabel="Choose a job to load analytics from the backend."
                  legendLabel="Applicants"
                />
                <div className="dashboard-microstats">
                  <button
                    type="button"
                    className="dashboard-microstat-button"
                    onClick={() => setActivePipelineModal('applicants')}
                  >
                    <strong>{totalApplicants}</strong>
                    <span>Applicants</span>
                  </button>
                  <button
                    type="button"
                    className="dashboard-microstat-button"
                    onClick={() => setActivePipelineModal('interviews')}
                  >
                    <strong>{scheduledInterviews}</strong>
                    <span>Interview</span>
                  </button>
                  <button
                    type="button"
                    className="dashboard-microstat-button"
                    onClick={() => setActivePipelineModal('offers')}
                  >
                    <strong>{offerStageCount}</strong>
                    <span>Offers</span>
                  </button>
                  <button
                    type="button"
                    className="dashboard-microstat-button"
                    onClick={() => setActivePipelineModal('hired')}
                  >
                    <strong>{hiredCount}</strong>
                    <span>Hired</span>
                  </button>
                  <div className="dashboard-microstat-card">
                    <strong>{conversionRate}%</strong>
                    <span>Hire Conversion</span>
                  </div>
                  <div className="dashboard-microstat-card">
                    <strong>{rejectedCount}</strong>
                    <span>Rejected/Withdrawn</span>
                  </div>
                </div>
                <div className="dashboard-footnote">Click a metric card to inspect candidate-level records in detail.</div>
              </>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Source of Candidates (Workspace)">
          <div className="dashboard-panel-content">
            {applicationsLoading ? (
              <LoadingRow />
            ) : (
              <>
                <DashboardSourcePieChart slices={workspaceSourceSlices} emptyLabel="No applications yet." />
                <div className="dashboard-insight-row dashboard-insight-row--single">
                  <div className="dashboard-insight-card">
                    <strong>{workspaceSourceSlices[0]?.label ?? '—'}</strong>
                    <span>Leading channel (workspace)</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Candidates by Job">
          <div className="dashboard-panel-content">
            {applicationsLoading ? (
              <LoadingRow />
            ) : (
              <DashboardJobsDistributionChart rows={jobDistributionRows} maxBars={8} />
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Applicant Sources (Selected Job)">
          <div className="dashboard-panel-content">
            {analyticsLoading ? (
              <LoadingRow />
            ) : sourceSlices.length === 0 ? (
              <div className="dashboard-empty">No source data is available for this job.</div>
            ) : (
              <>
                <DashboardSourcePieChart slices={sourceSlices} emptyLabel="No source data is available for this job." />
                <div className="dashboard-insight-row">
                  <div className="dashboard-insight-card">
                    <strong>{sourceTopLabel}</strong>
                    <span>Top source channel</span>
                  </div>
                  <div className="dashboard-insight-card">
                    <strong>{sourceSlices.length}</strong>
                    <span>Distinct source channels</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Recent Activity">
          <div className="dashboard-panel-content">
            {jobsLoading || applicationsLoading ? (
              <LoadingRow />
            ) : activityFeed.length === 0 ? (
              <div className="dashboard-empty">No recent activity yet.</div>
            ) : (
              <ul className="dashboard-activity-feed">
                {activityFeed.map(item => (
                  <li key={item.id} className="dashboard-activity-item">
                    {item.href ? (
                      <Link to={item.href} className="dashboard-activity-link">
                        <span className="dashboard-activity-text">{item.text}</span>
                        <time className="dashboard-activity-time">
                          {new Date(item.at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </time>
                      </Link>
                    ) : (
                      <div className="dashboard-activity-static">
                        <span className="dashboard-activity-text">{item.text}</span>
                        <time className="dashboard-activity-time">
                          {new Date(item.at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </time>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Upcoming Interviews (Selected Scope)">
          <div className="dashboard-panel-content">
            {interviewsLoading ? (
              <LoadingRow />
            ) : interviewsError ? (
              <ErrorRow msg={interviewsError} />
            ) : filteredUpcomingInterviews.length === 0 ? (
              <div className="dashboard-empty">No interviews match the current job scope.</div>
            ) : (
              <div className="dashboard-schedule">
                {filteredUpcomingInterviews.slice(0, 6).map(row => (
                  <div key={row.id} className="dashboard-schedule-item">
                    <div>
                      <strong>{row.application?.candidate_name || row.application?.candidate_email || 'Candidate'}</strong>
                      <span>{row.job?.title ?? `Job #${row.application?.job_id ?? '—'}`}</span>
                    </div>
                    <div className="dashboard-schedule-meta">
                      <span className={`tag ${STAGE_COLORS[row.status] ?? 'tag-blue'}`}>{formatDashboardLabel(row.status)}</span>
                      <span>{formatDateTimeShort(row.scheduled_at)}</span>
                    </div>
                  </div>
                ))}
                <div className="dashboard-panel-footer">
                  <Link className="dashboard-link" to={`/account/${accountId}/interviews`}>
                    Open interviews board
                  </Link>
                </div>
              </div>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Jobs Overview" wide>
          <div className="dashboard-panel-content dashboard-panel-content--flush">
            {jobsLoading ? (
              <LoadingRow />
            ) : jobsError ? (
              <ErrorRow msg={jobsError} />
            ) : jobs.length === 0 ? (
              <div className="dashboard-empty">No jobs yet. Create a role to start tracking applicants.</div>
            ) : (
              <div className="dashboard-table-wrap">
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th scope="col">Job title</th>
                      <th scope="col">Status</th>
                      <th scope="col" className="dashboard-table-num">
                        Applicants
                      </th>
                      <th scope="col">Stage</th>
                      <th scope="col" />
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map(job => {
                      const n = applicantsByJobId[job.id] ?? 0
                      const stage = dominantStageByJobId[job.id] ?? '—'
                      return (
                        <tr key={job.id}>
                          <td>
                            <strong className="dashboard-table-title">{job.title}</strong>
                            <div className="dashboard-table-sub">{job.department ?? '—'} · {job.location ?? '—'}</div>
                          </td>
                          <td>
                            <span className={`tag ${STAGE_COLORS[job.status] ?? 'tag-blue'}`}>{formatDashboardLabel(job.status)}</span>
                          </td>
                          <td className="dashboard-table-num">{n}</td>
                          <td>
                            <span className="dashboard-table-stage">{stage}</span>
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
            )}
          </div>
        </DashboardPanel>
      </div>
    </>
  )
}

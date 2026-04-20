import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { Bar, Doughnut, Line, Pie } from 'react-chartjs-2'
import '../components/dashboard/chartJsRegister'
import {
  doughnutOptions,
  funnelBarOptions,
  lineChartOptions,
  pieOptions,
  verticalBarOptions,
} from '../components/dashboard/chartOptions'
import type { DashboardOutletContext } from '../layouts/DashboardOutletContext'
import { jobsApi, type Job } from '../api/jobs'
import { applicationsApi, type Application } from '../api/applications'
import { interviewsApi, type InterviewAssignmentRow } from '../api/interviews'
import { DashboardKpiCard, type KpiTrend } from '../components/dashboard/DashboardKpiCard'
import { DashboardChartSkeleton, DashboardKpiSkeletonGrid, DashboardPanelSkeleton } from '../components/dashboard/DashboardSkeleton'

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

const MS_DAY = 86_400_000

type DashboardSlice = {
  key: string
  label: string
  value: number
  color: string
}

type PipelineModalKind = 'applicants' | 'interviews' | 'offers' | 'hired'

type ActivityItem = {
  id: string
  at: string
  label: string
  detail: string
}

function inTimeRange(iso: string, fromMs: number, toMs: number) {
  const t = new Date(iso).getTime()
  return t >= fromMs && t < toMs
}

function buildTrend(current: number, previous: number): KpiTrend {
  if (previous === 0 && current === 0) return { direction: 'flat', label: '0%' }
  if (previous === 0) return { direction: 'up', label: '+100%' }
  const pct = Math.round(((current - previous) / previous) * 100)
  if (pct > 0) return { direction: 'up', label: `+${pct}%` }
  if (pct < 0) return { direction: 'down', label: `${pct}%` }
  return { direction: 'flat', label: '0%' }
}

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

function workspaceFunnelCounts(applications: Application[]) {
  const total = applications.length
  const screeningPlus = applications.filter(a =>
    ['screening', 'interview', 'offer', 'hired'].includes(a.status),
  ).length
  const interviewPlus = applications.filter(a => ['interview', 'offer', 'hired'].includes(a.status)).length
  const offerPlus = applications.filter(a => ['offer', 'hired'].includes(a.status)).length
  const hired = applications.filter(a => a.status === 'hired').length
  return [
    { label: 'Applied', value: total },
    { label: 'Screening+', value: screeningPlus },
    { label: 'Interview+', value: interviewPlus },
    { label: 'Offer+', value: offerPlus },
    { label: 'Hired', value: hired },
  ]
}

function dominantApplicantStage(rows: Application[]) {
  if (rows.length === 0) return '—'
  const weight: Record<string, number> = {}
  for (const a of rows) {
    weight[a.status] = (weight[a.status] ?? 0) + 1
  }
  const ranked = Object.entries(weight).sort((x, y) => y[1] - x[1])
  return ranked[0] ? formatDashboardLabel(ranked[0][0]) : '—'
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

  return (
    <div className="dashboard-chart-shell">
      <Doughnut data={chartData} options={doughnutOptions} />
    </div>
  )
}

function DashboardPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="panel dashboard-panel dashboard-modern-panel">
      <div className="panel-header dashboard-modern-panel-header">
        <span className="panel-header-title">{title}</span>
      </div>
      <div className="panel-body dashboard-modern-panel-body">{children}</div>
    </section>
  )
}

const iconCandidates = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)

const iconBriefcase = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </svg>
)

const iconCalendar = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
)

const iconGift = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
    <polyline points="20 12 20 22 4 22 4 12" />
    <rect x="2" y="7" width="20" height="5" />
    <line x1="12" y1="22" x2="12" y2="7" />
    <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
  </svg>
)

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
  const [asOfMs, setAsOfMs] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setAsOfMs(Date.now()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) return
      setJobsLoading(true)
      setJobsError('')
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
      if (cancelled) return
      setInterviewsLoading(true)
      setInterviewsError('')
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
      if (cancelled) return
      setApplicationsLoading(true)
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
    let cancelled = false

    if (!selectedJobId) {
      queueMicrotask(() => {
        if (cancelled) return
        setJobApplications([])
        setAnalyticsError('')
      })
      return () => {
        cancelled = true
      }
    }

    queueMicrotask(() => {
      if (cancelled) return
      setAnalyticsLoading(true)
      setAnalyticsError('')
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
  const scheduledInterviews = interviewPanelRows.length
  const offerRows = jobApplications.filter(application => application.status === 'offer')
  const hiredRows = jobApplications.filter(application => application.status === 'hired')
  const openJobs = jobs.filter(job => job.status === 'open').length

  const nowMs = asOfMs
  const currentWindowStart = nowMs - 30 * MS_DAY
  const previousWindowStart = nowMs - 60 * MS_DAY
  const previousWindowEnd = currentWindowStart

  const applicationsCreatedCurrent = allApplications.filter(a => inTimeRange(a.created_at, currentWindowStart, nowMs)).length
  const applicationsCreatedPrevious = allApplications.filter(a =>
    inTimeRange(a.created_at, previousWindowStart, previousWindowEnd),
  ).length

  const jobsCreatedCurrent = jobs.filter(j => inTimeRange(j.created_at, currentWindowStart, nowMs)).length
  const jobsCreatedPrevious = jobs.filter(j => inTimeRange(j.created_at, previousWindowStart, previousWindowEnd)).length

  const interviewsBookedCurrent = interviews.filter(
    r => r.scheduled_at && inTimeRange(r.scheduled_at, currentWindowStart, nowMs),
  ).length
  const interviewsBookedPrevious = interviews.filter(
    r => r.scheduled_at && inTimeRange(r.scheduled_at, previousWindowStart, previousWindowEnd),
  ).length

  const offersReleasedCurrent = allApplications.filter(
    a => a.status === 'offer' && inTimeRange(a.updated_at, currentWindowStart, nowMs),
  ).length
  const offersReleasedPrevious = allApplications.filter(
    a => a.status === 'offer' && inTimeRange(a.updated_at, previousWindowStart, previousWindowEnd),
  ).length
  const offersInPipelineWorkspace = allApplications.filter(a => a.status === 'offer').length

  const funnelRows = useMemo(() => workspaceFunnelCounts(allApplications), [allApplications])
  const globalSourceSlices = useMemo(
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

  const applicantsByJob = useMemo(() => {
    const map = allApplications.reduce<Record<number, number>>((acc, a) => {
      acc[a.job_id] = (acc[a.job_id] ?? 0) + 1
      return acc
    }, {})
    return jobs
      .map(job => ({ job, count: map[job.id] ?? 0 }))
      .filter(x => x.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
  }, [allApplications, jobs])

  const activityItems = useMemo((): ActivityItem[] => {
    const jobTitle = (jobId: number) => jobs.find(j => j.id === jobId)?.title ?? `Job #${jobId}`

    const fromApps: ActivityItem[] = allApplications.slice(0, 80).map(a => {
      const createdMs = new Date(a.created_at).getTime()
      const updatedMs = new Date(a.updated_at).getTime()
      const isNew = Math.abs(updatedMs - createdMs) < 2000
      return {
        id: `app-${a.id}`,
        at: a.updated_at,
        label: isNew ? 'Candidate applied' : 'Application updated',
        detail: `${a.candidate_name || a.candidate_email} · ${jobTitle(a.job_id)} · ${formatDashboardLabel(a.status)}`,
      }
    })

    const fromInterviews: ActivityItem[] = interviews.map(r => ({
      id: `int-${r.id}`,
      at: r.scheduled_at || r.updated_at,
      label: r.scheduled_at ? 'Interview scheduled' : 'Interview activity',
      detail: `${r.application?.candidate_name || r.application?.candidate_email || 'Candidate'} · ${r.job?.title ?? 'Job'}`,
    }))

    const fromJobs: ActivityItem[] = jobs.slice(0, 30).map(j => ({
      id: `job-${j.id}`,
      at: j.created_at,
      label: 'Job created',
      detail: j.title,
    }))

    return [...fromApps, ...fromInterviews, ...fromJobs]
      .sort((x, y) => new Date(y.at).getTime() - new Date(x.at).getTime())
      .slice(0, 14)
  }, [allApplications, interviews, jobs])

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
  const currentMonthApplications = monthlyTrend[monthlyTrend.length - 1]?.value ?? 0
  const previousMonthApplications = monthlyTrend[monthlyTrend.length - 2]?.value ?? 0
  const monthlyDelta = currentMonthApplications - previousMonthApplications
  const monthlyDeltaLabel = `${monthlyDelta > 0 ? '+' : ''}${monthlyDelta}`
  const maxSourceValue = Math.max(...globalSourceSlices.map(slice => slice.value), 0)
  const sourceTopLabel = globalSourceSlices.find(slice => slice.value === maxSourceValue)?.label ?? 'No data'

  const workspaceUpcomingInterviews = interviews.filter(
    row => row.status === 'scheduled' || row.status === 'pending' || !!row.scheduled_at,
  ).length
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

  const jobTableRows = useMemo(() => {
    const byJob = allApplications.reduce<Record<number, Application[]>>((acc, a) => {
      if (!acc[a.job_id]) acc[a.job_id] = []
      acc[a.job_id].push(a)
      return acc
    }, {})
    return jobs.map(job => ({
      job,
      applicants: byJob[job.id]?.length ?? 0,
      stage: dominantApplicantStage(byJob[job.id] ?? []),
    }))
  }, [allApplications, jobs])

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

  const summaryLoading = jobsLoading || applicationsLoading

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
            Pipeline velocity, hiring funnel, and team activity — scoped to your workspace, with role-level detail when you
            select a job.
          </p>
        </div>
        <div className="dashboard-hero-meta">
          <div className="dashboard-hero-meta-item">
            <span>Open roles</span>
            <strong>{openJobs}</strong>
          </div>
          <div className="dashboard-hero-meta-item">
            <span>Fill rate</span>
            <strong>{openingFillRate}%</strong>
          </div>
          <div className="dashboard-hero-meta-item">
            <span>Avg applicants / job</span>
            <strong>{avgApplicantsPerJob}</strong>
          </div>
        </div>
      </div>

      {summaryLoading ? (
        <DashboardKpiSkeletonGrid />
      ) : (
        <div className="dashboard-kpi-grid dashboard-kpi-grid--four">
          <DashboardKpiCard
            primary
            icon={iconCandidates}
            label="Total candidates"
            value={totalApplicantsAcrossJobs}
            trend={buildTrend(applicationsCreatedCurrent, applicationsCreatedPrevious)}
            footer="Applications in workspace"
          />
          <DashboardKpiCard
            icon={iconBriefcase}
            label="Active jobs"
            value={openJobs}
            trend={buildTrend(jobsCreatedCurrent, jobsCreatedPrevious)}
            footer={`${jobs.length} total listings`}
          />
          <DashboardKpiCard
            icon={iconCalendar}
            label="Interviews scheduled"
            value={workspaceUpcomingInterviews}
            trend={buildTrend(interviewsBookedCurrent, interviewsBookedPrevious)}
            footer="Pending or scheduled with a time"
          />
          <DashboardKpiCard
            icon={iconGift}
            label="Offers released"
            value={offersInPipelineWorkspace}
            trend={buildTrend(offersReleasedCurrent, offersReleasedPrevious)}
            footer="Candidates currently in offer stage"
          />
        </div>
      )}

      <div className="dashboard-section-label">Workspace analytics</div>
      <div className="dashboard-grid dashboard-grid--charts">
        <DashboardPanel title="Hiring funnel (workspace)">
          <div className="dashboard-panel-content">
            {applicationsLoading ? (
              <DashboardChartSkeleton />
            ) : funnelRows.every(r => r.value === 0) ? (
              <div className="dashboard-empty">No candidates yet.</div>
            ) : (
              <div className="dashboard-chart-shell dashboard-chart-shell-funnel">
                <Bar
                  data={{
                    labels: funnelRows.map(r => r.label),
                    datasets: [
                      {
                        data: funnelRows.map(r => r.value),
                        backgroundColor: funnelRows.map((_, i) => DASHBOARD_CHART_COLORS[i % DASHBOARD_CHART_COLORS.length]),
                        borderRadius: 8,
                        maxBarThickness: 22,
                      },
                    ],
                  }}
                  options={funnelBarOptions}
                />
              </div>
            )}
            <p className="dashboard-footnote dashboard-footnote--tight">
              Cumulative counts: each stage includes everyone at or beyond that step.
            </p>
          </div>
        </DashboardPanel>

        <DashboardPanel title="Applications over time">
          <div className="dashboard-panel-content">
            {applicationsLoading ? (
              <DashboardChartSkeleton />
            ) : monthlyTrend.every(item => item.value === 0) ? (
              <div className="dashboard-empty">No recent application activity yet.</div>
            ) : (
              <div className="dashboard-chart-shell dashboard-chart-shell-short">
                <Line
                  data={{
                    labels: monthlyTrend.map(item => item.label),
                    datasets: [
                      {
                        data: monthlyTrend.map(item => item.value),
                        borderColor: '#0ea5e9',
                        backgroundColor: 'rgba(14,165,233,0.15)',
                        borderWidth: 2,
                        pointRadius: 4,
                        pointHoverRadius: 5,
                        pointBackgroundColor: '#ffffff',
                        pointBorderColor: '#0ea5e9',
                        pointBorderWidth: 2,
                        fill: true,
                        tension: 0.32,
                      },
                    ],
                  }}
                  options={lineChartOptions}
                />
              </div>
            )}
            <p className="dashboard-footnote dashboard-footnote--tight">
              New applications per month (last 6). MoM delta on summary: {monthlyDeltaLabel} vs prior month.
            </p>
          </div>
        </DashboardPanel>

        <DashboardPanel title="Applicants by job">
          <div className="dashboard-panel-content">
            {applicationsLoading || jobsLoading ? (
              <DashboardChartSkeleton />
            ) : applicantsByJob.length === 0 ? (
              <div className="dashboard-empty">No applicants mapped to jobs yet.</div>
            ) : (
              <div className="dashboard-chart-shell dashboard-chart-shell-short">
                <Bar
                  data={{
                    labels: applicantsByJob.map(x => x.job.title),
                    datasets: [
                      {
                        data: applicantsByJob.map(x => x.count),
                        backgroundColor: '#3b82f6',
                        borderRadius: 8,
                        maxBarThickness: 28,
                      },
                    ],
                  }}
                  options={verticalBarOptions}
                />
              </div>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Source of candidates (workspace)">
          <div className="dashboard-panel-content">
            {applicationsLoading ? (
              <DashboardChartSkeleton />
            ) : globalSourceSlices.length === 0 ? (
              <div className="dashboard-empty">No source data yet.</div>
            ) : (
              <>
                <div className="dashboard-chart-shell dashboard-chart-shell-pie">
                  <Pie
                    data={{
                      labels: globalSourceSlices.map(s => s.label),
                      datasets: [
                        {
                          data: globalSourceSlices.map(s => s.value),
                          backgroundColor: globalSourceSlices.map(s => s.color),
                          borderColor: '#ffffff',
                          borderWidth: 2,
                        },
                      ],
                    }}
                    options={pieOptions}
                  />
                </div>
                <div className="dashboard-insight-row">
                  <div className="dashboard-insight-card">
                    <strong>{sourceTopLabel}</strong>
                    <span>Top source</span>
                  </div>
                  <div className="dashboard-insight-card">
                    <strong>{globalSourceSlices.length}</strong>
                    <span>Channels</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </DashboardPanel>
      </div>

      <div className="dashboard-section-label">Role focus</div>
      <div className="dashboard-grid">
        <DashboardPanel title="Jobs By Status">
          <div className="dashboard-panel-content">
            {jobsLoading ? (
              <DashboardPanelSkeleton rows={4} />
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
                              <span>
                                {job.department ?? 'General'} • {job.location ?? 'Remote / TBD'}
                              </span>
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
                <div className="dashboard-footnote">Select a role to refresh pipeline, sources, and the jobs table highlight.</div>
              </>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Selected Job Pipeline">
          <div className="dashboard-panel-content">
            {analyticsLoading ? (
              <DashboardPanelSkeleton />
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
                      {selectedJob
                        ? `${selectedJob.department ?? 'General'} • ${selectedJob.location ?? 'Location not set'}`
                        : 'Pick a job to view analytics'}
                    </span>
                  </div>
                  {selectedJob && (
                    <Link className="dashboard-link" to={`/account/${accountId}/jobs/${selectedJob.id}/edit`}>
                      Open job
                    </Link>
                  )}
                </div>
                <DashboardDoughnutChart
                  slices={analyticsSlices}
                  emptyLabel="Choose a job to load analytics from the backend."
                  legendLabel="Applicants"
                />
                <div className="dashboard-microstats">
                  <button type="button" className="dashboard-microstat-button" onClick={() => setActivePipelineModal('applicants')}>
                    <strong>{totalApplicants}</strong>
                    <span>Applicants</span>
                  </button>
                  <button type="button" className="dashboard-microstat-button" onClick={() => setActivePipelineModal('interviews')}>
                    <strong>{scheduledInterviews}</strong>
                    <span>Interview</span>
                  </button>
                  <button type="button" className="dashboard-microstat-button" onClick={() => setActivePipelineModal('offers')}>
                    <strong>{offerStageCount}</strong>
                    <span>Offers</span>
                  </button>
                  <button type="button" className="dashboard-microstat-button" onClick={() => setActivePipelineModal('hired')}>
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

        <DashboardPanel title="Applicant Sources (Selected Job)">
          <div className="dashboard-panel-content">
            {analyticsLoading ? (
              <DashboardPanelSkeleton />
            ) : sourceSlices.length === 0 ? (
              <div className="dashboard-empty">No source data is available for this job.</div>
            ) : (
              <>
                <div className="dashboard-chart-shell dashboard-chart-shell-short">
                  <Bar
                    data={{
                      labels: sourceSlices.map(slice => slice.label),
                      datasets: [
                        {
                          data: sourceSlices.map(slice => slice.value),
                          backgroundColor: sourceSlices.map(slice => slice.color),
                          borderRadius: 8,
                          maxBarThickness: 36,
                        },
                      ],
                    }}
                    options={verticalBarOptions}
                  />
                </div>
                <div className="dashboard-insight-row">
                  <div className="dashboard-insight-card">
                    <strong>{sourceSlices.find(s => s.value === Math.max(...sourceSlices.map(x => x.value)))?.label ?? '—'}</strong>
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

        <DashboardPanel title="Upcoming Interviews (Selected Scope)">
          <div className="dashboard-panel-content">
            {interviewsLoading ? (
              <DashboardPanelSkeleton />
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

        <DashboardPanel title="Recent activity">
          <div className="dashboard-panel-content dashboard-activity-panel">
            {applicationsLoading && jobsLoading ? (
              <DashboardPanelSkeleton rows={6} />
            ) : activityItems.length === 0 ? (
              <div className="dashboard-empty">No recent activity.</div>
            ) : (
              <ul className="dashboard-activity-list">
                {activityItems.map(item => (
                  <li key={item.id} className="dashboard-activity-item">
                    <span className="dashboard-activity-dot" aria-hidden />
                    <div className="dashboard-activity-body">
                      <div className="dashboard-activity-head">
                        <strong>{item.label}</strong>
                        <time dateTime={item.at}>
                          {new Date(item.at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </time>
                      </div>
                      <p className="dashboard-activity-detail">{item.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DashboardPanel>

        <section className="panel dashboard-panel dashboard-modern-panel dashboard-jobs-table-panel">
          <div className="panel-header dashboard-modern-panel-header">
            <span className="panel-header-title">Jobs overview</span>
          </div>
          <div className="panel-body dashboard-modern-panel-body">
            <div className="dashboard-panel-content dashboard-panel-content--flush">
              {jobsLoading || applicationsLoading ? (
                <DashboardPanelSkeleton rows={5} />
              ) : jobs.length === 0 ? (
                <div className="dashboard-empty">No jobs yet.</div>
              ) : (
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
                      {jobTableRows.map(({ job, applicants, stage }) => (
                        <tr key={job.id} className={String(job.id) === selectedJobId ? 'dashboard-table-row--active' : undefined}>
                          <td>
                            <button type="button" className="dashboard-table-job-title" onClick={() => setSelectedJobId(String(job.id))}>
                              {job.title}
                            </button>
                          </td>
                          <td>
                            <span className={`tag ${STAGE_COLORS[job.status] ?? 'tag-blue'}`}>{formatDashboardLabel(job.status)}</span>
                          </td>
                          <td>{applicants}</td>
                          <td>{stage}</td>
                          <td className="dashboard-table-actions">
                            <Link className="dashboard-link" to={`/account/${accountId}/jobs/${job.id}/edit`}>
                              Open
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </>
  )
}

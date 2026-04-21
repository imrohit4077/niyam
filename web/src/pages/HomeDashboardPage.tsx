import { useEffect, useMemo, useState } from 'react'
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
import { Bar, Line, Pie } from 'react-chartjs-2'
import type { DashboardOutletContext } from '../layouts/DashboardOutletContext'
import { jobsApi, type Job } from '../api/jobs'
import { applicationsApi, type Application } from '../api/applications'
import { interviewsApi, type InterviewAssignmentRow } from '../api/interviews'
import { buildDashboardActivity } from '../components/dashboard/buildDashboardActivity'
import { DashboardActivityFeed } from '../components/dashboard/DashboardActivityFeed'
import { DashboardDoughnutChart } from '../components/dashboard/DashboardDoughnutChart'
import { DashboardPanel } from '../components/dashboard/DashboardPanel'
import { DashboardSummaryCard } from '../components/dashboard/DashboardSummaryCard'
import {
  dashboardBarOptions,
  dashboardLineOptions,
  dashboardPieOptions,
} from '../components/dashboard/dashboardChartOptions'
import { makeDashboardSlices, trendFromPeriods, formatDashboardLabel } from '../components/dashboard/dashboardUtils'

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

const PIPELINE_FUNNEL_ORDER = ['applied', 'screening', 'interview', 'offer', 'hired'] as const

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Filler,
  PieController,
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

function formatDateTimeShort(value: string | null) {
  if (!value) return 'Not scheduled'
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function windowRange(days: number, endOffsetDays: number) {
  const end = new Date()
  end.setHours(23, 59, 59, 999)
  end.setDate(end.getDate() - endOffsetDays)
  const start = new Date(end)
  start.setDate(start.getDate() - days + 1)
  start.setHours(0, 0, 0, 0)
  return { start, end }
}

function countApplicationsInWindows(apps: Application[], days: number) {
  const cur = windowRange(days, 0)
  const prev = windowRange(days, days)
  const inRange = (a: Application, s: Date, e: Date) => {
    const t = new Date(a.created_at).getTime()
    return t >= s.getTime() && t <= e.getTime()
  }
  return {
    current: apps.filter(a => inRange(a, cur.start, cur.end)).length,
    previous: apps.filter(a => inRange(a, prev.start, prev.end)).length,
  }
}

function countOpenJobsCreatedInWindows(jobList: Job[], days: number) {
  const cur = windowRange(days, 0)
  const prev = windowRange(days, days)
  const inRange = (j: Job, s: Date, e: Date) => {
    if (j.status !== 'open') return false
    const t = new Date(j.created_at).getTime()
    return t >= s.getTime() && t <= e.getTime()
  }
  return {
    current: jobList.filter(j => inRange(j, cur.start, cur.end)).length,
    previous: jobList.filter(j => inRange(j, prev.start, prev.end)).length,
  }
}

function countInterviewsScheduledInWindows(rows: InterviewAssignmentRow[], days: number) {
  const cur = windowRange(days, 0)
  const prev = windowRange(days, days)
  const inRange = (r: InterviewAssignmentRow, s: Date, e: Date) => {
    if (!r.scheduled_at) return false
    const t = new Date(r.scheduled_at).getTime()
    return t >= s.getTime() && t <= e.getTime()
  }
  return {
    current: rows.filter(r => inRange(r, cur.start, cur.end)).length,
    previous: rows.filter(r => inRange(r, prev.start, prev.end)).length,
  }
}

function countOffersInWindows(apps: Application[], days: number) {
  const cur = windowRange(days, 0)
  const prev = windowRange(days, days)
  const inRange = (a: Application, s: Date, e: Date) => {
    if (a.status !== 'offer') return false
    const t = new Date(a.updated_at).getTime()
    return t >= s.getTime() && t <= e.getTime()
  }
  return {
    current: apps.filter(a => inRange(a, cur.start, cur.end)).length,
    previous: apps.filter(a => inRange(a, prev.start, prev.end)).length,
  }
}

function dominantApplicantStage(apps: Application[]): string {
  if (apps.length === 0) return '—'
  const tally: Record<string, number> = {}
  for (const a of apps) {
    tally[a.status] = (tally[a.status] ?? 0) + 1
  }
  let best = ''
  let n = 0
  for (const [k, v] of Object.entries(tally)) {
    if (v > n) {
      n = v
      best = k
    }
  }
  return formatDashboardLabel(best)
}

type PipelineModalKind = 'applicants' | 'interviews' | 'offers' | 'hired'

const summaryIcons = {
  candidates: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  jobs: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
    </svg>
  ),
  interviews: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  ),
  offers: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M20 7h-9M14 17H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2Z" />
      <path d="M12 22v-6" />
    </svg>
  ),
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
    setJobsLoading(true)
    setJobsError('')

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
    setInterviewsLoading(true)
    setInterviewsError('')

    interviewsApi
      .myAssignments(token, {
        include_open: true,
        page: 1,
        per_page: 80,
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
    setApplicationsLoading(true)

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
      setJobApplications([])
      setAnalyticsError('')
      setAnalyticsLoading(false)
      return
    }

    let cancelled = false
    setAnalyticsLoading(true)
    setAnalyticsError('')

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
  const maxSourceValue = Math.max(...sourceSlices.map(slice => slice.value), 0)
  const sourceTopLabel = sourceSlices.find(slice => slice.value === maxSourceValue)?.label ?? 'No data'

  const applications30d = useMemo(() => countApplicationsInWindows(allApplications, 30), [allApplications])
  const openJobsCreated30d = useMemo(() => countOpenJobsCreatedInWindows(jobs, 30), [jobs])
  const interviews30d = useMemo(() => countInterviewsScheduledInWindows(interviews, 30), [interviews])
  const offers30d = useMemo(() => countOffersInWindows(allApplications, 30), [allApplications])

  const candidatesTrend = trendFromPeriods(applications30d.current, applications30d.previous)
  const jobsTrend = trendFromPeriods(openJobsCreated30d.current, openJobsCreated30d.previous)
  const interviewsTrend = trendFromPeriods(interviews30d.current, interviews30d.previous)
  const offersTrend = trendFromPeriods(offers30d.current, offers30d.previous)

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

  const funnelCounts = useMemo(() => {
    const tally: Record<string, number> = {}
    for (const stage of PIPELINE_FUNNEL_ORDER) tally[stage] = 0
    for (const a of allApplications) {
      if (tally[a.status] != null) tally[a.status] += 1
    }
    return PIPELINE_FUNNEL_ORDER.map(stage => ({
      key: stage,
      label: formatDashboardLabel(stage),
      value: tally[stage] ?? 0,
    }))
  }, [allApplications])

  const funnelHasData = funnelCounts.some(c => c.value > 0)

  const funnelBarData = useMemo(
    () => ({
      labels: funnelCounts.map(c => c.label),
      datasets: [
        {
          label: 'Candidates',
          data: funnelCounts.map(c => c.value),
          backgroundColor: ['#bae6fd', '#7dd3fc', '#38bdf8', '#0ea5e9', '#0369a1'],
          borderRadius: 8,
          maxBarThickness: 28,
        },
      ],
    }),
    [funnelCounts],
  )

  const funnelBarOptions: ChartOptions<'bar'> = {
    ...dashboardBarOptions,
    indexAxis: 'y',
    scales: {
      ...dashboardBarOptions.scales,
      x: {
        beginAtZero: true,
        ticks: { color: '#64748b', font: { size: 11 } },
        grid: { color: 'rgba(148,163,184,0.22)' },
      },
      y: {
        ticks: { color: '#64748b', font: { size: 11 } },
        grid: { display: false },
      },
    },
  }

  const jobDistribution = useMemo(() => {
    const byJob: Record<number, number> = {}
    for (const a of allApplications) {
      byJob[a.job_id] = (byJob[a.job_id] ?? 0) + 1
    }
    const rows = jobs
      .map(job => ({ job, n: byJob[job.id] ?? 0 }))
      .filter(r => r.n > 0)
      .sort((a, b) => b.n - a.n)
      .slice(0, 10)
    return rows
  }, [allApplications, jobs])

  const jobBarData = useMemo(
    () => ({
      labels: jobDistribution.map(r => (r.job.title.length > 28 ? `${r.job.title.slice(0, 26)}…` : r.job.title)),
      datasets: [
        {
          label: 'Applicants',
          data: jobDistribution.map(r => r.n),
          backgroundColor: '#0ea5e9',
          borderRadius: 8,
          maxBarThickness: 32,
        },
      ],
    }),
    [jobDistribution],
  )

  const workspaceLineData = useMemo(
    () => ({
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
    }),
    [monthlyTrend],
  )

  const workspacePieData = useMemo(
    () => ({
      labels: workspaceSourceSlices.map(s => s.label),
      datasets: [
        {
          data: workspaceSourceSlices.map(s => s.value),
          backgroundColor: workspaceSourceSlices.map(s => s.color),
          borderColor: '#ffffff',
          borderWidth: 2,
        },
      ],
    }),
    [workspaceSourceSlices],
  )

  const activityItems = useMemo(
    () => buildDashboardActivity(allApplications, interviews, jobs, 16),
    [allApplications, interviews, jobs],
  )

  const appsByJobId = useMemo(() => {
    const m = new Map<number, Application[]>()
    for (const a of allApplications) {
      const list = m.get(a.job_id) ?? []
      list.push(a)
      m.set(a.job_id, list)
    }
    return m
  }, [allApplications])

  const jobsTableRows = useMemo(
    () =>
      [...jobs].sort((a, b) => a.title.localeCompare(b.title)).map(job => ({
        job,
        applicants: appsByJobId.get(job.id)?.length ?? 0,
        stage: dominantApplicantStage(appsByJobId.get(job.id) ?? []),
      })),
    [jobs, appsByJobId],
  )

  const summaryLoading = jobsLoading || applicationsLoading

  const totalOffersWorkspace = allApplications.filter(a => a.status === 'offer').length

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
            Pipeline health, sourcing, and hiring outcomes across your workspace — refine a role below for job-level detail.
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
        </div>
      </div>

      <div className="dashboard-summary-grid" role="region" aria-label="Workspace summary">
        <DashboardSummaryCard
          title="Total candidates"
          value={totalApplicantsAcrossJobs}
          icon={summaryIcons.candidates}
          trendDirection={candidatesTrend.direction}
          trendLabel={candidatesTrend.label}
          trendHint="New applications vs prior 30 days"
          primary
          loading={summaryLoading}
        />
        <DashboardSummaryCard
          title="Active jobs"
          value={openJobs}
          icon={summaryIcons.jobs}
          trendDirection={jobsTrend.direction}
          trendLabel={jobsTrend.label}
          trendHint="Open roles first published vs prior 30 days"
          loading={summaryLoading}
        />
        <DashboardSummaryCard
          title="Interviews scheduled"
          value={workspaceUpcomingInterviews}
          icon={summaryIcons.interviews}
          trendDirection={interviewsTrend.direction}
          trendLabel={interviewsTrend.label}
          trendHint="Interviews scheduled (by date) vs prior 30 days"
          loading={summaryLoading || interviewsLoading}
        />
        <DashboardSummaryCard
          title="Offers released"
          value={totalOffersWorkspace}
          icon={summaryIcons.offers}
          trendDirection={offersTrend.direction}
          trendLabel={offersTrend.label}
          trendHint="Offers (by update) vs prior 30 days"
          loading={summaryLoading}
        />
      </div>

      <section className="dashboard-workspace-charts" aria-label="Workspace analytics">
        <header className="dashboard-section-header">
          <h3 className="dashboard-section-title">Workspace analytics</h3>
          <p className="dashboard-section-lead">Cross-role trends from live application and interview data.</p>
        </header>
        <div className="dashboard-workspace-grid">
          <DashboardPanel title="Pipeline funnel">
            <div className="dashboard-panel-content">
              {!funnelHasData ? (
                <div className="dashboard-empty">No pipeline data yet.</div>
              ) : (
                <div className="dashboard-chart-shell dashboard-chart-shell-funnel">
                  <Bar data={funnelBarData} options={funnelBarOptions} />
                </div>
              )}
            </div>
          </DashboardPanel>

          <DashboardPanel title="Applications over time">
            <div className="dashboard-panel-content">
              {monthlyTrend.every(item => item.value === 0) ? (
                <div className="dashboard-empty">No recent application activity yet.</div>
              ) : (
                <div className="dashboard-chart-shell dashboard-chart-shell-short">
                  <Line data={workspaceLineData} options={dashboardLineOptions} />
                </div>
              )}
              <p className="dashboard-chart-caption">Last 6 months · {monthlyDeltaLabel} vs last month</p>
            </div>
          </DashboardPanel>

          <DashboardPanel title="Applicants by job">
            <div className="dashboard-panel-content">
              {jobDistribution.length === 0 ? (
                <div className="dashboard-empty">No applicants assigned to jobs yet.</div>
              ) : (
                <div className="dashboard-chart-shell dashboard-chart-shell-short">
                  <Bar data={jobBarData} options={dashboardBarOptions} />
                </div>
              )}
            </div>
          </DashboardPanel>

          <DashboardPanel title="Source of candidates">
            <div className="dashboard-panel-content">
              {workspaceSourceSlices.length === 0 ? (
                <div className="dashboard-empty">No source data yet.</div>
              ) : (
                <>
                  <div className="dashboard-chart-shell dashboard-chart-shell-pie">
                    <Pie data={workspacePieData} options={dashboardPieOptions} />
                  </div>
                  <div className="dashboard-insight-row">
                    <div className="dashboard-insight-card">
                      <strong>{workspaceSourceSlices[0]?.label ?? '—'}</strong>
                      <span>Leading channel</span>
                    </div>
                    <div className="dashboard-insight-card">
                      <strong>{workspaceSourceSlices.length}</strong>
                      <span>Distinct sources</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </DashboardPanel>
        </div>
      </section>

      <div className="dashboard-two-col">
        <DashboardPanel title="Recent activity">
          <div className="dashboard-panel-content dashboard-panel-content--flush">
            <DashboardActivityFeed
              items={activityItems}
              accountId={accountId}
              loading={applicationsLoading || interviewsLoading}
            />
          </div>
        </DashboardPanel>

        <DashboardPanel title="Jobs overview">
          <div className="dashboard-panel-content dashboard-panel-content--table">
            {jobsLoading ? (
              <LoadingRow />
            ) : jobsError ? (
              <ErrorRow msg={jobsError} />
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
                    </tr>
                  </thead>
                  <tbody>
                    {jobsTableRows.map(({ job, applicants, stage }) => (
                      <tr key={job.id}>
                        <td>
                          <Link className="dashboard-table-link" to={`/account/${accountId}/jobs/${job.id}/edit`}>
                            {job.title}
                          </Link>
                        </td>
                        <td>
                          <span className={`tag ${STAGE_COLORS[job.status] ?? 'tag-blue'}`}>{formatDashboardLabel(job.status)}</span>
                        </td>
                        <td>{applicants}</td>
                        <td>{stage}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </DashboardPanel>
      </div>

      <div className="dashboard-grid">
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
              <LoadingRow />
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
                    options={dashboardBarOptions}
                  />
                </div>
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

        <DashboardPanel title="Application Trend (Last 6 Months)">
          <div className="dashboard-panel-content">
            {monthlyTrend.every(item => item.value === 0) ? (
              <div className="dashboard-empty">No recent application activity yet.</div>
            ) : (
              <div className="dashboard-chart-shell dashboard-chart-shell-short">
                <Line
                  data={{
                    labels: monthlyTrend.map(item => item.label),
                    datasets: [
                      {
                        data: monthlyTrend.map(item => item.value),
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59,130,246,0.18)',
                        borderWidth: 2,
                        pointRadius: 4,
                        pointHoverRadius: 5,
                        pointBackgroundColor: '#ffffff',
                        pointBorderColor: '#3b82f6',
                        pointBorderWidth: 2,
                        fill: true,
                        tension: 0.32,
                      },
                    ],
                  }}
                  options={dashboardLineOptions}
                />
              </div>
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
      </div>
    </>
  )
}

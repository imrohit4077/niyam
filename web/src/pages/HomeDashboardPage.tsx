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
  PointElement,
  Tooltip,
  type ChartOptions,
} from 'chart.js'
import { Bar, Doughnut, Line, Pie } from 'react-chartjs-2'
import type { DashboardOutletContext } from '../layouts/DashboardOutletContext'
import { jobsApi, type Job } from '../api/jobs'
import { applicationsApi, type Application } from '../api/applications'
import { interviewsApi, type InterviewAssignmentRow } from '../api/interviews'
import { DashboardStatCard, type StatTrend } from '../components/dashboard/DashboardStatCard'
import { DashboardChartSkeleton, DashboardKpiSkeleton, DashboardPanelSkeleton } from '../components/dashboard/DashboardSkeleton'
import { periodTrend } from '../components/dashboard/dashboardUtils'

/* eslint-disable react-hooks/set-state-in-effect -- data-fetch effects set loading flags before awaiting APIs */
const MS_30D = 30 * 24 * 60 * 60 * 1000

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

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler)

const PIPELINE_FUNNEL_STAGES = ['applied', 'screening', 'interview', 'offer', 'hired'] as const

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

function summarizeStageForJob(jobId: number, applications: Application[]): string {
  const forJob = applications.filter(a => a.job_id === jobId)
  if (forJob.length === 0) return '—'
  const counts = forJob.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1
    return acc
  }, {})
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
  return top ? formatDashboardLabel(top[0]) : '—'
}

function trendFromDelta(delta: number, pct: number | null): StatTrend {
  const direction: StatTrend['direction'] = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'
  return { direction, pct, label: 'vs prior 30d' }
}

type ActivityKind = 'application' | 'interview' | 'offer' | 'hired' | 'other'

type ActivityItem = {
  id: string
  kind: ActivityKind
  title: string
  subtitle: string
  at: string
}

function buildActivityFeed(
  applications: Application[],
  interviewRows: InterviewAssignmentRow[],
  limit: number,
): ActivityItem[] {
  const fromApps: ActivityItem[] = applications.map(a => {
    let kind: ActivityKind = 'application'
    if (a.status === 'hired') kind = 'hired'
    else if (a.status === 'offer') kind = 'offer'
    const title =
      kind === 'hired'
        ? 'Candidate hired'
        : kind === 'offer'
          ? 'Offer stage'
          : 'Candidate added'
    return {
      id: `app-${a.id}-${a.updated_at}`,
      kind,
      title,
      subtitle: `${a.candidate_name || a.candidate_email} · application`,
      at: a.updated_at,
    }
  })
  const fromInterviews: ActivityItem[] = interviewRows.map(row => ({
    id: `int-${row.id}-${row.updated_at}`,
    kind: 'interview' as const,
    title: row.scheduled_at ? 'Interview scheduled' : 'Interview updated',
    subtitle: `${row.application?.candidate_name || row.application?.candidate_email || 'Candidate'} · ${row.job?.title ?? 'Job'}`,
    at: row.scheduled_at || row.updated_at,
  }))
  return [...fromApps, ...fromInterviews]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, limit)
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
  /** Fixed anchor for 30d trend windows (avoids impure Date.now inside memo; refreshes on navigation/remount). */
  const [trendAnchorMs] = useState(() => Date.now())

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
  const workspaceHireRate =
    totalApplicantsAcrossJobs > 0 ? Math.round((totalHiredCandidates / totalApplicantsAcrossJobs) * 100) : 0
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
  const maxSourceValue = Math.max(...sourceSlices.map(slice => slice.value), 0)
  const sourceTopLabel = sourceSlices.find(slice => slice.value === maxSourceValue)?.label ?? 'No data'

  const workspace30dBuckets = useMemo(() => {
    const now = trendAnchorMs
    const startCur = now - MS_30D
    const startPrev = now - 2 * MS_30D
    const inCreatedRange = (iso: string, start: number, end: number) => {
      const t = new Date(iso).getTime()
      return t >= start && t < end
    }
    const appsCreatedCur = allApplications.filter(a => inCreatedRange(a.created_at, startCur, now)).length
    const appsCreatedPrev = allApplications.filter(a => inCreatedRange(a.created_at, startPrev, startCur)).length
    const jobsCreatedCur = jobs.filter(j => inCreatedRange(j.created_at, startCur, now)).length
    const jobsCreatedPrev = jobs.filter(j => inCreatedRange(j.created_at, startPrev, startCur)).length
    const intScheduledCur = interviews.filter(row => {
      if (!row.scheduled_at) return false
      return inCreatedRange(row.scheduled_at, startCur, now)
    }).length
    const intScheduledPrev = interviews.filter(row => {
      if (!row.scheduled_at) return false
      return inCreatedRange(row.scheduled_at, startPrev, startCur)
    }).length
    const offersCur = allApplications.filter(
      a => a.status === 'offer' && inCreatedRange(a.updated_at, startCur, now),
    ).length
    const offersPrev = allApplications.filter(
      a => a.status === 'offer' && inCreatedRange(a.updated_at, startPrev, startCur),
    ).length
    return {
      appsCreatedCur,
      appsCreatedPrev,
      jobsCreatedCur,
      jobsCreatedPrev,
      intScheduledCur,
      intScheduledPrev,
      offersCur,
      offersPrev,
    }
  }, [allApplications, jobs, interviews, trendAnchorMs])

  const funnelStageCounts = useMemo(() => {
    const acc: Record<string, number> = {}
    PIPELINE_FUNNEL_STAGES.forEach(s => {
      acc[s] = 0
    })
    allApplications.forEach(a => {
      const key = PIPELINE_FUNNEL_STAGES.includes(a.status as (typeof PIPELINE_FUNNEL_STAGES)[number])
        ? a.status
        : null
      if (key) acc[key] = (acc[key] ?? 0) + 1
    })
    return PIPELINE_FUNNEL_STAGES.map(stage => ({
      stage,
      label: formatDashboardLabel(stage),
      count: acc[stage] ?? 0,
    }))
  }, [allApplications])

  const jobWiseApplicantCounts = useMemo(() => {
    const byJob = allApplications.reduce<Record<number, number>>((acc, a) => {
      acc[a.job_id] = (acc[a.job_id] ?? 0) + 1
      return acc
    }, {})
    return jobs
      .map(job => ({ job, count: byJob[job.id] ?? 0 }))
      .filter(row => row.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
  }, [allApplications, jobs])

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

  const activityFeed = useMemo(
    () => buildActivityFeed(allApplications, interviews, 12),
    [allApplications, interviews],
  )

  const totalOffersWorkspace = allApplications.filter(a => a.status === 'offer').length

  const { delta: candDelta, pct: candPct } = periodTrend(
    workspace30dBuckets.appsCreatedCur,
    workspace30dBuckets.appsCreatedPrev,
  )
  const trendCandidates = trendFromDelta(candDelta, candPct)

  const { delta: jobDelta, pct: jobPct } = periodTrend(
    workspace30dBuckets.jobsCreatedCur,
    workspace30dBuckets.jobsCreatedPrev,
  )
  const trendJobsPosted = trendFromDelta(jobDelta, jobPct)

  const { delta: intDelta, pct: intPct } = periodTrend(
    workspace30dBuckets.intScheduledCur,
    workspace30dBuckets.intScheduledPrev,
  )
  const trendInterviews = trendFromDelta(intDelta, intPct)

  const { delta: offDelta, pct: offPct } = periodTrend(workspace30dBuckets.offersCur, workspace30dBuckets.offersPrev)
  const trendOffers = trendFromDelta(offDelta, offPct)
  const barOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: {
        ticks: { color: '#6b7280', font: { size: 11 } },
        grid: { display: false },
      },
      y: {
        beginAtZero: true,
        ticks: { color: '#6b7280', precision: 0, font: { size: 11 } },
        grid: { color: 'rgba(148,163,184,0.22)' },
      },
    },
  }
  const lineOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: {
        ticks: { color: '#6b7280', font: { size: 11 } },
        grid: { display: false },
      },
      y: {
        beginAtZero: true,
        ticks: { color: '#6b7280', precision: 0, font: { size: 11 } },
        grid: { color: 'rgba(148,163,184,0.22)' },
      },
    },
  }
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
            <strong>
              {workspaceHireRate >= 25 ? 'Strong' : workspaceHireRate >= 10 ? 'Stable' : 'Needs Attention'}
            </strong>
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

      {jobsLoading || applicationsLoading ? (
        <DashboardKpiSkeleton />
      ) : (
        <div className="dashboard-stat-grid">
          <DashboardStatCard
            primary
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            }
            label="Total candidates"
            value={totalApplicantsAcrossJobs}
            hint={`${openJobs} open jobs · ${avgApplicantsPerJob} avg / job`}
            trend={trendCandidates}
          />
          <DashboardStatCard
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                <rect x="2" y="7" width="20" height="14" rx="2" />
                <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
                <path d="M12 12v.01" />
              </svg>
            }
            label="Active jobs"
            value={openJobs}
            hint={`${jobs.length} total requisitions`}
            trend={trendJobsPosted}
          />
          <DashboardStatCard
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
            }
            label="Interviews scheduled"
            value={workspaceUpcomingInterviews}
            hint={`${scheduledInterviews} in selected job scope`}
            trend={trendInterviews}
          />
          <DashboardStatCard
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            }
            label="Offers released"
            value={totalOffersWorkspace}
            hint="Candidates currently in offer"
            trend={trendOffers}
          />
        </div>
      )}

      <div className="dashboard-analytics-grid">
        <section className="dashboard-analytics-card dashboard-analytics-card--funnel">
          <header className="dashboard-analytics-card-header">
            <h3 className="dashboard-analytics-card-title">Pipeline funnel</h3>
            <p className="dashboard-analytics-card-desc">Applied → Screening → Interview → Offer → Hired (workspace)</p>
          </header>
          <div className="dashboard-analytics-card-body">
            {applicationsLoading ? (
              <DashboardChartSkeleton />
            ) : funnelStageCounts.every(s => s.count === 0) ? (
              <div className="dashboard-empty">No applications in funnel stages yet.</div>
            ) : (
              <div className="dashboard-chart-shell dashboard-chart-shell-funnel">
                <Bar
                  data={{
                    labels: funnelStageCounts.map(s => s.label),
                    datasets: [
                      {
                        label: 'Candidates',
                        data: funnelStageCounts.map(s => s.count),
                        backgroundColor: funnelStageCounts.map(
                          (_, i) => DASHBOARD_CHART_COLORS[i % DASHBOARD_CHART_COLORS.length],
                        ),
                        borderRadius: 6,
                        maxBarThickness: 28,
                      },
                    ],
                  }}
                  options={{
                    ...barOptions,
                    indexAxis: 'y',
                    scales: {
                      x: {
                        beginAtZero: true,
                        ticks: { color: '#6b7280', font: { size: 11 } },
                        grid: { color: 'rgba(148,163,184,0.22)' },
                      },
                      y: {
                        ticks: { color: '#6b7280', font: { size: 11 } },
                        grid: { display: false },
                      },
                    },
                  }}
                />
              </div>
            )}
          </div>
        </section>

        <section className="dashboard-analytics-card dashboard-analytics-card--trend">
          <header className="dashboard-analytics-card-header">
            <h3 className="dashboard-analytics-card-title">Applications over time</h3>
            <p className="dashboard-analytics-card-desc">New applications by month (last 6 months)</p>
          </header>
          <div className="dashboard-analytics-card-body">
            {applicationsLoading ? (
              <DashboardChartSkeleton short />
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
                        backgroundColor: 'rgba(14,165,233,0.12)',
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
                  options={lineOptions}
                />
              </div>
            )}
          </div>
        </section>

        <section className="dashboard-analytics-card dashboard-analytics-card--bar">
          <header className="dashboard-analytics-card-header">
            <h3 className="dashboard-analytics-card-title">Candidates by job</h3>
            <p className="dashboard-analytics-card-desc">Top roles by applicant volume</p>
          </header>
          <div className="dashboard-analytics-card-body">
            {applicationsLoading || jobsLoading ? (
              <DashboardChartSkeleton short />
            ) : jobWiseApplicantCounts.length === 0 ? (
              <div className="dashboard-empty">No applicants mapped to jobs yet.</div>
            ) : (
              <div className="dashboard-chart-shell dashboard-chart-shell-short">
                <Bar
                  data={{
                    labels: jobWiseApplicantCounts.map(row => row.job.title),
                    datasets: [
                      {
                        data: jobWiseApplicantCounts.map(row => row.count),
                        backgroundColor: '#3b82f6',
                        borderRadius: 8,
                        maxBarThickness: 36,
                      },
                    ],
                  }}
                  options={barOptions}
                />
              </div>
            )}
          </div>
        </section>

        <section className="dashboard-analytics-card dashboard-analytics-card--pie">
          <header className="dashboard-analytics-card-header">
            <h3 className="dashboard-analytics-card-title">Source of candidates</h3>
            <p className="dashboard-analytics-card-desc">All applications · source type</p>
          </header>
          <div className="dashboard-analytics-card-body">
            {applicationsLoading ? (
              <DashboardChartSkeleton short />
            ) : workspaceSourceSlices.length === 0 ? (
              <div className="dashboard-empty">No source data yet.</div>
            ) : (
              <div className="dashboard-chart-shell dashboard-chart-shell-short">
                <Pie
                  data={{
                    labels: workspaceSourceSlices.map(s => s.label),
                    datasets: [
                      {
                        data: workspaceSourceSlices.map(s => s.value),
                        backgroundColor: workspaceSourceSlices.map(s => s.color),
                        borderColor: '#ffffff',
                        borderWidth: 2,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'bottom',
                        labels: { boxWidth: 10, usePointStyle: true, pointStyle: 'circle', font: { size: 11 } },
                      },
                    },
                  }}
                />
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="dashboard-grid">
        <section className="panel dashboard-panel dashboard-modern-panel dashboard-panel-span-12 dashboard-jobs-overview-panel">
          <div className="panel-header dashboard-modern-panel-header">
            <span className="panel-header-title">Jobs overview</span>
          </div>
          <div className="panel-body dashboard-modern-panel-body">
            <div className="dashboard-panel-content dashboard-panel-content--flush">
              {jobsLoading ? (
                <DashboardPanelSkeleton rows={5} />
              ) : jobsError ? (
                <ErrorRow msg={jobsError} />
              ) : jobs.length === 0 ? (
                <div className="dashboard-empty">No jobs yet. Create a requisition to get started.</div>
              ) : (
                <div className="dashboard-table-wrap">
                  <table className="dashboard-jobs-table">
                    <thead>
                      <tr>
                        <th scope="col">Job title</th>
                        <th scope="col">Status</th>
                        <th scope="col">Applicants</th>
                        <th scope="col">Top stage</th>
                        <th scope="col" className="dashboard-jobs-table-actions">
                          {/* actions */}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {jobs.map(job => {
                        const applicants = allApplications.filter(a => a.job_id === job.id).length
                        return (
                          <tr key={job.id}>
                            <td>
                              <button
                                type="button"
                                className="dashboard-table-job-link"
                                onClick={() => setSelectedJobId(String(job.id))}
                              >
                                {job.title}
                              </button>
                            </td>
                            <td>
                              <span className={`tag ${STAGE_COLORS[job.status] ?? 'tag-gray'}`}>{formatDashboardLabel(job.status)}</span>
                            </td>
                            <td>{applicants}</td>
                            <td>{summarizeStageForJob(job.id, allApplications)}</td>
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
              )}
            </div>
          </div>
        </section>

        <section className="panel dashboard-panel dashboard-modern-panel dashboard-panel-span-6 dashboard-activity-panel">
          <div className="panel-header dashboard-modern-panel-header">
            <span className="panel-header-title">Activity</span>
          </div>
          <div className="panel-body dashboard-modern-panel-body">
            <div className="dashboard-panel-content">
              {applicationsLoading && interviewsLoading ? (
                <DashboardPanelSkeleton rows={6} />
              ) : activityFeed.length === 0 ? (
                <div className="dashboard-empty">No recent candidate or interview activity.</div>
              ) : (
                <ul className="dashboard-activity-list">
                  {activityFeed.map(item => (
                    <li key={item.id} className={`dashboard-activity-item dashboard-activity-item--${item.kind}`}>
                      <span className="dashboard-activity-dot" aria-hidden />
                      <div className="dashboard-activity-body">
                        <strong>{item.title}</strong>
                        <span>{item.subtitle}</span>
                      </div>
                      <time className="dashboard-activity-time" dateTime={item.at}>
                        {new Date(item.at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </time>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>

        <DashboardPanel title="Jobs By Status">
          <div className="dashboard-panel-content">
            {jobsLoading ? (
              <DashboardPanelSkeleton rows={5} />
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
              <DashboardChartSkeleton />
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

        <DashboardPanel title="Applicant Sources (Selected Job)">
          <div className="dashboard-panel-content">
            {analyticsLoading ? (
              <DashboardChartSkeleton short />
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
                    options={barOptions}
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

        <DashboardPanel title="Upcoming Interviews (Selected Scope)">
          <div className="dashboard-panel-content">
            {interviewsLoading ? (
              <DashboardPanelSkeleton rows={4} />
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

/* eslint-enable react-hooks/set-state-in-effect */

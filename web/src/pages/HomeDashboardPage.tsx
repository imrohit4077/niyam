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
  PointElement,
  Tooltip,
  type ChartOptions,
} from 'chart.js'
import { Bar, Doughnut, Line } from 'react-chartjs-2'
import type { DashboardOutletContext } from '../layouts/DashboardOutletContext'
import { jobsApi, type Job } from '../api/jobs'
import { applicationsApi, type Application } from '../api/applications'
import { interviewsApi, type InterviewAssignmentRow } from '../api/interviews'
import { DashboardPanel } from '../components/dashboard/DashboardPanel'
import { DashboardSummaryCard } from '../components/dashboard/DashboardSummaryCard'
import {
  computePercentChange,
  formatDashboardLabel,
  formatDateTimeShort,
  formatRelativeTime,
} from '../components/dashboard/dashboardUtils'

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

const FUNNEL_STAGES = ['applied', 'screening', 'interview', 'offer', 'hired'] as const

type DashboardSlice = {
  key: string
  label: string
  value: number
  color: string
}

type PipelineModalKind = 'applicants' | 'interviews' | 'offers' | 'hired'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler)

function daysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function inTimeRange(iso: string, startMs: number, endMs: number) {
  const t = new Date(iso).getTime()
  return t >= startMs && t < endMs
}

function SkeletonPulse({ className }: { className?: string }) {
  return <span className={`dashboard-skeleton-pulse ${className ?? ''}`} />
}

function DashboardChartSkeleton({ short }: { short?: boolean }) {
  return (
    <div className={`dashboard-chart-shell ${short ? 'dashboard-chart-shell-short' : ''} dashboard-chart-skeleton-wrap`}>
      <SkeletonPulse className="dashboard-chart-skeleton-blob" />
    </div>
  )
}

function LoadingRow() {
  return (
    <div className="dashboard-loading-row">
      <div className="spinner dashboard-loading-spinner" />
      <span>Loading…</span>
    </div>
  )
}

function ErrorRow({ msg }: { msg: string }) {
  return (
    <div className="dashboard-error-row">
      {msg}
    </div>
  )
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

function trendLabelFromChange(pct: number, direction: 'up' | 'down' | 'flat' | 'neutral') {
  if (direction === 'neutral') return '—'
  if (direction === 'flat') return '0%'
  const sign = pct > 0 ? '+' : ''
  return `${sign}${pct}%`
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

type ActivityItem = {
  id: string
  title: string
  subtitle: string
  at: string
  tone: 'candidate' | 'interview' | 'offer' | 'job'
}

function activityToneClass(tone: ActivityItem['tone']) {
  switch (tone) {
    case 'interview':
      return 'dashboard-activity-dot--interview'
    case 'offer':
      return 'dashboard-activity-dot--offer'
    case 'job':
      return 'dashboard-activity-dot--job'
    default:
      return 'dashboard-activity-dot--candidate'
  }
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
  /** Stable "as of" time for trend windows so render stays pure for eslint. */
  const [trendAnchorMs] = useState(() => Date.now())

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
        setAnalyticsLoading(false)
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

  const workspaceFunnel = useMemo(() => {
    const base = FUNNEL_STAGES.reduce<Record<string, number>>((acc, s) => {
      acc[s] = 0
      return acc
    }, {})
    allApplications.forEach(app => {
      if (app.status in base) base[app.status] += 1
    })
    return FUNNEL_STAGES.map(stage => ({
      stage,
      label: formatDashboardLabel(stage),
      value: base[stage] ?? 0,
    }))
  }, [allApplications])

  const funnelMax = Math.max(...workspaceFunnel.map(f => f.value), 1)

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

  const applicantsByJob = useMemo(() => {
    const map = allApplications.reduce<Record<number, number>>((acc, app) => {
      acc[app.job_id] = (acc[app.job_id] ?? 0) + 1
      return acc
    }, {})
    return jobs
      .map(job => ({ job, count: map[job.id] ?? 0 }))
      .filter(row => row.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
  }, [allApplications, jobs])

  const jobTitleById = useMemo(() => {
    const m = new Map<number, string>()
    jobs.forEach(j => m.set(j.id, j.title))
    return m
  }, [jobs])

  const activityFeed = useMemo((): ActivityItem[] => {
    const fromApps: ActivityItem[] = allApplications.map(app => {
      const jobTitle = jobTitleById.get(app.job_id) ?? `Job #${app.job_id}`
      let tone: ActivityItem['tone'] = 'candidate'
      if (app.status === 'offer') tone = 'offer'
      else if (app.status === 'interview') tone = 'interview'
      return {
        id: `app-${app.id}`,
        title: `${app.candidate_name || app.candidate_email} · ${formatDashboardLabel(app.status)}`,
        subtitle: jobTitle,
        at: app.updated_at,
        tone,
      }
    })
    const fromInterviews: ActivityItem[] = interviews.map(row => ({
      id: `int-${row.id}`,
      title: `Interview ${formatDashboardLabel(row.status)}`,
      subtitle:
        row.application?.candidate_name ||
        row.application?.candidate_email ||
        row.job?.title ||
        'Interview',
      at: row.updated_at,
      tone: 'interview' as const,
    }))
    return [...fromApps, ...fromInterviews].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 12)
  }, [allApplications, interviews, jobTitleById])

  const win0 = daysAgo(30)
  const win1 = daysAgo(60)
  const appsLast30 = allApplications.filter(a => inTimeRange(a.created_at, win0, trendAnchorMs + 1)).length
  const appsPrev30 = allApplications.filter(a => inTimeRange(a.created_at, win1, win0)).length
  const candTrend = computePercentChange(appsLast30, appsPrev30)

  const jobsLast30 = jobs.filter(j => inTimeRange(j.created_at, win0, trendAnchorMs + 1)).length
  const jobsPrev30 = jobs.filter(j => inTimeRange(j.created_at, win1, win0)).length
  const jobsTrend = computePercentChange(jobsLast30, jobsPrev30)

  const intLast30 = interviews.filter(i => inTimeRange(i.created_at, win0, trendAnchorMs + 1)).length
  const intPrev30 = interviews.filter(i => inTimeRange(i.created_at, win1, win0)).length
  const intTrend = computePercentChange(intLast30, intPrev30)

  const offersWorkspace = allApplications.filter(a => a.status === 'offer').length
  const offersLast30 = allApplications.filter(
    a => a.status === 'offer' && inTimeRange(a.updated_at, win0, trendAnchorMs + 1),
  ).length
  const offersPrev30 = allApplications.filter(
    a => a.status === 'offer' && inTimeRange(a.updated_at, win1, win0),
  ).length
  const offerTrend = computePercentChange(offersLast30, offersPrev30)

  const summaryLoading = jobsLoading || applicationsLoading

  const primaryBrand = '#0ea5e9'

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
            Pipeline velocity, sourcing, and scheduling in one place — tuned for how recruiting teams work day to day.
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

      <div className="dashboard-summary-grid">
        {summaryLoading ? (
          <>
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="dashboard-summary-card dashboard-summary-card--skeleton">
                <SkeletonPulse className="dashboard-summary-skel-icon" />
                <SkeletonPulse className="dashboard-summary-skel-line dashboard-summary-skel-line--sm" />
                <SkeletonPulse className="dashboard-summary-skel-line dashboard-summary-skel-line--lg" />
                <SkeletonPulse className="dashboard-summary-skel-line dashboard-summary-skel-line--md" />
              </div>
            ))}
          </>
        ) : (
          <>
            <DashboardSummaryCard
              highlight
              label="Total Candidates"
              value={totalApplicantsAcrossJobs}
              subtitle="All applications across jobs"
              trend={{
                direction: candTrend.direction,
                label: trendLabelFromChange(candTrend.pct, candTrend.direction),
              }}
              icon={
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0ZM4 20a8 8 0 0 1 16 0"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                  />
                </svg>
              }
            />
            <DashboardSummaryCard
              label="Active Jobs"
              value={openJobs}
              subtitle={`${jobs.length} total listings`}
              trend={{
                direction: jobsTrend.direction,
                label: trendLabelFromChange(jobsTrend.pct, jobsTrend.direction),
              }}
              icon={
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M6 7h12v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7Z"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinejoin="round"
                  />
                </svg>
              }
            />
            <DashboardSummaryCard
              label="Interviews Scheduled"
              value={workspaceUpcomingInterviews}
              subtitle="Upcoming on your calendar"
              trend={{
                direction: intTrend.direction,
                label: trendLabelFromChange(intTrend.pct, intTrend.direction),
              }}
              icon={
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="1.7" />
                  <path d="M8 3v4M16 3v4M4 11h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                </svg>
              }
            />
            <DashboardSummaryCard
              label="Offers Released"
              value={offersWorkspace}
              subtitle="Candidates in offer stage"
              trend={{
                direction: offerTrend.direction,
                label: trendLabelFromChange(offerTrend.pct, offerTrend.direction),
              }}
              icon={
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M12 3l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V7l8-4Z"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinejoin="round"
                  />
                  <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              }
            />
          </>
        )}
      </div>

      <div className="dashboard-secondary-strip">
        <div className="dashboard-secondary-metric">
          <span>MoM applications</span>
          <strong>{monthlyDeltaLabel}</strong>
          <small>
            {currentMonthApplications} this month vs {previousMonthApplications} last
          </small>
        </div>
        <div className="dashboard-secondary-metric">
          <span>Hired (all jobs)</span>
          <strong>{totalHiredCandidates}</strong>
          <small>{openingFillRate}% fill rate vs openings</small>
        </div>
        <div className="dashboard-secondary-metric">
          <span>Selected job conversion</span>
          <strong>{conversionRate}%</strong>
          <small>{scheduledInterviews} upcoming interviews in scope</small>
        </div>
      </div>

      <div className="dashboard-grid dashboard-grid--charts">
        <DashboardPanel title="Candidates Pipeline (Workspace)">
          <div className="dashboard-panel-content">
            {applicationsLoading ? (
              <DashboardChartSkeleton />
            ) : workspaceFunnel.every(f => f.value === 0) ? (
              <div className="dashboard-empty">No pipeline data yet.</div>
            ) : (
              <div className="dashboard-funnel">
                {workspaceFunnel.map((step, idx) => (
                  <div key={step.stage} className="dashboard-funnel-row">
                    <div className="dashboard-funnel-label">
                      <span className="dashboard-funnel-step">{idx + 1}</span>
                      <div>
                        <strong>{step.label}</strong>
                        <span>{step.value.toLocaleString()} candidates</span>
                      </div>
                    </div>
                    <div className="dashboard-funnel-bar-track">
                      <div
                        className="dashboard-funnel-bar-fill"
                        style={{
                          width: `${Math.max(8, (step.value / funnelMax) * 100)}%`,
                          background: DASHBOARD_CHART_COLORS[idx % DASHBOARD_CHART_COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Applications Over Time">
          <div className="dashboard-panel-content">
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
                        borderColor: primaryBrand,
                        backgroundColor: 'rgba(14,165,233,0.15)',
                        borderWidth: 2,
                        pointRadius: 4,
                        pointHoverRadius: 5,
                        pointBackgroundColor: '#ffffff',
                        pointBorderColor: primaryBrand,
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
        </DashboardPanel>

        <DashboardPanel title="Applicants by Job">
          <div className="dashboard-panel-content">
            {applicationsLoading || jobsLoading ? (
              <DashboardChartSkeleton short />
            ) : applicantsByJob.length === 0 ? (
              <div className="dashboard-empty">No applicants yet.</div>
            ) : (
              <div className="dashboard-chart-shell dashboard-chart-shell-short">
                <Bar
                  data={{
                    labels: applicantsByJob.map(({ job }) => (job.title.length > 22 ? `${job.title.slice(0, 20)}…` : job.title)),
                    datasets: [
                      {
                        data: applicantsByJob.map(({ count }) => count),
                        backgroundColor: applicantsByJob.map((_, i) => DASHBOARD_CHART_COLORS[i % DASHBOARD_CHART_COLORS.length]),
                        borderRadius: 8,
                        maxBarThickness: 40,
                      },
                    ],
                  }}
                  options={barOptions}
                />
              </div>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Source of Candidates (Workspace)">
          <div className="dashboard-panel-content">
            {applicationsLoading ? (
              <DashboardChartSkeleton />
            ) : workspaceSourceSlices.length === 0 ? (
              <div className="dashboard-empty">No source data yet.</div>
            ) : (
              <DashboardDoughnutChart slices={workspaceSourceSlices} emptyLabel="No data" legendLabel="Sources" />
            )}
          </div>
        </DashboardPanel>
      </div>

      <div className="dashboard-grid dashboard-grid--split">
        <DashboardPanel title="Recent Activity">
          <div className="dashboard-panel-content dashboard-activity-panel">
            {applicationsLoading && interviewsLoading ? (
              <div className="dashboard-activity-skeleton">
                {[0, 1, 2, 3, 4].map(i => (
                  <div key={i} className="dashboard-activity-skeleton-row">
                    <SkeletonPulse className="dashboard-activity-skel-dot" />
                    <div>
                      <SkeletonPulse className="dashboard-summary-skel-line dashboard-summary-skel-line--md" />
                      <SkeletonPulse className="dashboard-summary-skel-line dashboard-summary-skel-line--sm" />
                    </div>
                  </div>
                ))}
              </div>
            ) : activityFeed.length === 0 ? (
              <div className="dashboard-empty">Activity will appear as your team recruits.</div>
            ) : (
              <ul className="dashboard-activity-list">
                {activityFeed.map(item => (
                  <li key={item.id} className="dashboard-activity-item">
                    <span className={`dashboard-activity-dot ${activityToneClass(item.tone)}`} />
                    <div className="dashboard-activity-body">
                      <div className="dashboard-activity-title">{item.title}</div>
                      <div className="dashboard-activity-meta">
                        <span>{item.subtitle}</span>
                        <time dateTime={item.at}>{formatRelativeTime(item.at)}</time>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Jobs Overview">
          <div className="dashboard-panel-content dashboard-jobs-table-wrap">
            {jobsLoading ? (
              <div className="dashboard-table-skeleton">
                {[0, 1, 2, 3, 4].map(i => (
                  <div key={i} className="dashboard-table-skeleton-row">
                    <SkeletonPulse className="dashboard-table-skel-cell" />
                    <SkeletonPulse className="dashboard-table-skel-cell dashboard-table-skel-cell--narrow" />
                    <SkeletonPulse className="dashboard-table-skel-cell dashboard-table-skel-cell--narrow" />
                    <SkeletonPulse className="dashboard-table-skel-cell dashboard-table-skel-cell--mid" />
                  </div>
                ))}
              </div>
            ) : jobsError ? (
              <ErrorRow msg={jobsError} />
            ) : jobs.length === 0 ? (
              <div className="dashboard-empty">Create a job to get started.</div>
            ) : (
              <div className="dashboard-table-scroll">
                <table className="dashboard-jobs-table">
                  <thead>
                    <tr>
                      <th>Job title</th>
                      <th>Status</th>
                      <th>Applicants</th>
                      <th>Focus stage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map(job => {
                      const count = allApplications.filter(a => a.job_id === job.id).length
                      const topStage = (() => {
                        const forJob = allApplications.filter(a => a.job_id === job.id)
                        if (forJob.length === 0) return '—'
                        const tally = forJob.reduce<Record<string, number>>((acc, a) => {
                          acc[a.status] = (acc[a.status] ?? 0) + 1
                          return acc
                        }, {})
                        const top = Object.entries(tally).sort((a, b) => b[1] - a[1])[0]
                        return top ? formatDashboardLabel(top[0]) : '—'
                      })()
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
                            <span className={`tag ${STAGE_COLORS[job.status] ?? 'tag-blue'}`}>{formatDashboardLabel(job.status)}</span>
                          </td>
                          <td>{count}</td>
                          <td>
                            <span className="dashboard-table-stage">{topStage}</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {!jobsLoading && jobs.length > 0 ? (
              <div className="dashboard-panel-footer dashboard-jobs-table-foot">
                <Link className="dashboard-link" to={`/account/${accountId}/jobs`}>
                  View all jobs
                </Link>
              </div>
            ) : null}
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
                <div className="dashboard-footnote">Select a role to refresh job-level analytics below.</div>
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

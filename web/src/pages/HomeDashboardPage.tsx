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
import DashboardSummaryCard from '../components/dashboard/DashboardSummaryCard'
import { formatTrendPercent, type TrendDirection } from '../components/dashboard/trendUtils'
import { IconBriefcase, IconCalendar, IconGift, IconUsers } from '../components/dashboard/dashboardIcons'

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
const FUNNEL_LABELS = ['Applied', 'Screening', 'Interview', 'Offer', 'Hired']

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
  title: string
  detail: string
}

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler)

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

function formatRelativeTime(iso: string) {
  const t = new Date(iso).getTime()
  const diff = Date.now() - t
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function countInMonth(rows: { created_at?: string; updated_at?: string; scheduled_at?: string | null }[], field: 'created_at' | 'updated_at' | 'scheduled_at', key: string) {
  return rows.filter(row => {
    const raw = field === 'scheduled_at' ? row.scheduled_at : row[field]
    if (!raw) return false
    return monthKey(new Date(raw)) === key
  }).length
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

function buildActivityFeed(
  applications: Application[],
  interviews: InterviewAssignmentRow[],
  jobById: Map<number, Job>,
): ActivityItem[] {
  const items: ActivityItem[] = []

  for (const app of applications) {
    const jobTitle = jobById.get(app.job_id)?.title ?? `Job #${app.job_id}`
    const name = app.candidate_name || app.candidate_email
    items.push({
      id: `app-created-${app.id}`,
      at: app.created_at,
      title: 'New application',
      detail: `${name} applied to ${jobTitle}`,
    })
    if (app.status === 'offer') {
      items.push({
        id: `app-offer-${app.id}`,
        at: app.updated_at,
        title: 'Offer stage',
        detail: `${name} · ${jobTitle}`,
      })
    }
    if (app.status === 'hired') {
      items.push({
        id: `app-hired-${app.id}`,
        at: app.updated_at,
        title: 'Candidate hired',
        detail: `${name} · ${jobTitle}`,
      })
    }
  }

  for (const row of interviews) {
    if (row.scheduled_at) {
      const name = row.application?.candidate_name || row.application?.candidate_email || 'Candidate'
      const jt = row.job?.title ?? `Job #${row.application?.job_id ?? '—'}`
      items.push({
        id: `int-${row.id}-sched`,
        at: row.scheduled_at,
        title: 'Interview scheduled',
        detail: `${name} · ${jt}`,
      })
    }
  }

  return items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 18)
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
        setAnalyticsLoading(false)
      })
      return
    }

    let cancelled = false
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

  const jobById = useMemo(() => new Map(jobs.map(j => [j.id, j])), [jobs])

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
  const offersReleasedTotal = allApplications.filter(a => a.status === 'offer').length

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
    return keys.map(item => ({ label: item.label, value: counters[item.key] ?? 0, key: item.key }))
  }, [allApplications])

  const currentMonthKey = monthKey(new Date())
  const prevMonthDate = new Date()
  prevMonthDate.setMonth(prevMonthDate.getMonth() - 1)
  const previousMonthKey = monthKey(prevMonthDate)

  const applicationsThisMonth = countInMonth(allApplications, 'created_at', currentMonthKey)
  const applicationsPrevMonth = countInMonth(allApplications, 'created_at', previousMonthKey)
  const jobsThisMonth = countInMonth(jobs, 'created_at', currentMonthKey)
  const jobsPrevMonth = countInMonth(jobs, 'created_at', previousMonthKey)

  const interviewsWithSlot = interviews.filter(r => r.scheduled_at)
  const interviewsThisMonth = countInMonth(interviewsWithSlot, 'scheduled_at', currentMonthKey)
  const interviewsPrevMonth = countInMonth(interviewsWithSlot, 'scheduled_at', previousMonthKey)

  const offersThisMonth = countInMonth(
    allApplications.filter(a => a.status === 'offer'),
    'updated_at',
    currentMonthKey,
  )
  const offersPrevMonth = countInMonth(
    allApplications.filter(a => a.status === 'offer'),
    'updated_at',
    previousMonthKey,
  )

  const candTrend = formatTrendPercent(applicationsThisMonth, applicationsPrevMonth)
  const jobsTrend = formatTrendPercent(jobsThisMonth, jobsPrevMonth)
  const intTrend = formatTrendPercent(interviewsThisMonth, interviewsPrevMonth)
  const offerTrend = formatTrendPercent(offersThisMonth, offersPrevMonth)

  const funnelCounts = useMemo(() => {
    const base = FUNNEL_STAGES.map(() => 0)
    for (const app of allApplications) {
      const idx = FUNNEL_STAGES.indexOf(app.status as (typeof FUNNEL_STAGES)[number])
      if (idx >= 0) base[idx] += 1
    }
    return base
  }, [allApplications])

  const jobDistribution = useMemo(() => {
    const counts = new Map<number, number>()
    for (const app of allApplications) {
      counts.set(app.job_id, (counts.get(app.job_id) ?? 0) + 1)
    }
    const pairs = jobs
      .map(j => ({ id: j.id, title: j.title, count: counts.get(j.id) ?? 0 }))
      .filter(x => x.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
    return pairs
  }, [allApplications, jobs])

  const activityItems = useMemo(
    () => buildActivityFeed(allApplications, interviews, jobById),
    [allApplications, interviews, jobById],
  )

  const currentMonthApplications = monthlyTrend[monthlyTrend.length - 1]?.value ?? 0
  const previousMonthApplications = monthlyTrend[monthlyTrend.length - 2]?.value ?? 0
  const monthlyDelta = currentMonthApplications - previousMonthApplications
  const monthlyDeltaLabel = `${monthlyDelta > 0 ? '+' : ''}${monthlyDelta}`
  const maxSourceValue = Math.max(...sourceSlices.map(slice => slice.value), 0)
  const sourceTopLabel = sourceSlices.find(slice => slice.value === maxSourceValue)?.label ?? 'No data'

  const funnelBarOptions: ChartOptions<'bar'> = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: { color: '#6b7280', precision: 0, font: { size: 11 } },
        grid: { color: 'rgba(148,163,184,0.22)' },
      },
      y: {
        ticks: { color: '#475569', font: { size: 12 } },
        grid: { display: false },
      },
    },
  }

  const jobDistBarOptions: ChartOptions<'bar'> = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: { color: '#6b7280', precision: 0, font: { size: 11 } },
        grid: { color: 'rgba(148,163,184,0.22)' },
      },
      y: {
        ticks: { color: '#475569', font: { size: 11 }, callback(val) {
          const s = String(val)
          return s.length > 28 ? `${s.slice(0, 26)}…` : s
        } },
        grid: { display: false },
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

  const pieOptions: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'right', labels: { boxWidth: 12, usePointStyle: true, pointStyle: 'circle', font: { size: 11 } } },
    },
  }

  const summaryLoading = jobsLoading || applicationsLoading

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
            Pipeline velocity, candidate flow, and hiring outcomes across your workspace.
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

      <div className="dashboard-summary-row">
        <DashboardSummaryCard
          label="Total candidates"
          value={totalApplicantsAcrossJobs.toLocaleString()}
          icon={<IconUsers />}
          trendLabel={candTrend.label}
          trendDirection={candTrend.direction as TrendDirection}
          subline={`${applicationsThisMonth} new this month · ${monthlyDeltaLabel} MoM (rolling 6-mo chart below)`}
          loading={summaryLoading}
          highlight
        />
        <DashboardSummaryCard
          label="Active jobs"
          value={openJobs.toLocaleString()}
          icon={<IconBriefcase />}
          trendLabel={jobsTrend.label}
          trendDirection={jobsTrend.direction as TrendDirection}
          subline={`${jobs.length} total roles · ${jobsThisMonth} new listings this month`}
          loading={summaryLoading}
        />
        <DashboardSummaryCard
          label="Interviews scheduled"
          value={workspaceUpcomingInterviews.toLocaleString()}
          icon={<IconCalendar />}
          trendLabel={intTrend.label}
          trendDirection={intTrend.direction as TrendDirection}
          subline={`${scheduledInterviews} for selected job · MoM from dated interviews`}
          loading={summaryLoading || interviewsLoading}
        />
        <DashboardSummaryCard
          label="Offers released"
          value={offersReleasedTotal.toLocaleString()}
          icon={<IconGift />}
          trendLabel={offerTrend.label}
          trendDirection={offerTrend.direction as TrendDirection}
          subline="Candidates currently in offer stage"
          loading={summaryLoading}
        />
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-panel dashboard-panel-span-4">
          <DashboardPanel title="Recent activity">
            <div className="dashboard-panel-content">
              {summaryLoading ? (
                <LoadingRow />
              ) : activityItems.length === 0 ? (
                <div className="dashboard-empty">No recent activity yet.</div>
              ) : (
                <div className="dashboard-activity-list">
                  {activityItems.map(item => (
                    <div key={item.id} className="dashboard-activity-item">
                      <span className="dashboard-activity-dot" />
                      <div className="dashboard-activity-body">
                        <strong>{item.title}</strong>
                        <span>{item.detail}</span>
                      </div>
                      <span className="dashboard-activity-time">{formatRelativeTime(item.at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DashboardPanel>
        </div>

        <div className="dashboard-panel dashboard-panel-span-8">
          <DashboardPanel title="Hiring funnel (workspace)">
            <div className="dashboard-panel-content">
              {applicationsLoading ? (
                <LoadingRow />
              ) : funnelCounts.every(v => v === 0) ? (
                <div className="dashboard-empty">No pipeline data yet.</div>
              ) : (
                <div className="dashboard-chart-shell dashboard-chart-shell-tall">
                  <Bar
                    data={{
                      labels: [...FUNNEL_LABELS],
                      datasets: [
                        {
                          label: 'Candidates',
                          data: [...funnelCounts],
                          backgroundColor: FUNNEL_LABELS.map((_, i) => DASHBOARD_CHART_COLORS[i % DASHBOARD_CHART_COLORS.length]),
                          borderRadius: 8,
                          maxBarThickness: 36,
                        },
                      ],
                    }}
                    options={funnelBarOptions}
                  />
                </div>
              )}
            </div>
          </DashboardPanel>
        </div>

        <div className="dashboard-panel dashboard-panel-span-6">
          <DashboardPanel title="Applications over time">
            <div className="dashboard-panel-content">
              {applicationsLoading ? (
                <LoadingRow />
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
                          backgroundColor: 'rgba(14, 165, 233, 0.15)',
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
          </DashboardPanel>
        </div>

        <div className="dashboard-panel dashboard-panel-span-6">
          <DashboardPanel title="Candidates by job">
            <div className="dashboard-panel-content">
              {applicationsLoading || jobsLoading ? (
                <LoadingRow />
              ) : jobDistribution.length === 0 ? (
                <div className="dashboard-empty">No applications yet.</div>
              ) : (
                <div className="dashboard-chart-shell dashboard-chart-shell-tall">
                  <Bar
                    data={{
                      labels: jobDistribution.map(j => j.title),
                      datasets: [
                        {
                          data: jobDistribution.map(j => j.count),
                          backgroundColor: '#3b82f6',
                          borderRadius: 6,
                          maxBarThickness: 22,
                        },
                      ],
                    }}
                    options={jobDistBarOptions}
                  />
                </div>
              )}
            </div>
          </DashboardPanel>
        </div>

        <div className="dashboard-panel dashboard-panel-span-6">
          <DashboardPanel title="Jobs by status">
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
                  <div className="dashboard-footnote">Select a role to update pipeline and source charts.</div>
                </>
              )}
            </div>
          </DashboardPanel>
        </div>

        <div className="dashboard-panel dashboard-panel-span-6">
          <DashboardPanel title="Selected job pipeline">
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
                  <div className="dashboard-footnote">Click a metric card to inspect candidate-level records.</div>
                </>
              )}
            </div>
          </DashboardPanel>
        </div>

        <div className="dashboard-panel dashboard-panel-span-6">
          <DashboardPanel title="Source of candidates (selected job)">
            <div className="dashboard-panel-content">
              {analyticsLoading ? (
                <LoadingRow />
              ) : sourceSlices.length === 0 ? (
                <div className="dashboard-empty">No source data is available for this job.</div>
              ) : (
                <>
                  <div className="dashboard-chart-shell dashboard-chart-shell-short">
                    <Pie
                      data={{
                        labels: sourceSlices.map(slice => slice.label),
                        datasets: [
                          {
                            data: sourceSlices.map(slice => slice.value),
                            backgroundColor: sourceSlices.map(slice => slice.color),
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
        </div>

        <div className="dashboard-panel dashboard-panel-span-6">
          <DashboardPanel title="Upcoming interviews (selected scope)">
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

        <div className="dashboard-panel dashboard-panel-span-12">
          <DashboardPanel title="Jobs overview">
            <div className="dashboard-panel-content">
              {jobsLoading ? (
                <LoadingRow />
              ) : jobsError ? (
                <ErrorRow msg={jobsError} />
              ) : jobs.length === 0 ? (
                <div className="dashboard-empty">No jobs yet.</div>
              ) : (
                <div className="dashboard-jobs-table-wrap">
                  <table className="dashboard-jobs-table">
                    <thead>
                      <tr>
                        <th>Job title</th>
                        <th>Status</th>
                        <th>Applicants</th>
                        <th>Primary stage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jobs.map(job => {
                        const jobApps = allApplications.filter(a => a.job_id === job.id)
                        const counts = jobApps.reduce<Record<string, number>>((acc, a) => {
                          acc[a.status] = (acc[a.status] ?? 0) + 1
                          return acc
                        }, {})
                        const dominant =
                          Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? (jobApps.length ? 'applied' : '—')
                        return (
                          <tr key={job.id}>
                            <td>
                              <button
                                type="button"
                                className="dashboard-job-select dashboard-jobs-title"
                                onClick={() => setSelectedJobId(String(job.id))}
                              >
                                {job.title}
                              </button>
                            </td>
                            <td>
                              <span className={`tag ${STAGE_COLORS[job.status] ?? 'tag-blue'}`}>{formatDashboardLabel(job.status)}</span>
                            </td>
                            <td>{jobApps.length}</td>
                            <td>
                              {dominant === '—' ? (
                                '—'
                              ) : (
                                <span className={`tag ${STAGE_COLORS[dominant] ?? 'tag-blue'}`}>{formatDashboardLabel(dominant)}</span>
                              )}
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
      </div>
    </>
  )
}

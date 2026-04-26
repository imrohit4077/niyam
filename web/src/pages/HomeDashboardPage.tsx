import { useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import {
  ArcElement,
  BarController,
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
import { Bar, Doughnut, Line, Pie } from 'react-chartjs-2'
import type { DashboardOutletContext } from '../layouts/DashboardOutletContext'
import { jobsApi, type Job } from '../api/jobs'
import { applicationsApi, type Application } from '../api/applications'
import { interviewsApi, type InterviewAssignmentRow } from '../api/interviews'
import { DashboardPanel } from '../components/dashboard/DashboardPanel'
import { DashboardSummaryCard } from '../components/dashboard/DashboardSummaryCard'

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
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  PieController,
  PointElement,
  LineElement,
  Filler,
)

const PIPELINE_FUNNEL_STAGES = ['applied', 'screening', 'interview', 'offer', 'hired'] as const

function yearMonth(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function countStageEventsInMonth(applications: Application[], stage: string, ym: string): number {
  let n = 0
  for (const a of applications) {
    for (const h of a.stage_history ?? []) {
      if (h.stage === stage && h.changed_at.slice(0, 7) === ym) n += 1
    }
  }
  return n
}

function countJobsCreatedInMonth(jobs: Job[], ym: string): number {
  return jobs.filter(j => j.created_at?.slice(0, 7) === ym).length
}

function countInterviewsCreatedInMonth(rows: InterviewAssignmentRow[], ym: string): number {
  return rows.filter(r => r.created_at?.slice(0, 7) === ym).length
}

function pctTrend(current: number, previous: number): { pct: number; direction: 'up' | 'down' | 'flat' } {
  if (previous === 0 && current === 0) return { pct: 0, direction: 'flat' }
  if (previous === 0) return { pct: 100, direction: 'up' }
  const raw = Math.round(((current - previous) / previous) * 100)
  const direction = raw > 0 ? 'up' : raw < 0 ? 'down' : 'flat'
  return { pct: Math.abs(raw), direction }
}

function formatMoMTrend(t: { pct: number; direction: 'up' | 'down' | 'flat' }) {
  if (t.direction === 'flat' && t.pct === 0) return 'Flat vs last month'
  return `${t.pct}% vs last month`
}

function KpiIconCandidates() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function KpiIconBriefcase() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  )
}

function KpiIconCalendar() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function KpiIconOffer() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M20 12v10H4V12" />
      <path d="M2 7h20v5H2z" />
      <path d="M12 22V7" />
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
    </svg>
  )
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
  const [applicationsError, setApplicationsError] = useState('')
  const [workspaceInterviews, setWorkspaceInterviews] = useState<InterviewAssignmentRow[]>([])
  const [workspaceInterviewsLoading, setWorkspaceInterviewsLoading] = useState(true)
  const [workspaceInterviewsError, setWorkspaceInterviewsError] = useState('')
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
    setApplicationsError('')

    applicationsApi
      .list(token)
      .then(rows => {
        if (!cancelled) setAllApplications(rows)
      })
      .catch(e => {
        if (!cancelled) {
          setAllApplications([])
          setApplicationsError(e instanceof Error ? e.message : 'Failed to load applications')
        }
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
    setWorkspaceInterviewsLoading(true)
    setWorkspaceInterviewsError('')

    interviewsApi
      .myAssignments(token, { include_open: true, page: 1, per_page: 200 })
      .then(res => {
        if (!cancelled) setWorkspaceInterviews(res.entries)
      })
      .catch(e => {
        if (!cancelled) {
          setWorkspaceInterviews([])
          setWorkspaceInterviewsError(e instanceof Error ? e.message : 'Failed to load interviews')
        }
      })
      .finally(() => {
        if (!cancelled) setWorkspaceInterviewsLoading(false)
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
  const isUpcomingInterviewRow = (row: InterviewAssignmentRow) =>
    row.status === 'scheduled' || row.status === 'pending' || !!row.scheduled_at
  const workspaceUpcomingInterviews = workspaceInterviews.filter(isUpcomingInterviewRow).length
  const offerRows = jobApplications.filter(application => application.status === 'offer')
  const hiredRows = jobApplications.filter(application => application.status === 'hired')
  const openJobs = jobs.filter(job => job.status === 'open').length
  const scheduledInterviews = interviewPanelRows.length
  const totalHiredCandidates = allApplications.filter(application => application.status === 'hired').length
  const totalApplicantsAcrossJobs = allApplications.length
  const offersReleasedWorkspace = allApplications.filter(a => a.status === 'offer' || a.status === 'hired').length
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
  const workspaceApplicationsByStatus = allApplications.reduce<Record<string, number>>((acc, application) => {
    acc[application.status] = (acc[application.status] ?? 0) + 1
    return acc
  }, {})
  const workspaceSourceSlices = makeDashboardSlices(
    Object.entries(
      allApplications.reduce<Record<string, number>>((acc, application) => {
        const source = application.source_type || 'unknown'
        acc[source] = (acc[source] ?? 0) + 1
        return acc
      }, {}),
    ),
  )
  const funnelStageLabels = PIPELINE_FUNNEL_STAGES.map(s => formatDashboardLabel(s))
  const funnelCounts = PIPELINE_FUNNEL_STAGES.map(
    stage => workspaceApplicationsByStatus[stage] ?? 0,
  )
  const applicantsPerJob = useMemo(() => {
    const m = new Map<number, number>()
    for (const a of allApplications) {
      m.set(a.job_id, (m.get(a.job_id) ?? 0) + 1)
    }
    return m
  }, [allApplications])
  const jobBarRows = useMemo(() => {
    return [...jobs]
      .map(job => ({ job, count: applicantsPerJob.get(job.id) ?? 0 }))
      .filter(r => r.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 12)
  }, [jobs, applicantsPerJob])
  const jobPrimaryStage = useMemo(() => {
    const tally = new Map<number, Record<string, number>>()
    for (const a of allApplications) {
      const row = tally.get(a.job_id) ?? {}
      row[a.status] = (row[a.status] ?? 0) + 1
      tally.set(a.job_id, row)
    }
    const pick = new Map<number, string>()
    for (const [jobId, counts] of tally) {
      let best = ''
      let bestN = 0
      for (const [status, n] of Object.entries(counts)) {
        if (n > bestN) {
          bestN = n
          best = status
        }
      }
      pick.set(jobId, best)
    }
    return pick
  }, [allApplications])
  const jobsTableRows = useMemo(() => {
    return [...jobs].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 20)
  }, [jobs])
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
  const maxSourceValue = Math.max(...sourceSlices.map(slice => slice.value), 0)
  const sourceTopLabel = sourceSlices.find(slice => slice.value === maxSourceValue)?.label ?? 'No data'

  const now = new Date()
  const thisYm = yearMonth(now)
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const prevYm = yearMonth(prevDate)
  const jobsThisMonth = countJobsCreatedInMonth(jobs, thisYm)
  const jobsPrevMonth = countJobsCreatedInMonth(jobs, prevYm)
  const interviewsThisMonth = countInterviewsCreatedInMonth(workspaceInterviews, thisYm)
  const interviewsPrevMonth = countInterviewsCreatedInMonth(workspaceInterviews, prevYm)
  const offerEventsThisMonth = countStageEventsInMonth(allApplications, 'offer', thisYm)
  const offerEventsPrevMonth = countStageEventsInMonth(allApplications, 'offer', prevYm)
  const candidateTrend = pctTrend(currentMonthApplications, previousMonthApplications)
  const jobsTrend = pctTrend(jobsThisMonth, jobsPrevMonth)
  const interviewTrend = pctTrend(interviewsThisMonth, interviewsPrevMonth)
  const offerActivityTrend = pctTrend(offerEventsThisMonth, offerEventsPrevMonth)

  const activityFeedItems = useMemo(() => {
    type FeedItem = { id: string; at: number; title: string; meta: string; tone: 'default' | 'success' | 'warn' }
    const items: FeedItem[] = []
    for (const a of allApplications) {
      const name = a.candidate_name || a.candidate_email
      items.push({
        id: `app-${a.id}`,
        at: new Date(a.created_at).getTime(),
        title: `Application received: ${name}`,
        meta: jobs.find(j => j.id === a.job_id)?.title ?? `Job #${a.job_id}`,
        tone: 'default',
      })
      const last = a.stage_history?.[a.stage_history.length - 1]
      if (last && last.stage !== 'applied') {
        items.push({
          id: `stage-${a.id}-${last.changed_at}`,
          at: new Date(last.changed_at).getTime(),
          title: `Stage updated to ${formatDashboardLabel(last.stage)}`,
          meta: name,
          tone: last.stage === 'hired' ? 'success' : 'default',
        })
      }
    }
    for (const row of workspaceInterviews) {
      if (row.scheduled_at) {
        items.push({
          id: `int-${row.id}-sched`,
          at: new Date(row.scheduled_at).getTime(),
          title: 'Interview scheduled',
          meta: row.application?.candidate_name || row.application?.candidate_email || 'Candidate',
          tone: 'default',
        })
      }
    }
    items.sort((x, y) => y.at - x.at)
    return items.slice(0, 14)
  }, [allApplications, workspaceInterviews, jobs])

  const summaryLoading = jobsLoading || applicationsLoading || workspaceInterviewsLoading

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
  const funnelBarOptions: ChartOptions<'bar'> = {
    ...barOptions,
    indexAxis: 'y',
    scales: {
      x: {
        beginAtZero: true,
        ticks: { color: '#6b7280', precision: 0, font: { size: 11 } },
        grid: { color: 'rgba(148,163,184,0.22)' },
      },
      y: {
        ticks: { color: '#374151', font: { size: 11 } },
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
      legend: { position: 'bottom', labels: { boxWidth: 10, usePointStyle: true, pointStyle: 'circle', font: { size: 11 } } },
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
            Pipeline velocity, sourcing, and hiring outcomes in one calm workspace view—aligned with how modern ATS teams work.
          </p>
        </div>
        <div className="dashboard-hero-meta">
          <div className="dashboard-hero-meta-item">
            <span>Selected job hire rate</span>
            <strong>{conversionRate}%</strong>
          </div>
          <div className="dashboard-hero-meta-item">
            <span>Openings fill rate</span>
            <strong>{openingFillRate}%</strong>
          </div>
          <div className="dashboard-hero-meta-item">
            <span>Avg applicants / job</span>
            <strong>{avgApplicantsPerJob}</strong>
          </div>
        </div>
      </div>

      {applicationsError ? <ErrorRow msg={applicationsError} /> : null}
      {workspaceInterviewsError ? <ErrorRow msg={workspaceInterviewsError} /> : null}

      <div className="dashboard-kpi-grid dashboard-kpi-grid-four">
        <DashboardSummaryCard
          label="Total candidates"
          value={totalApplicantsAcrossJobs}
          icon={<KpiIconCandidates />}
          trendLabel={formatMoMTrend(candidateTrend)}
          trendDirection={candidateTrend.direction === 'flat' && candidateTrend.pct === 0 ? 'neutral' : candidateTrend.direction}
          highlight
          loading={summaryLoading}
        />
        <DashboardSummaryCard
          label="Active jobs"
          value={openJobs}
          icon={<KpiIconBriefcase />}
          trendLabel={formatMoMTrend(jobsTrend)}
          trendDirection={jobsTrend.direction === 'flat' && jobsTrend.pct === 0 ? 'neutral' : jobsTrend.direction}
          loading={summaryLoading}
        />
        <DashboardSummaryCard
          label="Interviews scheduled"
          value={workspaceUpcomingInterviews}
          icon={<KpiIconCalendar />}
          trendLabel={formatMoMTrend(interviewTrend)}
          trendDirection={interviewTrend.direction === 'flat' && interviewTrend.pct === 0 ? 'neutral' : interviewTrend.direction}
          loading={summaryLoading}
        />
        <DashboardSummaryCard
          label="Offers released"
          value={offersReleasedWorkspace}
          icon={<KpiIconOffer />}
          trendLabel={formatMoMTrend(offerActivityTrend)}
          trendDirection={offerActivityTrend.direction === 'flat' && offerActivityTrend.pct === 0 ? 'neutral' : offerActivityTrend.direction}
          loading={summaryLoading}
        />
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-panel dashboard-panel-span-12 dashboard-charts-band">
          <div className="dashboard-charts-grid">
            <DashboardPanel title="Pipeline funnel (workspace)">
              <div className="dashboard-panel-content">
                {applicationsLoading ? (
                  <div className="dashboard-chart-skeleton" aria-hidden />
                ) : funnelCounts.every(v => v === 0) ? (
                  <div className="dashboard-empty">No candidates in funnel stages yet.</div>
                ) : (
                  <div className="dashboard-chart-shell dashboard-chart-shell-funnel">
                    <Bar
                      data={{
                        labels: funnelStageLabels,
                        datasets: [
                          {
                            label: 'Candidates',
                            data: funnelCounts,
                            backgroundColor: ['#38bdf8', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8'],
                            borderRadius: 8,
                            maxBarThickness: 28,
                          },
                        ],
                      }}
                      options={funnelBarOptions}
                    />
                  </div>
                )}
              </div>
            </DashboardPanel>
            <DashboardPanel title="Applications over time">
              <div className="dashboard-panel-content">
                {applicationsLoading ? (
                  <div className="dashboard-chart-skeleton" aria-hidden />
                ) : monthlyTrend.every(item => item.value === 0) ? (
                  <div className="dashboard-empty">No application activity in the last six months.</div>
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
            </DashboardPanel>
            <DashboardPanel title="Candidates by job">
              <div className="dashboard-panel-content">
                {applicationsLoading || jobsLoading ? (
                  <div className="dashboard-chart-skeleton" aria-hidden />
                ) : jobBarRows.length === 0 ? (
                  <div className="dashboard-empty">No applications grouped by job yet.</div>
                ) : (
                  <div className="dashboard-chart-shell dashboard-chart-shell-short">
                    <Bar
                      data={{
                        labels: jobBarRows.map(r => r.job.title),
                        datasets: [
                          {
                            data: jobBarRows.map(r => r.count),
                            backgroundColor: '#93c5fd',
                            borderRadius: 6,
                            maxBarThickness: 22,
                          },
                        ],
                      }}
                      options={barOptions}
                    />
                  </div>
                )}
              </div>
            </DashboardPanel>
            <DashboardPanel title="Source of candidates (workspace)">
              <div className="dashboard-panel-content">
                {applicationsLoading ? (
                  <div className="dashboard-chart-skeleton" aria-hidden />
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
                      options={pieOptions}
                    />
                  </div>
                )}
              </div>
            </DashboardPanel>
          </div>
        </div>

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

        <DashboardPanel title="Recent activity">
          <div className="dashboard-panel-content">
            {applicationsLoading && workspaceInterviewsLoading ? (
              <div className="dashboard-activity-skeleton" aria-hidden>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="dashboard-activity-skeleton-row" />
                ))}
              </div>
            ) : activityFeedItems.length === 0 ? (
              <div className="dashboard-empty">No recent activity yet. Applications and interviews will appear here.</div>
            ) : (
              <ul className="dashboard-activity-feed">
                {activityFeedItems.map(item => (
                  <li key={item.id} className={`dashboard-activity-item dashboard-activity-item--${item.tone}`}>
                    <div className="dashboard-activity-dot" aria-hidden />
                    <div className="dashboard-activity-body">
                      <span className="dashboard-activity-title">{item.title}</span>
                      <span className="dashboard-activity-meta">{item.meta}</span>
                    </div>
                    <time className="dashboard-activity-time" dateTime={new Date(item.at).toISOString()}>
                      {new Date(item.at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </time>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DashboardPanel>

        <div className="dashboard-panel-span-12">
          <DashboardPanel title="Jobs overview">
            <div className="dashboard-panel-content dashboard-table-wrap">
              {jobsLoading ? (
                <div className="dashboard-table-skeleton" aria-hidden>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="dashboard-table-skeleton-row" />
                  ))}
                </div>
              ) : jobsError ? (
                <ErrorRow msg={jobsError} />
              ) : jobsTableRows.length === 0 ? (
                <div className="dashboard-empty">No jobs yet. Create a role to start tracking applicants.</div>
              ) : (
                <table className="dashboard-jobs-table">
                  <thead>
                    <tr>
                      <th scope="col">Job title</th>
                      <th scope="col">Status</th>
                      <th scope="col">Applicants</th>
                      <th scope="col">Stage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobsTableRows.map(job => {
                      const n = applicantsPerJob.get(job.id) ?? 0
                      const stageKey = jobPrimaryStage.get(job.id) ?? ''
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
                          <td>{n}</td>
                          <td>
                            {n === 0 ? (
                              <span className="dashboard-table-muted">—</span>
                            ) : (
                              <span className={`tag ${STAGE_COLORS[stageKey] ?? 'tag-blue'}`}>{formatDashboardLabel(stageKey)}</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </DashboardPanel>
        </div>

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

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
import { Bar, Doughnut, Line, Pie } from 'react-chartjs-2'
import type { DashboardOutletContext } from '../layouts/DashboardOutletContext'
import { DashboardPanel } from '../components/dashboard/DashboardPanel'
import { DashboardSummaryCard } from '../components/dashboard/DashboardSummaryCard'
import { jobsApi, type Job } from '../api/jobs'
import { applicationsApi, type Application } from '../api/applications'
import { interviewsApi, type InterviewAssignmentRow } from '../api/interviews'

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

const DASHBOARD_CHART_COLORS = ['#0ea5e9', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6b7280', '#8b5cf6', '#ec4899']

const MS_DAY = 86400000

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
  href: string
}

const FUNNEL_STAGES = ['applied', 'screening', 'interview', 'offer', 'hired'] as const

ChartJS.register(
  PieController,
  ArcElement,
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

function formatActivityWhen(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  if (diffMs < MS_DAY && diffMs >= 0) {
    const h = Math.floor(diffMs / 3600000)
    if (h < 1) return 'Just now'
    return `${h}h ago`
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null
  return Math.round(((current - previous) / previous) * 100)
}

function countInMonth(rows: { created_at: string }[], year: number, month0: number) {
  return rows.filter(r => {
    const d = new Date(r.created_at)
    return d.getFullYear() === year && d.getMonth() === month0
  }).length
}

function countJobsCreatedInRange(jobs: Job[], startMs: number, endMs: number) {
  return jobs.filter(j => {
    const t = new Date(j.created_at).getTime()
    return t >= startMs && t < endMs
  }).length
}

function countInterviewsInMonth(rows: InterviewAssignmentRow[], year: number, month0: number) {
  return rows.filter(r => {
    if (!r.scheduled_at) return false
    const d = new Date(r.scheduled_at)
    return d.getFullYear() === year && d.getMonth() === month0
  }).length
}

function countOffersInMonth(apps: Application[], year: number, month0: number) {
  return apps.filter(a => {
    if (a.status !== 'offer') return false
    const d = new Date(a.updated_at)
    return d.getFullYear() === year && d.getMonth() === month0
  }).length
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

function SummaryIcons() {
  return {
    candidates: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    jobs: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
        <path d="M12 12v4M10 14h4" />
      </svg>
    ),
    interviews: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    ),
    offers: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
    ),
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
  const [appsLoading, setAppsLoading] = useState(true)
  const [jobApplications, setJobApplications] = useState<Application[]>([])
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [analyticsError, setAnalyticsError] = useState('')
  const [activePipelineModal, setActivePipelineModal] = useState<PipelineModalKind | null>(null)

  const icons = useMemo(() => SummaryIcons(), [])

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
        per_page: 24,
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
    setAppsLoading(true)

    applicationsApi
      .list(token)
      .then(rows => {
        if (!cancelled) setAllApplications(rows)
      })
      .catch(() => {
        if (!cancelled) setAllApplications([])
      })
      .finally(() => {
        if (!cancelled) setAppsLoading(false)
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
  const scheduledInterviews = interviewPanelRows.length
  const openJobs = jobs.filter(job => job.status === 'open').length
  const totalHiredCandidates = allApplications.filter(application => application.status === 'hired').length
  const totalApplicantsAcrossJobs = allApplications.length
  const workspaceOffers = allApplications.filter(a => a.status === 'offer').length
  const totalOpenings = jobs.reduce((sum, job) => sum + (job.open_positions ?? 0), 0)
  const openingFillRate = totalOpenings > 0 ? Math.round((totalHiredCandidates / totalOpenings) * 100) : 0
  const avgApplicantsPerJob = jobs.length > 0 ? (totalApplicantsAcrossJobs / jobs.length).toFixed(1) : '0.0'
  const offerRows = jobApplications.filter(application => application.status === 'offer')
  const hiredRows = jobApplications.filter(application => application.status === 'hired')

  const now = new Date()
  const curY = now.getFullYear()
  const curM = now.getMonth()
  const prev = new Date(curY, curM - 1, 1)
  const prevY = prev.getFullYear()
  const prevM = prev.getMonth()

  const applicationsThisMonth = countInMonth(allApplications, curY, curM)
  const applicationsPrevMonth = countInMonth(allApplications, prevY, prevM)

  const t = Date.now()
  const jobsRecent = countJobsCreatedInRange(jobs, t - 30 * MS_DAY, t)
  const jobsPrior = countJobsCreatedInRange(jobs, t - 60 * MS_DAY, t - 30 * MS_DAY)

  const interviewsThisMonth = countInterviewsInMonth(interviews, curY, curM)
  const interviewsPrevMonth = countInterviewsInMonth(interviews, prevY, prevM)

  const offersThisMonth = countOffersInMonth(allApplications, curY, curM)
  const offersPrevMonth = countOffersInMonth(allApplications, prevY, prevM)

  const summaryLoading = jobsLoading || appsLoading

  const monthlyTrend = useMemo(() => {
    const d = new Date()
    const keys = Array.from({ length: 6 }, (_, idx) => {
      const date = new Date(d.getFullYear(), d.getMonth() - (5 - idx), 1)
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

  const applicantsByJobId = useMemo(() => {
    const m: Record<number, number> = {}
    for (const a of allApplications) {
      m[a.job_id] = (m[a.job_id] ?? 0) + 1
    }
    return m
  }, [allApplications])

  const applicationsByJobId = useMemo(() => {
    const m: Record<number, Application[]> = {}
    for (const a of allApplications) {
      if (!m[a.job_id]) m[a.job_id] = []
      m[a.job_id].push(a)
    }
    return m
  }, [allApplications])

  const jobDistributionBars = useMemo(() => {
    const rows = jobs
      .map(job => ({ job, n: applicantsByJobId[job.id] ?? 0 }))
      .filter(x => x.n > 0)
      .sort((a, b) => b.n - a.n)
    const top = rows.slice(0, 8)
    const rest = rows.slice(8).reduce((s, x) => s + x.n, 0)
    if (rest > 0) top.push({ job: { id: -1, title: 'Other roles' } as Job, n: rest })
    return top
  }, [jobs, applicantsByJobId])

  const funnelCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const s of FUNNEL_STAGES) counts[s] = 0
    for (const a of allApplications) {
      const st = a.status
      if (st in counts) counts[st] += 1
    }
    return FUNNEL_STAGES.map(stage => ({
      key: stage,
      label: formatDashboardLabel(stage),
      value: counts[stage] ?? 0,
    }))
  }, [allApplications])

  const uniqueCandidateEmails = useMemo(
    () => new Set(allApplications.map(a => a.candidate_email.toLowerCase())).size,
    [allApplications],
  )

  const activityItems = useMemo((): ActivityItem[] => {
    const capApps = allApplications.slice(0, 400)
    const events: ActivityItem[] = []

    for (const app of capApps) {
      const name = app.candidate_name || app.candidate_email
      const base = `/account/${accountId}/job-applications/${app.id}`
      events.push({
        id: `app-${app.id}`,
        at: app.created_at,
        title: `Application received`,
        detail: `${name} · ${jobs.find(j => j.id === app.job_id)?.title ?? `Job #${app.job_id}`}`,
        href: base,
      })
      const history = app.stage_history ?? []
      for (let i = 0; i < history.length; i++) {
        const h = history[i]
        events.push({
          id: `app-${app.id}-st-${i}-${h.changed_at}`,
          at: h.changed_at,
          title: `Stage → ${formatDashboardLabel(h.stage)}`,
          detail: name,
          href: base,
        })
      }
    }

    for (const row of interviews) {
      const when = row.scheduled_at
      if (!when) continue
      const name = row.application?.candidate_name || row.application?.candidate_email || 'Candidate'
      events.push({
        id: `int-${row.id}-${when}`,
        at: when,
        title: `Interview ${formatDashboardLabel(row.status)}`,
        detail: `${name} · ${row.job?.title ?? 'Role'}`,
        href: `/account/${accountId}/interviews`,
      })
    }

    events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    return events.slice(0, 14)
  }, [allApplications, interviews, jobs, accountId])

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
        ticks: { color: '#64748b', font: { size: 12 } },
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
      legend: { position: 'right', labels: { boxWidth: 10, usePointStyle: true, pointStyle: 'circle', font: { size: 11 } } },
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

  const conversionRateLabel = selectedJob ? `${conversionRate}% for selected job` : 'Select a job for detail'

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
                          <span className={`tag ${STAGE_COLORS[application.status] ?? 'tag-blue'}`}>
                            {formatDashboardLabel(application.status)}
                          </span>
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
                          <span className={`tag ${STAGE_COLORS[application.status] ?? 'tag-blue'}`}>
                            {formatDashboardLabel(application.status)}
                          </span>
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
                        <span className={`tag ${STAGE_COLORS[application.status] ?? 'tag-blue'}`}>
                          {formatDashboardLabel(application.status)}
                        </span>
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

      <div className="dashboard-hero dashboard-hero-modern dashboard-hero-compact">
        <div className="dashboard-hero-main">
          <p className="dashboard-eyebrow">Overview</p>
          <h2 className="dashboard-title">{user.account?.name ?? 'Your workspace'}</h2>
          <p className="dashboard-subtitle">
            Pipeline, sourcing, and hiring activity across your open roles — {avgApplicantsPerJob} avg applications per job
            {totalOpenings > 0 ? ` · ${openingFillRate}% opening fill rate` : ''}.
          </p>
        </div>
        <div className="dashboard-hero-meta">
          <div className="dashboard-hero-meta-item">
            <span>Conversion (selected job)</span>
            <strong>{conversionRateLabel}</strong>
          </div>
          <div className="dashboard-hero-meta-item">
            <span>Applications (workspace)</span>
            <strong>{totalApplicantsAcrossJobs}</strong>
          </div>
          <div className="dashboard-hero-meta-item">
            <span>Hired (workspace)</span>
            <strong>{totalHiredCandidates}</strong>
          </div>
        </div>
      </div>

      <div className="dashboard-summary-grid">
        <DashboardSummaryCard
          primary
          icon={icons.candidates}
          label="Total candidates"
          value={summaryLoading ? '—' : uniqueCandidateEmails}
          loading={summaryLoading}
          trend={{
            deltaPct: pctChange(applicationsThisMonth, applicationsPrevMonth),
            caption: 'vs last month',
          }}
        />
        <DashboardSummaryCard
          icon={icons.jobs}
          label="Active jobs"
          value={summaryLoading ? '—' : openJobs}
          loading={summaryLoading}
          trend={{
            deltaPct: pctChange(jobsRecent, jobsPrior),
            caption: 'new listings 30d',
          }}
        />
        <DashboardSummaryCard
          icon={icons.interviews}
          label="Interviews scheduled"
          value={summaryLoading ? '—' : interviewsThisMonth}
          loading={summaryLoading}
          trend={{
            deltaPct: pctChange(interviewsThisMonth, interviewsPrevMonth),
            caption: 'vs last month',
          }}
        />
        <DashboardSummaryCard
          icon={icons.offers}
          label="Offers released"
          value={summaryLoading ? '—' : workspaceOffers}
          loading={summaryLoading}
          trend={{
            deltaPct: pctChange(offersThisMonth, offersPrevMonth),
            caption: 'vs last month',
          }}
        />
      </div>

      <div className="dashboard-grid dashboard-grid-tight-top">
        <DashboardPanel title="Pipeline funnel (workspace)">
          <div className="dashboard-panel-content">
            {appsLoading ? (
              <div className="dashboard-chart-skeleton-wrap">
                <div className="dashboard-skeleton dashboard-skeleton-chart" />
              </div>
            ) : funnelCounts.every(x => x.value === 0) ? (
              <div className="dashboard-empty">No applications in funnel stages yet.</div>
            ) : (
              <div className="dashboard-chart-shell dashboard-chart-shell-funnel">
                <Bar
                  data={{
                    labels: funnelCounts.map(x => x.label),
                    datasets: [
                      {
                        data: funnelCounts.map(x => x.value),
                        backgroundColor: funnelCounts.map(
                          (_, i) => DASHBOARD_CHART_COLORS[i % DASHBOARD_CHART_COLORS.length],
                        ),
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
            {appsLoading ? (
              <div className="dashboard-chart-skeleton-wrap">
                <div className="dashboard-skeleton dashboard-skeleton-chart" />
              </div>
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
        </DashboardPanel>

        <DashboardPanel title="Candidates by job">
          <div className="dashboard-panel-content">
            {appsLoading || jobsLoading ? (
              <div className="dashboard-chart-skeleton-wrap">
                <div className="dashboard-skeleton dashboard-skeleton-chart" />
              </div>
            ) : jobDistributionBars.length === 0 ? (
              <div className="dashboard-empty">No applicants mapped to jobs yet.</div>
            ) : (
              <div className="dashboard-chart-shell dashboard-chart-shell-short">
                <Bar
                  data={{
                    labels: jobDistributionBars.map(x => x.job.title),
                    datasets: [
                      {
                        data: jobDistributionBars.map(x => x.n),
                        backgroundColor: '#3b82f6',
                        borderRadius: 8,
                        maxBarThickness: 32,
                      },
                    ],
                  }}
                  options={barOptions}
                />
              </div>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Source of candidates">
          <div className="dashboard-panel-content">
            {appsLoading ? (
              <div className="dashboard-chart-skeleton-wrap">
                <div className="dashboard-skeleton dashboard-skeleton-chart" />
              </div>
            ) : workspaceSourceSlices.length === 0 ? (
              <div className="dashboard-empty">No source data yet.</div>
            ) : (
              <div className="dashboard-chart-shell dashboard-chart-shell-pie">
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

        <DashboardPanel title="Recent activity">
          <div className="dashboard-panel-content dashboard-activity-panel">
            {appsLoading && interviewsLoading ? (
              <div className="dashboard-activity-skeleton">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="dashboard-activity-skeleton-row">
                    <div className="dashboard-skeleton dashboard-skeleton-dot" />
                    <div className="dashboard-activity-skeleton-text">
                      <div className="dashboard-skeleton dashboard-skeleton-line dashboard-skeleton-activity-title" />
                      <div className="dashboard-skeleton dashboard-skeleton-line dashboard-skeleton-activity-meta" />
                    </div>
                  </div>
                ))}
              </div>
            ) : activityItems.length === 0 ? (
              <div className="dashboard-empty">No recent activity.</div>
            ) : (
              <ul className="dashboard-activity-list">
                {activityItems.map(item => (
                  <li key={item.id}>
                    <Link to={item.href} className="dashboard-activity-link">
                      <span className="dashboard-activity-dot" aria-hidden />
                      <div className="dashboard-activity-body">
                        <div className="dashboard-activity-title-row">
                          <strong>{item.title}</strong>
                          <time dateTime={item.at}>{formatActivityWhen(item.at)}</time>
                        </div>
                        <span className="dashboard-activity-detail">{item.detail}</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <div className="dashboard-panel-footer">
              <Link className="dashboard-link" to={`/account/${accountId}/job-applications`}>
                View all applications
              </Link>
            </div>
          </div>
        </DashboardPanel>

        <DashboardPanel title="Upcoming interviews">
          <div className="dashboard-panel-content">
            {interviewsLoading ? (
              <div className="dashboard-activity-skeleton">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="dashboard-activity-skeleton-row">
                    <div className="dashboard-skeleton dashboard-skeleton-dot" />
                    <div className="dashboard-activity-skeleton-text">
                      <div className="dashboard-skeleton dashboard-skeleton-line dashboard-skeleton-activity-title" />
                      <div className="dashboard-skeleton dashboard-skeleton-line dashboard-skeleton-activity-meta" />
                    </div>
                  </div>
                ))}
              </div>
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
                    Open interviews
                  </Link>
                </div>
              </div>
            )}
          </div>
        </DashboardPanel>

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
                <div className="dashboard-footnote">Select a role to update pipeline analytics below.</div>
              </>
            )}
          </div>
        </DashboardPanel>

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
                    <span>Hire conversion</span>
                  </div>
                  <div className="dashboard-microstat-card">
                    <strong>{rejectedCount}</strong>
                    <span>Rejected/withdrawn</span>
                  </div>
                </div>
                <div className="dashboard-footnote">Click a metric to inspect records.</div>
              </>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Jobs overview" span={12}>
          <div className="dashboard-panel-content dashboard-table-wrap">
            {jobsLoading ? (
              <div className="dashboard-table-skeleton">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="dashboard-skeleton dashboard-skeleton-table-row" />
                ))}
              </div>
            ) : jobs.length === 0 ? (
              <div className="dashboard-empty">No jobs yet. Create a job to get started.</div>
            ) : (
              <table className="dashboard-jobs-table">
                <thead>
                  <tr>
                    <th>Job title</th>
                    <th>Status</th>
                    <th>Applicants</th>
                    <th>Stage focus</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {jobs.map(job => {
                    const n = applicantsByJobId[job.id] ?? 0
                    const jobApps = applicationsByJobId[job.id] ?? []
                    const bySt = jobApps.reduce<Record<string, number>>((acc, a) => {
                      acc[a.status] = (acc[a.status] ?? 0) + 1
                      return acc
                    }, {})
                    const topStage =
                      Object.entries(bySt).sort((a, b) => b[1] - a[1])[0]?.[0] ?? (n === 0 ? '—' : 'applied')
                    return (
                      <tr key={job.id}>
                        <td>
                          <button type="button" className="dashboard-table-job-title" onClick={() => setSelectedJobId(String(job.id))}>
                            {job.title}
                          </button>
                          <div className="dashboard-table-sub">{job.department ?? '—'} · {job.location ?? '—'}</div>
                        </td>
                        <td>
                          <span className={`tag ${STAGE_COLORS[job.status] ?? 'tag-blue'}`}>{formatDashboardLabel(job.status)}</span>
                        </td>
                        <td>{n}</td>
                        <td>
                          <span className="dashboard-table-stage">{formatDashboardLabel(topStage)}</span>
                        </td>
                        <td className="dashboard-table-actions">
                          <Link className="dashboard-link dashboard-link-quiet" to={`/account/${accountId}/jobs/${job.id}/edit`}>
                            Edit
                          </Link>
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
    </>
  )
}

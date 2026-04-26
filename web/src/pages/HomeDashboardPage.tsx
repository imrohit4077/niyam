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
import { DashboardSummaryCard } from '../components/dashboard/DashboardSummaryCard'
import { DashboardPanelSkeleton } from '../components/dashboard/DashboardPanelSkeleton'

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

const PIPELINE_FUNNEL_STAGES = ['applied', 'screening', 'interview', 'offer', 'hired'] as const

const LEAD_STAGE_ORDER = ['hired', 'offer', 'interview', 'screening', 'applied'] as const

function daysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(0, 0, 0, 0)
  return d
}

function inDateRange(iso: string, start: Date, end: Date) {
  const d = new Date(iso)
  return d >= start && d < end
}

function periodTrendPercent(current: number, previous: number): { pct: number; direction: 'up' | 'down' | 'flat' } | null {
  if (previous === 0 && current === 0) return null
  if (previous === 0) return { pct: 100, direction: current > 0 ? 'up' : 'flat' }
  const raw = ((current - previous) / previous) * 100
  const pct = Math.round(raw * 10) / 10
  if (pct > 0.5) return { pct, direction: 'up' }
  if (pct < -0.5) return { pct, direction: 'down' }
  return { pct: Math.abs(pct) < 0.05 ? 0 : pct, direction: 'flat' }
}

type DashboardSlice = {
  key: string
  label: string
  value: number
  color: string
}

type PipelineModalKind = 'applicants' | 'interviews' | 'offers' | 'hired'

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

function leadStageLabel(apps: Application[]) {
  for (const st of LEAD_STAGE_ORDER) {
    if (apps.some(a => a.status === st)) return formatDashboardLabel(st)
  }
  if (apps.some(a => a.status === 'rejected' || a.status === 'withdrawn')) return 'Closed out'
  return '—'
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

function DashboardPanel({
  title,
  children,
  layout = 'grid',
}: {
  title: string
  children: ReactNode
  /** `grid`: spans columns inside `.dashboard-grid`. `tile`: fills one cell in arbitrary grids. */
  layout?: 'grid' | 'tile'
}) {
  const panelClass = layout === 'tile' ? 'panel dashboard-modern-panel' : 'panel dashboard-panel dashboard-modern-panel'
  return (
    <section className={panelClass}>
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

    void Promise.resolve().then(() => {
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

  const workspaceApplicationsByStatus = useMemo(
    () =>
      allApplications.reduce<Record<string, number>>((acc, application) => {
        acc[application.status] = (acc[application.status] ?? 0) + 1
        return acc
      }, {}),
    [allApplications],
  )

  const funnelStageCounts = useMemo(() => {
    return PIPELINE_FUNNEL_STAGES.map(stage => ({
      stage,
      label: formatDashboardLabel(stage),
      value: workspaceApplicationsByStatus[stage] ?? 0,
    }))
  }, [workspaceApplicationsByStatus])

  const workspaceOffersReleased = workspaceApplicationsByStatus.offer ?? 0

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

  const rangeEnd = useMemo(() => new Date(), [])
  const thirtyDaysAgo = useMemo(() => daysAgo(30), [])
  const sixtyDaysAgo = useMemo(() => daysAgo(60), [])

  const appsLast30 = useMemo(
    () => allApplications.filter(a => inDateRange(a.created_at, thirtyDaysAgo, rangeEnd)),
    [allApplications, thirtyDaysAgo, rangeEnd],
  )
  const appsPrev30 = useMemo(
    () => allApplications.filter(a => inDateRange(a.created_at, sixtyDaysAgo, thirtyDaysAgo)),
    [allApplications, sixtyDaysAgo, thirtyDaysAgo],
  )

  const trendCandidates = periodTrendPercent(appsLast30.length, appsPrev30.length)

  const offersTouchedLast30 = useMemo(
    () => allApplications.filter(a => a.status === 'offer' && inDateRange(a.updated_at, thirtyDaysAgo, rangeEnd)).length,
    [allApplications, thirtyDaysAgo, rangeEnd],
  )
  const offersTouchedPrev30 = useMemo(
    () => allApplications.filter(a => a.status === 'offer' && inDateRange(a.updated_at, sixtyDaysAgo, thirtyDaysAgo)).length,
    [allApplications, sixtyDaysAgo, thirtyDaysAgo],
  )
  const trendOffers = periodTrendPercent(offersTouchedLast30, offersTouchedPrev30)

  const interviewsLast30 = useMemo(
    () =>
      interviews.filter(row => {
        const t = row.scheduled_at || row.created_at
        return t && inDateRange(t, thirtyDaysAgo, rangeEnd)
      }).length,
    [interviews, thirtyDaysAgo, rangeEnd],
  )
  const interviewsPrev30 = useMemo(
    () =>
      interviews.filter(row => {
        const t = row.scheduled_at || row.created_at
        return t && inDateRange(t, sixtyDaysAgo, thirtyDaysAgo)
      }).length,
    [interviews, sixtyDaysAgo, thirtyDaysAgo],
  )
  const trendInterviews = periodTrendPercent(interviewsLast30, interviewsPrev30)

  const newJobsLast30 = useMemo(
    () => jobs.filter(j => inDateRange(j.created_at, thirtyDaysAgo, rangeEnd)).length,
    [jobs, thirtyDaysAgo, rangeEnd],
  )
  const newJobsPrev30 = useMemo(
    () => jobs.filter(j => inDateRange(j.created_at, sixtyDaysAgo, thirtyDaysAgo)).length,
    [jobs, sixtyDaysAgo, thirtyDaysAgo],
  )
  const trendNewRoles = periodTrendPercent(newJobsLast30, newJobsPrev30)

  const activityFeed = useMemo(() => {
    type FeedItem = { id: string; at: number; label: string; meta: string; href?: string }
    const items: FeedItem[] = []

    allApplications.slice(0, 200).forEach(app => {
      const job = jobs.find(j => j.id === app.job_id)
      const jobTitle = job?.title ?? `Job #${app.job_id}`
      items.push({
        id: `app-created-${app.id}`,
        at: new Date(app.created_at).getTime(),
        label: `Application received`,
        meta: `${app.candidate_name || app.candidate_email} · ${jobTitle}`,
        href: `/account/${accountId}/job-applications/${app.id}`,
      })
      const lastStage = app.stage_history?.length
        ? app.stage_history[app.stage_history.length - 1]
        : null
      if (lastStage?.changed_at) {
        items.push({
          id: `app-stage-${app.id}-${lastStage.changed_at}`,
          at: new Date(lastStage.changed_at).getTime(),
          label: `Stage → ${formatDashboardLabel(lastStage.stage)}`,
          meta: `${app.candidate_name || app.candidate_email} · ${jobTitle}`,
          href: `/account/${accountId}/job-applications/${app.id}`,
        })
      }
    })

    interviews.forEach(row => {
      const when = row.scheduled_at || row.created_at
      if (!when) return
      const name = row.application?.candidate_name || row.application?.candidate_email || 'Candidate'
      const jobTitle = row.job?.title ?? `Job #${row.application?.job_id ?? '—'}`
      items.push({
        id: `int-${row.id}-${when}`,
        at: new Date(when).getTime(),
        label: row.scheduled_at ? 'Interview scheduled' : 'Interview activity',
        meta: `${name} · ${jobTitle}`,
        href: `/account/${accountId}/interviews`,
      })
    })

    return items
      .filter(i => Number.isFinite(i.at))
      .sort((a, b) => b.at - a.at)
      .slice(0, 12)
  }, [allApplications, interviews, jobs, accountId])

  const applicantsByJobId = useMemo(() => {
    const m = new Map<number, number>()
    allApplications.forEach(a => {
      m.set(a.job_id, (m.get(a.job_id) ?? 0) + 1)
    })
    return m
  }, [allApplications])

  const jobWiseBar = useMemo(() => {
    const rows = jobs
      .map(job => {
        const title = job.title
        const titleShort = title.length > 24 ? `${title.slice(0, 22)}…` : title
        return { id: job.id, title, titleShort, count: applicantsByJobId.get(job.id) ?? 0 }
      })
      .filter(r => r.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
    return rows
  }, [jobs, applicantsByJobId])

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
        ticks: { color: '#6b7280', font: { size: 11 } },
        grid: { display: false },
      },
    },
  }

  const pieOptions: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 12, usePointStyle: true, pointStyle: 'circle' } },
    },
  }

  const jobBarHorizontalOptions: ChartOptions<'bar'> = {
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
        ticks: { color: '#6b7280', font: { size: 10 } },
        grid: { display: false },
      },
    },
  }

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

      <div className="dashboard-kpi-grid dashboard-kpi-grid--summary">
        {applicationsLoading || jobsLoading ? (
          <>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="dashboard-kpi-skeleton" aria-hidden />
            ))}
          </>
        ) : (
          <>
            <DashboardSummaryCard
              primary
              label="Total candidates"
              value={totalApplicantsAcrossJobs}
              trendLabel="vs prior 30 days"
              trendPercent={trendCandidates?.pct ?? null}
              trendDirection={trendCandidates?.direction ?? 'flat'}
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              }
            />
            <DashboardSummaryCard
              label="Active jobs"
              value={openJobs}
              trendLabel="new roles (30d vs prior)"
              trendPercent={trendNewRoles?.pct ?? null}
              trendDirection={trendNewRoles?.direction ?? 'flat'}
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                  <rect x="2" y="7" width="20" height="14" rx="2" />
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                </svg>
              }
            />
            <DashboardSummaryCard
              label="Interviews scheduled"
              value={workspaceUpcomingInterviews}
              trendLabel="touchpoints (30d vs prior)"
              trendPercent={trendInterviews?.pct ?? null}
              trendDirection={trendInterviews?.direction ?? 'flat'}
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
              }
            />
            <DashboardSummaryCard
              label="Offers released"
              value={workspaceOffersReleased}
              trendLabel="in offer (30d updates vs prior)"
              trendPercent={trendOffers?.pct ?? null}
              trendDirection={trendOffers?.direction ?? 'flat'}
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              }
            />
          </>
        )}
      </div>

      <div className="dashboard-secondary-metrics">
        <div className="dashboard-secondary-metric">
          <span>Pipeline health</span>
          <strong>{conversionRate >= 25 ? 'Strong' : conversionRate >= 10 ? 'Stable' : 'Needs attention'}</strong>
        </div>
        <div className="dashboard-secondary-metric">
          <span>Openings fill rate</span>
          <strong>{openingFillRate}%</strong>
        </div>
        <div className="dashboard-secondary-metric">
          <span>MoM applications</span>
          <strong>
            {monthlyDeltaLabel}
            <span className="dashboard-secondary-metric-sub">
              {' '}
              ({currentMonthApplications} vs {previousMonthApplications})
            </span>
          </strong>
        </div>
        <div className="dashboard-secondary-metric">
          <span>Avg applicants / job</span>
          <strong>{avgApplicantsPerJob}</strong>
        </div>
      </div>

      <div className="dashboard-charts-row">
        <div className="dashboard-chart-tile dashboard-chart-tile-span-4">
          <DashboardPanel layout="tile" title="Pipeline funnel (workspace)">
            <div className="dashboard-panel-content">
              {applicationsLoading ? (
                <DashboardPanelSkeleton rows={4} />
              ) : funnelStageCounts.every(r => r.value === 0) ? (
                <div className="dashboard-empty">No candidates in pipeline stages yet.</div>
              ) : (
                <div className="dashboard-chart-shell dashboard-chart-shell-medium">
                  <Bar
                    data={{
                      labels: funnelStageCounts.map(r => r.label),
                      datasets: [
                        {
                          label: 'Candidates',
                          data: funnelStageCounts.map(r => r.value),
                          backgroundColor: funnelStageCounts.map(
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
        </div>
        <div className="dashboard-chart-tile dashboard-chart-tile-span-4">
          <DashboardPanel layout="tile" title="Applications over time">
            <div className="dashboard-panel-content">
              {applicationsLoading ? (
                <DashboardPanelSkeleton rows={4} />
              ) : monthlyTrend.every(item => item.value === 0) ? (
                <div className="dashboard-empty">No recent application activity yet.</div>
              ) : (
                <div className="dashboard-chart-shell dashboard-chart-shell-medium">
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
                    options={lineOptions}
                  />
                </div>
              )}
            </div>
          </DashboardPanel>
        </div>
        <div className="dashboard-chart-tile dashboard-chart-tile-span-4">
          <DashboardPanel layout="tile" title="Candidates by job">
            <div className="dashboard-panel-content">
              {applicationsLoading || jobsLoading ? (
                <DashboardPanelSkeleton rows={4} />
              ) : jobWiseBar.length === 0 ? (
                <div className="dashboard-empty">No applications mapped to jobs yet.</div>
              ) : (
                <div className="dashboard-chart-shell dashboard-chart-shell-medium">
                  <Bar
                    data={{
                      labels: jobWiseBar.map(r => r.titleShort),
                      datasets: [
                        {
                          data: jobWiseBar.map(r => r.count),
                          backgroundColor: 'rgba(37, 99, 235, 0.55)',
                          borderRadius: 6,
                          maxBarThickness: 22,
                        },
                      ],
                    }}
                    options={jobBarHorizontalOptions}
                  />
                </div>
              )}
            </div>
          </DashboardPanel>
        </div>
        <div className="dashboard-chart-tile dashboard-chart-tile-span-6">
          <DashboardPanel layout="tile" title="Source of candidates (workspace)">
            <div className="dashboard-panel-content">
              {applicationsLoading ? (
                <DashboardPanelSkeleton rows={3} />
              ) : workspaceSourceSlices.length === 0 ? (
                <div className="dashboard-empty">No source data yet.</div>
              ) : (
                <div className="dashboard-chart-shell dashboard-chart-shell-medium">
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
        <div className="dashboard-chart-tile dashboard-chart-tile-span-6">
          <DashboardPanel layout="tile" title="Recent activity">
            <div className="dashboard-panel-content dashboard-activity-panel-body">
              {applicationsLoading || interviewsLoading ? (
                <DashboardPanelSkeleton rows={5} />
              ) : activityFeed.length === 0 ? (
                <div className="dashboard-empty">No recent actions yet.</div>
              ) : (
                <ul className="dashboard-activity-feed">
                  {activityFeed.map(item => (
                    <li key={item.id} className="dashboard-activity-item">
                      {item.href ? (
                        <Link to={item.href} className="dashboard-activity-link">
                          <span className="dashboard-activity-title">{item.label}</span>
                          <span className="dashboard-activity-meta">{item.meta}</span>
                          <time className="dashboard-activity-time" dateTime={new Date(item.at).toISOString()}>
                            {new Date(item.at).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </time>
                        </Link>
                      ) : (
                        <div className="dashboard-activity-static">
                          <span className="dashboard-activity-title">{item.label}</span>
                          <span className="dashboard-activity-meta">{item.meta}</span>
                          <time className="dashboard-activity-time" dateTime={new Date(item.at).toISOString()}>
                            {new Date(item.at).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </time>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </DashboardPanel>
        </div>
      </div>

      <div className="dashboard-jobs-table-wrap">
        <DashboardPanel layout="tile" title="Jobs overview">
          <div className="dashboard-panel-content dashboard-panel-content--flush">
            {jobsLoading ? (
              <DashboardPanelSkeleton rows={6} />
            ) : jobsError ? (
              <ErrorRow msg={jobsError} />
            ) : jobs.length === 0 ? (
              <div className="dashboard-empty">No jobs yet. Create a role to start tracking applicants.</div>
            ) : (
              <div className="dashboard-table-scroll">
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th>Job title</th>
                      <th>Status</th>
                      <th className="dashboard-table-num">Applicants</th>
                      <th>Lead stage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map(job => {
                      const appsForJob = allApplications.filter(a => a.job_id === job.id)
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
                          <td className="dashboard-table-num">{appsForJob.length}</td>
                          <td>{leadStageLabel(appsForJob)}</td>
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

      <div className="dashboard-grid">
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
              <DashboardPanelSkeleton rows={4} />
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
              <DashboardPanelSkeleton rows={4} />
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

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
import { Bar, Doughnut, Line, Pie } from 'react-chartjs-2'
import type { DashboardOutletContext } from '../layouts/DashboardOutletContext'
import { jobsApi, type Job } from '../api/jobs'
import { applicationsApi, type Application } from '../api/applications'
import { interviewsApi, type InterviewAssignmentRow } from '../api/interviews'
import { DashboardKpiCard, type DashboardTrend } from '../components/dashboard/DashboardKpiCard'
import { DashboardChartSkeleton, DashboardKpiSkeletonGrid, DashboardPanelSkeleton } from '../components/dashboard/DashboardSkeletons'
import { IconBriefcase, IconCalendar, IconCandidates, IconOffer } from '../components/dashboard/dashboardIcons'

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
  PointElement,
  LineElement,
  Filler,
  PieController,
)

const MS_DAY = 86400000
const TREND_WINDOW_DAYS = 28

function startOfUtcDay(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

function inRollingWindow(dateIso: string, end: Date, days: number) {
  const t = new Date(dateIso).getTime()
  const endMs = startOfUtcDay(end).getTime() + MS_DAY - 1
  const startMs = endMs - days * MS_DAY + 1
  const prevEndMs = startMs - 1
  const prevStartMs = prevEndMs - days * MS_DAY + 1
  return {
    current: t >= startMs && t <= endMs,
    previous: t >= prevStartMs && t <= prevEndMs,
  }
}

function trendFromCounts(current: number, previous: number, periodLabel: string): DashboardTrend {
  if (current === previous) return { direction: 'flat', percent: 0, periodLabel }
  if (previous === 0 && current === 0) return { direction: 'flat', percent: 0, periodLabel }
  if (previous === 0 && current > 0) return { direction: 'up', percent: 100, periodLabel }
  const raw = ((current - previous) / previous) * 100
  const pct = Math.min(999, Math.abs(raw))
  if (Math.abs(raw) < 0.5) return { direction: 'flat', percent: 0, periodLabel }
  return { direction: raw > 0 ? 'up' : 'down', percent: pct, periodLabel }
}

const FUNNEL_STAGES: { key: string; label: string }[] = [
  { key: 'applied', label: 'Applied' },
  { key: 'screening', label: 'Screening' },
  { key: 'interview', label: 'Interview' },
  { key: 'offer', label: 'Offer' },
  { key: 'hired', label: 'Hired' },
]

function funnelCounts(applications: Application[]) {
  const byStatus = applications.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1
    return acc
  }, {})
  return FUNNEL_STAGES.map(stage => byStatus[stage.key] ?? 0)
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

function DashboardPanel({ title, children, span }: { title: string; children: ReactNode; span?: 'half' | 'full' }) {
  return (
    <section
      className={`panel dashboard-panel dashboard-modern-panel ${span === 'full' ? 'dashboard-panel-span-full' : ''}`}
    >
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

  const trendPeriod = `vs prior ${TREND_WINDOW_DAYS}d`
  const rollingTrend = useMemo(() => {
    const end = new Date()
    let candCur = 0
    let candPrev = 0
    let offersCur = 0
    let offersPrev = 0
    allApplications.forEach(a => {
      const c = inRollingWindow(a.created_at, end, TREND_WINDOW_DAYS)
      if (c.current) candCur += 1
      if (c.previous) candPrev += 1
      if (a.status === 'offer') {
        const o = inRollingWindow(a.updated_at, end, TREND_WINDOW_DAYS)
        if (o.current) offersCur += 1
        if (o.previous) offersPrev += 1
      }
    })
    let intCur = 0
    let intPrev = 0
    interviews.forEach(row => {
      const anchor = row.scheduled_at || row.created_at
      const w = inRollingWindow(anchor, end, TREND_WINDOW_DAYS)
      if (w.current) intCur += 1
      if (w.previous) intPrev += 1
    })
    let jobsCur = 0
    let jobsPrev = 0
    jobs.forEach(job => {
      if (job.status !== 'open') return
      const w = inRollingWindow(job.updated_at, end, TREND_WINDOW_DAYS)
      if (w.current) jobsCur += 1
      if (w.previous) jobsPrev += 1
    })
    return {
      candidates: trendFromCounts(candCur, candPrev, trendPeriod),
      offers: trendFromCounts(offersCur, offersPrev, trendPeriod),
      interviews: trendFromCounts(intCur, intPrev, trendPeriod),
      activeJobs: trendFromCounts(jobsCur, jobsPrev, trendPeriod),
    }
  }, [allApplications, interviews, jobs, trendPeriod])

  const jobApplicantCounts = useMemo(() => {
    const map = new Map<number, number>()
    allApplications.forEach(a => {
      map.set(a.job_id, (map.get(a.job_id) ?? 0) + 1)
    })
    return jobs
      .map(job => ({ job, count: map.get(job.id) ?? 0 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }, [allApplications, jobs])

  const jobTableStats = useMemo(() => {
    const byJob = new Map<number, Record<string, number>>()
    allApplications.forEach(a => {
      const acc = byJob.get(a.job_id) ?? {}
      acc[a.status] = (acc[a.status] ?? 0) + 1
      byJob.set(a.job_id, acc)
    })
    const out = new Map<number, { total: number; topStatus: string }>()
    byJob.forEach((statuses, jobId) => {
      const total = Object.values(statuses).reduce((sum, n) => sum + n, 0)
      const topStatus = Object.entries(statuses).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'
      out.set(jobId, { total, topStatus })
    })
    return out
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

  const funnelValuesSelectedJob = useMemo(() => funnelCounts(jobApplications), [jobApplications])

  const activityFeed = useMemo(() => {
    type Row = { id: string; at: string; title: string; detail: string }
    const rows: Row[] = []
    const jobTitle = (jobId: number) => jobs.find(j => j.id === jobId)?.title ?? `Job #${jobId}`

    allApplications.forEach(app => {
      const name = app.candidate_name?.trim() || app.candidate_email
      rows.push({
        id: `app-${app.id}-created`,
        at: app.created_at,
        title: 'Application received',
        detail: `${name} · ${jobTitle(app.job_id)}`,
      })
      ;(app.stage_history ?? []).forEach((h, idx) => {
        rows.push({
          id: `app-${app.id}-stage-${idx}-${h.changed_at}`,
          at: h.changed_at,
          title: `Stage → ${formatDashboardLabel(h.stage)}`,
          detail: `${name} · ${jobTitle(app.job_id)}`,
        })
      })
    })

    interviews.forEach(row => {
      const name = row.application?.candidate_name?.trim() || row.application?.candidate_email || 'Candidate'
      const jid = row.application?.job_id
      const jt = row.job?.title ?? (jid != null ? jobTitle(jid) : 'Interview')
      rows.push({
        id: `int-${row.id}-upd`,
        at: row.updated_at,
        title: `Interview ${formatDashboardLabel(row.status)}`,
        detail: `${name} · ${jt}`,
      })
    })

    rows.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    const seen = new Set<string>()
    const deduped: Row[] = []
    for (const r of rows) {
      if (seen.has(r.id)) continue
      seen.add(r.id)
      deduped.push(r)
      if (deduped.length >= 12) break
    }
    return deduped
  }, [allApplications, interviews, jobs])

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
      legend: { position: 'bottom', labels: { boxWidth: 10, usePointStyle: true, pointStyle: 'circle', font: { size: 11 } } },
    },
  }
  const offersReleasedWorkspace = allApplications.filter(a => a.status === 'offer').length
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
            Pipeline velocity, sourcing, and hiring outcomes across your workspace—without the noise.
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

      {summaryLoading ? (
        <DashboardKpiSkeletonGrid />
      ) : (
        <div className="dashboard-kpi-grid dashboard-kpi-grid-4">
          <DashboardKpiCard
            label="Total candidates"
            value={totalApplicantsAcrossJobs}
            subtitle={`${avgApplicantsPerJob} avg per job`}
            icon={<IconCandidates />}
            trend={rollingTrend.candidates}
            variant="primary"
          />
          <DashboardKpiCard
            label="Active jobs"
            value={openJobs}
            subtitle={`${jobs.length} total in workspace`}
            icon={<IconBriefcase />}
            trend={rollingTrend.activeJobs}
          />
          <DashboardKpiCard
            label="Interviews scheduled"
            value={workspaceUpcomingInterviews}
            subtitle={selectedJobId ? `${scheduledInterviews} in selected role` : 'All roles'}
            icon={<IconCalendar />}
            trend={rollingTrend.interviews}
          />
          <DashboardKpiCard
            label="Offers released"
            value={offersReleasedWorkspace}
            subtitle={`${monthlyDeltaLabel} net new apps this month`}
            icon={<IconOffer />}
            trend={rollingTrend.offers}
          />
        </div>
      )}

      <div className="dashboard-grid">
        <DashboardPanel title="Jobs By Status">
          <div className="dashboard-panel-content">
            {jobsLoading ? (
              <>
                <DashboardChartSkeleton />
                <DashboardPanelSkeleton rows={5} />
              </>
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
            {analyticsError ? (
              <ErrorRow msg={analyticsError} />
            ) : analyticsLoading ? (
              <>
                <DashboardChartSkeleton />
                <DashboardPanelSkeleton rows={2} />
              </>
            ) : (
              <>
                {funnelValuesSelectedJob.every(v => v === 0) ? (
                  <div className="dashboard-empty">No applicants in funnel stages for this job yet.</div>
                ) : (
                  <div className="dashboard-chart-shell dashboard-chart-shell-funnel">
                    <Bar
                      data={{
                        labels: FUNNEL_STAGES.map(s => s.label),
                        datasets: [
                          {
                            data: funnelValuesSelectedJob,
                            backgroundColor: FUNNEL_STAGES.map(
                              (_, i) => DASHBOARD_CHART_COLORS[i % DASHBOARD_CHART_COLORS.length],
                            ),
                            borderRadius: 8,
                            maxBarThickness: 22,
                          },
                        ],
                      }}
                      options={funnelBarOptions}
                    />
                  </div>
                )}
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

        <DashboardPanel title="Application Trend (Last 6 Months)">
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
                  options={lineOptions}
                />
              </div>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Candidate Sources (Workspace)">
          <div className="dashboard-panel-content">
            {applicationsLoading ? (
              <DashboardChartSkeleton short />
            ) : workspaceSourceSlices.length === 0 ? (
              <div className="dashboard-empty">No application source data yet.</div>
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

        <DashboardPanel title="Applicants by Job">
          <div className="dashboard-panel-content">
            {applicationsLoading || jobsLoading ? (
              <DashboardChartSkeleton short />
            ) : jobApplicantCounts.length === 0 ? (
              <div className="dashboard-empty">No jobs or applicants to chart.</div>
            ) : (
              <div className="dashboard-chart-shell dashboard-chart-shell-short">
                <Bar
                  data={{
                    labels: jobApplicantCounts.map(({ job }) =>
                      job.title.length > 28 ? `${job.title.slice(0, 26)}…` : job.title,
                    ),
                    datasets: [
                      {
                        data: jobApplicantCounts.map(({ count }) => count),
                        backgroundColor: '#0ea5e9',
                        borderRadius: 8,
                        maxBarThickness: 28,
                      },
                    ],
                  }}
                  options={barOptions}
                />
              </div>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Recent Activity" span="full">
          <div className="dashboard-panel-content">
            {activityFeed.length === 0 && (applicationsLoading || interviewsLoading) ? (
              <DashboardPanelSkeleton rows={6} />
            ) : activityFeed.length === 0 ? (
              <div className="dashboard-empty">No recent activity yet.</div>
            ) : (
              <ul className="dashboard-activity-feed">
                {activityFeed.map(item => (
                  <li key={item.id} className="dashboard-activity-item">
                    <div className="dashboard-activity-dot" aria-hidden />
                    <div className="dashboard-activity-body">
                      <div className="dashboard-activity-title">{item.title}</div>
                      <div className="dashboard-activity-detail">{item.detail}</div>
                    </div>
                    <time className="dashboard-activity-time" dateTime={item.at}>
                      {new Date(item.at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </time>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Jobs Overview" span="full">
          <div className="dashboard-panel-content dashboard-table-wrap">
            {jobsLoading ? (
              <DashboardPanelSkeleton rows={5} />
            ) : jobsError ? (
              <ErrorRow msg={jobsError} />
            ) : jobs.length === 0 ? (
              <div className="dashboard-empty">Create a job to see it listed here.</div>
            ) : (
              <table className="dashboard-jobs-table">
                <thead>
                  <tr>
                    <th scope="col">Job title</th>
                    <th scope="col">Status</th>
                    <th scope="col" className="dashboard-jobs-table-num">
                      Applicants
                    </th>
                    <th scope="col">Stage focus</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map(job => {
                    const stats = jobTableStats.get(job.id)
                    const count = stats?.total ?? 0
                    const topStage = stats?.topStatus ?? '—'
                    return (
                      <tr key={job.id}>
                        <td>
                          <button type="button" className="dashboard-table-job-link" onClick={() => setSelectedJobId(String(job.id))}>
                            {job.title}
                          </button>
                        </td>
                        <td>
                          <span className={`tag ${STAGE_COLORS[job.status] ?? 'tag-gray'}`}>{formatDashboardLabel(job.status)}</span>
                        </td>
                        <td className="dashboard-jobs-table-num">{count}</td>
                        <td>
                          <span className="dashboard-stage-pill">{formatDashboardLabel(topStage)}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Upcoming Interviews (Selected Scope)" span="full">
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

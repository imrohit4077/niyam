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
import { DashboardSummaryCard } from '../components/dashboard/DashboardSummaryCard'
import { PIPELINE_FUNNEL_STAGES, buildWorkspaceFunnelCounts } from '../components/dashboard/dashboardPipeline'
import {
  countApplicationsCreatedInRange,
  countInterviewsScheduledInForwardWindow,
  countJobsCreatedInRange,
  countStageHistoryEventsInRange,
  percentChangeVsPrevious,
} from '../components/dashboard/dashboardMetrics'

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

function LoadingRow() {
  return (
    <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
      <div className="spinner" style={{ margin: '0 auto 8px', width: 24, height: 24 }} />
      Loading...
    </div>
  )
}

function DashboardPanelSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="dashboard-panel-skeleton" aria-hidden>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="dashboard-panel-skeleton__line" />
      ))}
    </div>
  )
}

function formatRelativeTime(iso: string) {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return ''
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
  const [appsLoading, setAppsLoading] = useState(true)
  const [jobApplications, setJobApplications] = useState<Application[]>([])
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [analyticsError, setAnalyticsError] = useState('')
  const [activePipelineModal, setActivePipelineModal] = useState<PipelineModalKind | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      await Promise.resolve()
      if (cancelled) return
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
    })()

    return () => {
      cancelled = true
    }
  }, [token])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      await Promise.resolve()
      if (cancelled) return
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
    })()

    return () => {
      cancelled = true
    }
  }, [token])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      await Promise.resolve()
      if (cancelled) return
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
    })()

    return () => {
      cancelled = true
    }
  }, [token])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      await Promise.resolve()
      if (cancelled) return
      if (!selectedJobId) {
        setJobApplications([])
        setAnalyticsError('')
        setAnalyticsLoading(false)
        return
      }

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
    })()

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

  const kpiWindow = useMemo(() => {
    const end = new Date()
    const start = new Date(end.getTime() - 28 * 86400000)
    const prevEnd = start
    const prevStart = new Date(prevEnd.getTime() - 28 * 86400000)
    return { start, end, prevStart, prevEnd }
  }, [])

  const funnelCounts = useMemo(() => buildWorkspaceFunnelCounts(allApplications), [allApplications])
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

  const applicantCountByJob = useMemo(() => {
    const tally = new Map<number, number>()
    for (const application of allApplications) {
      tally.set(application.job_id, (tally.get(application.job_id) ?? 0) + 1)
    }
    return tally
  }, [allApplications])

  const applicantsByJob = useMemo(() => {
    return jobs
      .map(job => ({ job, count: applicantCountByJob.get(job.id) ?? 0 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }, [jobs, applicantCountByJob])

  const jobDominantStage = useMemo(() => {
    const byJob = new Map<number, Record<string, number>>()
    for (const application of allApplications) {
      const bucket = byJob.get(application.job_id) ?? {}
      bucket[application.status] = (bucket[application.status] ?? 0) + 1
      byJob.set(application.job_id, bucket)
    }
    const dominant = new Map<number, string>()
    for (const [jobId, bucket] of byJob) {
      let best = 'applied'
      let max = 0
      for (const [status, n] of Object.entries(bucket)) {
        if (n > max) {
          max = n
          best = status
        }
      }
      dominant.set(jobId, best)
    }
    return dominant
  }, [allApplications])

  const activityFeed = useMemo(() => {
    type Item = { id: string; at: string; title: string; subtitle: string; kind: 'application' | 'stage' | 'interview' }
    const items: Item[] = []
    const recentInterviews = [...interviews]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 36)
    for (const row of recentInterviews) {
      const name = row.application?.candidate_name || row.application?.candidate_email || 'Candidate'
      const jobTitle = row.job?.title ?? 'Role'
      const at = row.scheduled_at || row.created_at
      items.push({
        id: `iv-${row.id}`,
        at,
        kind: 'interview',
        title: row.scheduled_at ? 'Interview scheduled' : 'Interview activity',
        subtitle: `${name} · ${jobTitle}`,
      })
    }
    const appsSorted = [...allApplications]
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 160)
    for (const app of appsSorted) {
      items.push({
        id: `app-${app.id}`,
        at: app.created_at,
        kind: 'application',
        title: 'New application',
        subtitle: app.candidate_name || app.candidate_email,
      })
      const hist = [...(app.stage_history ?? [])].sort(
        (a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime(),
      )
      for (const ev of hist.slice(0, 4)) {
        const t0 = new Date(ev.changed_at).getTime()
        const t1 = new Date(app.created_at).getTime()
        if (ev.stage === 'applied' && Math.abs(t0 - t1) < 2000) continue
        items.push({
          id: `st-${app.id}-${ev.changed_at}-${ev.stage}`,
          at: ev.changed_at,
          kind: 'stage',
          title: `Stage · ${formatDashboardLabel(ev.stage)}`,
          subtitle: app.candidate_name || app.candidate_email,
        })
      }
    }
    items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    const seen = new Set<string>()
    const deduped: Item[] = []
    for (const it of items) {
      const key = `${it.kind}|${it.title}|${it.subtitle}|${it.at}`
      if (seen.has(key)) continue
      seen.add(key)
      deduped.push(it)
      if (deduped.length >= 16) break
    }
    return deduped
  }, [allApplications, interviews])

  const workspaceOffersCount = useMemo(
    () => allApplications.filter(application => application.status === 'offer').length,
    [allApplications],
  )

  const candidatesTrend = useMemo(() => {
    const cur = countApplicationsCreatedInRange(allApplications, kpiWindow.start, kpiWindow.end)
    const prev = countApplicationsCreatedInRange(allApplications, kpiWindow.prevStart, kpiWindow.prevEnd)
    return percentChangeVsPrevious(cur, prev)
  }, [allApplications, kpiWindow])

  const activeJobsTrend = useMemo(() => {
    const open = jobs.filter(j => j.status === 'open')
    const cur = countJobsCreatedInRange(open, kpiWindow.start, kpiWindow.end)
    const prev = countJobsCreatedInRange(open, kpiWindow.prevStart, kpiWindow.prevEnd)
    return percentChangeVsPrevious(cur, prev)
  }, [jobs, kpiWindow])

  const interviewsTrend = useMemo(() => {
    const cur = countInterviewsScheduledInForwardWindow(interviews, kpiWindow.start, 28)
    const prev = countInterviewsScheduledInForwardWindow(interviews, kpiWindow.prevStart, 28)
    return percentChangeVsPrevious(cur, prev)
  }, [interviews, kpiWindow])

  const offersTrend = useMemo(() => {
    const cur = countStageHistoryEventsInRange(allApplications, 'offer', kpiWindow.start, kpiWindow.end)
    const prev = countStageHistoryEventsInRange(allApplications, 'offer', kpiWindow.prevStart, kpiWindow.prevEnd)
    return percentChangeVsPrevious(cur, prev)
  }, [allApplications, kpiWindow])

  const selectedJobConversion = useMemo(() => {
    if (!selectedJob || totalApplicants === 0) return 0
    return Math.round((hiredCount / totalApplicants) * 100)
  }, [selectedJob, totalApplicants, hiredCount])

  const heroConversion = selectedJob ? selectedJobConversion : conversionRate
  const heroFillRate = selectedJob
    ? (selectedJob.open_positions ?? 0) > 0
      ? Math.round((hiredCount / (selectedJob.open_positions ?? 1)) * 100)
      : 0
    : openingFillRate
  const heroAvgApplicants = selectedJob
    ? totalApplicants > 0
      ? (totalApplicants / 1).toFixed(1)
      : '0.0'
    : avgApplicantsPerJob
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
        ticks: { color: '#475569', font: { size: 11, weight: 500 } },
        grid: { display: false },
      },
    },
  }
  const jobDistributionOptions: ChartOptions<'bar'> = {
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
        ticks: { color: '#475569', font: { size: 10 }, maxRotation: 0, autoSkip: false },
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
            Pipeline velocity, sourcing, and role-level detail in one place.{' '}
            {selectedJob ? (
              <span className="dashboard-hero-scope">
                Job scope: <strong>{selectedJob.title}</strong>
              </span>
            ) : null}
          </p>
        </div>
        <div className="dashboard-hero-meta">
          <div className="dashboard-hero-meta-item">
            <span>Pipeline health</span>
            <strong>{heroConversion >= 25 ? 'Strong' : heroConversion >= 10 ? 'Stable' : 'Needs attention'}</strong>
          </div>
          <div className="dashboard-hero-meta-item">
            <span>Openings fill rate</span>
            <strong>{heroFillRate}%</strong>
          </div>
          <div className="dashboard-hero-meta-item">
            <span>Avg applicants / job</span>
            <strong>{heroAvgApplicants}</strong>
          </div>
        </div>
      </div>

      <div className="dashboard-summary-grid" aria-busy={appsLoading && jobsLoading}>
        {appsLoading && jobsLoading ? (
          <>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="dashboard-summary-card dashboard-summary-card--skeleton" aria-hidden>
                <div className="dashboard-summary-skeleton__icon" />
                <div className="dashboard-summary-skeleton__label" />
                <div className="dashboard-summary-skeleton__value" />
                <div className="dashboard-summary-skeleton__hint" />
              </div>
            ))}
          </>
        ) : (
          <>
            <DashboardSummaryCard
              primary
              label="Total candidates"
              value={totalApplicantsAcrossJobs}
              hint="Applications across all roles"
              trendPercent={candidatesTrend.pct}
              trendDirection={candidatesTrend.direction}
              icon={
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-3.33 0-6 1.34-6 3v1h12v-1c0-1.66-2.67-3-6-3Z"
                    fill="currentColor"
                    opacity="0.9"
                  />
                </svg>
              }
            />
            <DashboardSummaryCard
              label="Active jobs"
              value={openJobs}
              hint={`${jobs.length} total listings`}
              trendPercent={activeJobsTrend.pct}
              trendDirection={activeJobsTrend.direction}
              icon={
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M7 7h10v12H7V7Zm2 2v8h6V9H9Zm-4-4h2v4H5V5Zm12 0h2v4h-2V5Z"
                    fill="currentColor"
                    opacity="0.9"
                  />
                </svg>
              }
            />
            <DashboardSummaryCard
              label="Interviews scheduled"
              value={workspaceUpcomingInterviews}
              hint="Upcoming & calendar holds"
              trendPercent={interviewsTrend.pct}
              trendDirection={interviewsTrend.direction}
              icon={
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M7 2v2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7Zm-2 8h14v10H5V10Zm2 2v2h4v-2H7Z"
                    fill="currentColor"
                    opacity="0.9"
                  />
                </svg>
              }
            />
            <DashboardSummaryCard
              label="Offers released"
              value={workspaceOffersCount}
              hint="Candidates currently in offer"
              trendPercent={offersTrend.pct}
              trendDirection={offersTrend.direction}
              icon={
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M12 2l7 4v6c0 5-3 9-7 10-4-1-7-5-7-10V6l7-4Zm0 2.2L7 7.3V10c0 3.5 2 6.5 5 7.8 3-1.3 5-4.3 5-7.8V7.3L12 4.2Zm-1 4.8h2v5h-2V9Zm0 6h2v2h-2v-2Z"
                    fill="currentColor"
                    opacity="0.9"
                  />
                </svg>
              }
            />
          </>
        )}
      </div>

      <div className="dashboard-analytics-block">
        <div className="dashboard-analytics-row dashboard-analytics-row--triple">
          <section className="dashboard-analytics-card">
            <header className="dashboard-analytics-card__header">
              <h3 className="dashboard-analytics-card__title">Pipeline funnel</h3>
              <p className="dashboard-analytics-card__desc">Workspace reach by furthest stage</p>
            </header>
            <div className="dashboard-analytics-card__body">
              {appsLoading ? (
                <DashboardPanelSkeleton lines={4} />
              ) : funnelCounts.every(n => n === 0) ? (
                <div className="dashboard-empty">No pipeline data yet.</div>
              ) : (
                <div className="dashboard-chart-shell dashboard-chart-shell-compact">
                  <Bar
                    data={{
                      labels: PIPELINE_FUNNEL_STAGES.map(s => formatDashboardLabel(s)),
                      datasets: [
                        {
                          label: 'Candidates',
                          data: funnelCounts,
                          backgroundColor: PIPELINE_FUNNEL_STAGES.map(
                            (_, i) => `rgba(14, 165, 233, ${0.35 + i * 0.12})`,
                          ),
                          borderColor: '#0ea5e9',
                          borderWidth: 1,
                          borderRadius: 6,
                          maxBarThickness: 28,
                        },
                      ],
                    }}
                    options={funnelBarOptions}
                  />
                </div>
              )}
            </div>
          </section>
          <section className="dashboard-analytics-card">
            <header className="dashboard-analytics-card__header">
              <h3 className="dashboard-analytics-card__title">Applications over time</h3>
              <p className="dashboard-analytics-card__desc">Last six months</p>
            </header>
            <div className="dashboard-analytics-card__body">
              {appsLoading ? (
                <DashboardPanelSkeleton lines={3} />
              ) : monthlyTrend.every(item => item.value === 0) ? (
                <div className="dashboard-empty">No recent application activity yet.</div>
              ) : (
                <div className="dashboard-chart-shell dashboard-chart-shell-compact">
                  <Line
                    data={{
                      labels: monthlyTrend.map(item => item.label),
                      datasets: [
                        {
                          data: monthlyTrend.map(item => item.value),
                          borderColor: '#0ea5e9',
                          backgroundColor: 'rgba(14, 165, 233, 0.12)',
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
            {!appsLoading && monthlyTrend.some(item => item.value > 0) ? (
              <p className="dashboard-analytics-card__footer">
                {monthlyDeltaLabel} vs last month · {currentMonthApplications} this month
              </p>
            ) : null}
          </section>
          <section className="dashboard-analytics-card">
            <header className="dashboard-analytics-card__header">
              <h3 className="dashboard-analytics-card__title">Source of candidates</h3>
              <p className="dashboard-analytics-card__desc">All roles</p>
            </header>
            <div className="dashboard-analytics-card__body">
              {appsLoading ? (
                <DashboardPanelSkeleton lines={3} />
              ) : workspaceSourceSlices.length === 0 ? (
                <div className="dashboard-empty">No source data yet.</div>
              ) : (
                <div className="dashboard-chart-shell dashboard-chart-shell-compact">
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
          </section>
        </div>

        <div className="dashboard-analytics-row dashboard-analytics-row--split">
          <section className="dashboard-analytics-card dashboard-analytics-card--grow">
            <header className="dashboard-analytics-card__header">
              <h3 className="dashboard-analytics-card__title">Candidates by job</h3>
              <p className="dashboard-analytics-card__desc">Top roles by application volume</p>
            </header>
            <div className="dashboard-analytics-card__body">
              {appsLoading || jobsLoading ? (
                <DashboardPanelSkeleton lines={5} />
              ) : applicantsByJob.length === 0 ? (
                <div className="dashboard-empty">No applications yet.</div>
              ) : (
                <div className="dashboard-chart-shell dashboard-chart-shell-tall">
                  <Bar
                    data={{
                      labels: applicantsByJob.map(({ job }) =>
                        job.title.length > 34 ? `${job.title.slice(0, 32)}…` : job.title,
                      ),
                      datasets: [
                        {
                          data: applicantsByJob.map(({ count }) => count),
                          backgroundColor: 'rgba(37, 99, 235, 0.55)',
                          borderRadius: 6,
                          maxBarThickness: 18,
                        },
                      ],
                    }}
                    options={jobDistributionOptions}
                  />
                </div>
              )}
            </div>
          </section>
          <section className="dashboard-analytics-card dashboard-analytics-card--aside">
            <header className="dashboard-analytics-card__header">
              <h3 className="dashboard-analytics-card__title">Activity</h3>
              <p className="dashboard-analytics-card__desc">Latest workspace signals</p>
            </header>
            <div className="dashboard-analytics-card__body dashboard-activity-feed">
              {appsLoading && interviewsLoading ? (
                <DashboardPanelSkeleton lines={6} />
              ) : activityFeed.length === 0 ? (
                <div className="dashboard-empty">No recent activity.</div>
              ) : (
                <ul className="dashboard-activity-list">
                  {activityFeed.map(item => (
                    <li key={item.id} className="dashboard-activity-item">
                      <span className={`dashboard-activity-dot dashboard-activity-dot--${item.kind}`} aria-hidden />
                      <div className="dashboard-activity-copy">
                        <span className="dashboard-activity-title">{item.title}</span>
                        <span className="dashboard-activity-sub">{item.subtitle}</span>
                      </div>
                      <time className="dashboard-activity-time" dateTime={item.at}>
                        {formatRelativeTime(item.at)}
                      </time>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>

        <section className="dashboard-analytics-card dashboard-jobs-overview">
          <header className="dashboard-analytics-card__header dashboard-analytics-card__header--row">
            <div>
              <h3 className="dashboard-analytics-card__title">Jobs overview</h3>
              <p className="dashboard-analytics-card__desc">Applicant load and dominant stage</p>
            </div>
          </header>
          <div className="dashboard-analytics-card__body dashboard-analytics-card__body--flush">
            {jobsLoading ? (
              <DashboardPanelSkeleton lines={5} />
            ) : jobs.length === 0 ? (
              <div className="dashboard-empty">No jobs yet.</div>
            ) : (
              <div className="dashboard-table-scroll">
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th>Job</th>
                      <th>Status</th>
                      <th className="dashboard-table__num">Applicants</th>
                      <th>Stage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...jobs]
                      .sort((a, b) => {
                        const ca = applicantCountByJob.get(a.id) ?? 0
                        const cb = applicantCountByJob.get(b.id) ?? 0
                        return cb - ca
                      })
                      .map(job => {
                        const applicantCount = applicantCountByJob.get(job.id) ?? 0
                        const stage = jobDominantStage.get(job.id) ?? 'applied'
                        return (
                          <tr key={job.id}>
                            <td>
                              <Link className="dashboard-table-job" to={`/account/${accountId}/jobs/${job.id}/edit`}>
                                {job.title}
                              </Link>
                              <span className="dashboard-table-sub">{job.department ?? '—'}</span>
                            </td>
                            <td>
                              <span className={`tag ${STAGE_COLORS[job.status] ?? 'tag-blue'}`}>
                                {formatDashboardLabel(job.status)}
                              </span>
                            </td>
                            <td className="dashboard-table__num">{applicantCount}</td>
                            <td>
                              <span className={`tag ${STAGE_COLORS[stage] ?? 'tag-blue'}`}>
                                {formatDashboardLabel(stage)}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
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

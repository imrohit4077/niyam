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
import { formatTrendPercent } from '../components/dashboard/dashboardTrend'

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

const PIPELINE_FUNNEL_STAGES = ['applied', 'screening', 'interview', 'offer', 'hired'] as const
const MS_DAY = 86400000

function countApplicationsCreatedBetween(apps: Application[], startMs: number, endMs: number) {
  return apps.filter(a => {
    const t = new Date(a.created_at).getTime()
    return t >= startMs && t < endMs
  }).length
}

function countJobsCreatedBetween(jobsList: Job[], startMs: number, endMs: number) {
  return jobsList.filter(j => {
    const t = new Date(j.created_at).getTime()
    return t >= startMs && t < endMs
  }).length
}

function countInterviewsScheduledBetween(rows: InterviewAssignmentRow[], startMs: number, endMs: number) {
  return rows.filter(r => {
    if (!r.scheduled_at) return false
    const t = new Date(r.scheduled_at).getTime()
    return t >= startMs && t < endMs
  }).length
}

function countOffersTouchedBetween(apps: Application[], startMs: number, endMs: number) {
  return apps.filter(a => {
    if (a.status !== 'offer') return false
    const t = new Date(a.updated_at).getTime()
    return t >= startMs && t < endMs
  }).length
}

type ActivityItem = {
  id: string
  title: string
  meta: string
  at: string
  tone: 'applied' | 'stage' | 'interview' | 'offer' | 'hired' | 'neutral'
}

function buildActivityFeed(
  apps: Application[],
  interviewRows: InterviewAssignmentRow[],
  maxItems: number,
): ActivityItem[] {
  const items: ActivityItem[] = []

  apps.forEach(app => {
    const name = app.candidate_name || app.candidate_email || 'Candidate'
    const jobRef = `Job #${app.job_id}`
    items.push({
      id: `app-${app.id}`,
      title: `${name} applied`,
      meta: jobRef,
      at: app.created_at,
      tone: 'applied',
    })
    const history = [...(app.stage_history ?? [])].sort(
      (a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime(),
    )
    const latest = history[0]
    if (latest && new Date(latest.changed_at).getTime() > new Date(app.created_at).getTime() + 1000) {
      const tone =
        latest.stage === 'hired'
          ? 'hired'
          : latest.stage === 'offer'
            ? 'offer'
            : latest.stage === 'interview'
              ? 'interview'
              : 'stage'
      items.push({
        id: `stage-${app.id}-${latest.changed_at}`,
        title: `${name} → ${formatDashboardLabel(latest.stage)}`,
        meta: jobRef,
        at: latest.changed_at,
        tone,
      })
    }
  })

  interviewRows.forEach(row => {
    const name = row.application?.candidate_name || row.application?.candidate_email || 'Candidate'
    const jobTitle = row.job?.title ?? `Job #${row.application?.job_id ?? '—'}`
    if (row.scheduled_at) {
      items.push({
        id: `int-${row.id}-sched`,
        title: `Interview scheduled for ${name}`,
        meta: jobTitle,
        at: row.scheduled_at,
        tone: 'interview',
      })
    }
  })

  items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
  const seen = new Set<string>()
  const deduped: ActivityItem[] = []
  for (const it of items) {
    const key = `${it.title}|${it.at}`
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(it)
    if (deduped.length >= maxItems) break
  }
  return deduped
}

function LoadingRow() {
  return (
    <div className="dashboard-panel-skeleton" aria-busy="true" aria-label="Loading">
      <div className="dashboard-skeleton-line dashboard-skeleton-line--lg" />
      <div className="dashboard-skeleton-line" />
      <div className="dashboard-skeleton-line dashboard-skeleton-line--short" />
    </div>
  )
}

function SummaryCardsSkeleton() {
  return (
    <div className="dashboard-summary-grid" aria-busy="true" aria-label="Loading summary">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="dashboard-summary-card dashboard-summary-card--skeleton">
          <div className="dashboard-skeleton-circle" />
          <div className="dashboard-skeleton-line dashboard-skeleton-line--sm" />
          <div className="dashboard-skeleton-line dashboard-skeleton-line--value" />
        </div>
      ))}
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
  const [jobApplications, setJobApplications] = useState<Application[]>([])
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [analyticsError, setAnalyticsError] = useState('')
  const [activePipelineModal, setActivePipelineModal] = useState<PipelineModalKind | null>(null)
  const [trendAnchorMs] = useState(() => Date.now())

  useEffect(() => {
    let cancelled = false
    void queueMicrotask(() => {
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
    void queueMicrotask(() => {
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

    applicationsApi
      .list(token)
      .then(rows => {
        if (!cancelled) setAllApplications(rows)
      })
      .catch(() => {
        if (!cancelled) setAllApplications([])
      })

    return () => {
      cancelled = true
    }
  }, [token])

  useEffect(() => {
    if (!selectedJobId) {
      void queueMicrotask(() => {
        setJobApplications([])
        setAnalyticsError('')
      })
      return
    }

    let cancelled = false
    void queueMicrotask(() => {
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

  const pipelineWorkspaceCounts = useMemo(() => {
    const acc: Record<string, number> = {}
    PIPELINE_FUNNEL_STAGES.forEach(s => {
      acc[s] = 0
    })
    allApplications.forEach(application => {
      const s = application.status
      if (s in acc) acc[s] += 1
    })
    return PIPELINE_FUNNEL_STAGES.map(stage => ({
      key: stage,
      label: formatDashboardLabel(stage),
      value: acc[stage] ?? 0,
      color: DASHBOARD_CHART_COLORS[PIPELINE_FUNNEL_STAGES.indexOf(stage) % DASHBOARD_CHART_COLORS.length],
    }))
  }, [allApplications])

  const applicationsByJobId = useMemo(() => {
    const m = new Map<number, number>()
    allApplications.forEach(a => {
      m.set(a.job_id, (m.get(a.job_id) ?? 0) + 1)
    })
    return m
  }, [allApplications])

  const jobDistributionSlices = useMemo(() => {
    const entries = jobs
      .map(job => [job.title, applicationsByJobId.get(job.id) ?? 0] as [string, number])
      .filter(([, n]) => n > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
    return makeDashboardSlices(entries)
  }, [jobs, applicationsByJobId])

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

  const activityFeedItems = useMemo(
    () => buildActivityFeed(allApplications, interviews, 14),
    [allApplications, interviews],
  )

  const dominantStageByJobId = useMemo(() => {
    const perJob: Record<number, Record<string, number>> = {}
    allApplications.forEach(application => {
      const st = application.status
      if (!PIPELINE_FUNNEL_STAGES.includes(st as (typeof PIPELINE_FUNNEL_STAGES)[number])) return
      if (!perJob[application.job_id]) perJob[application.job_id] = {}
      perJob[application.job_id][st] = (perJob[application.job_id][st] ?? 0) + 1
    })
    const result = new Map<number, string>()
    Object.entries(perJob).forEach(([jobIdStr, counts]) => {
      let bestStage: (typeof PIPELINE_FUNNEL_STAGES)[number] = 'applied'
      let bestCount = -1
      PIPELINE_FUNNEL_STAGES.forEach(stage => {
        const n = counts[stage] ?? 0
        const stageIdx = PIPELINE_FUNNEL_STAGES.indexOf(stage)
        const bestIdx = PIPELINE_FUNNEL_STAGES.indexOf(bestStage)
        if (n > bestCount || (n === bestCount && n > 0 && stageIdx > bestIdx)) {
          bestCount = n
          bestStage = stage
        }
      })
      result.set(Number(jobIdStr), bestCount <= 0 ? '—' : bestStage)
    })
    return result
  }, [allApplications])

  const candidateTrend = useMemo(() => {
    const now = trendAnchorMs
    const currStart = now - 30 * MS_DAY
    const prevStart = now - 60 * MS_DAY
    const prevEnd = currStart
    const curr = countApplicationsCreatedBetween(allApplications, currStart, now)
    const prev = countApplicationsCreatedBetween(allApplications, prevStart, prevEnd)
    return { curr, prev, pct: formatTrendPercent(prev, curr) }
  }, [allApplications, trendAnchorMs])

  const activeJobsTrend = useMemo(() => {
    const now = trendAnchorMs
    const currStart = now - 30 * MS_DAY
    const prevStart = now - 60 * MS_DAY
    const prevEnd = currStart
    const curr = countJobsCreatedBetween(jobs, currStart, now)
    const prev = countJobsCreatedBetween(jobs, prevStart, prevEnd)
    return { curr, prev, pct: formatTrendPercent(prev, curr) }
  }, [jobs, trendAnchorMs])

  const interviewsTrend = useMemo(() => {
    const now = trendAnchorMs
    const currStart = now - 30 * MS_DAY
    const prevStart = now - 60 * MS_DAY
    const prevEnd = currStart
    const curr = countInterviewsScheduledBetween(interviews, currStart, now)
    const prev = countInterviewsScheduledBetween(interviews, prevStart, prevEnd)
    return { curr, prev, pct: formatTrendPercent(prev, curr) }
  }, [interviews, trendAnchorMs])

  const offersTrend = useMemo(() => {
    const now = trendAnchorMs
    const currStart = now - 30 * MS_DAY
    const prevStart = now - 60 * MS_DAY
    const prevEnd = currStart
    const curr = countOffersTouchedBetween(allApplications, currStart, now)
    const prev = countOffersTouchedBetween(allApplications, prevStart, prevEnd)
    return { curr, prev, pct: formatTrendPercent(prev, curr) }
  }, [allApplications, trendAnchorMs])

  const funnelChartData = useMemo(() => {
    const labels = pipelineWorkspaceCounts.map(s => s.label)
    const data = pipelineWorkspaceCounts.map(s => s.value)
    const colors = pipelineWorkspaceCounts.map(s => s.color)
    return { labels, data, colors }
  }, [pipelineWorkspaceCounts])

  const funnelMax = Math.max(...funnelChartData.data, 1)
  const funnelBarData = {
    labels: funnelChartData.labels,
    datasets: [
      {
        label: 'Candidates',
        data: funnelChartData.data.map(v => Math.round((v / funnelMax) * 1000) / 10),
        backgroundColor: funnelChartData.colors.map(c => `${c}cc`),
        borderColor: funnelChartData.colors,
        borderWidth: 1,
        borderRadius: 8,
        maxBarThickness: 48,
      },
    ],
  }

  const funnelBarOptions: ChartOptions<'bar'> = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: ctx => {
            const idx = ctx.dataIndex
            const raw = funnelChartData.data[idx] ?? 0
            return `${raw} candidates`
          },
        },
      },
    },
    scales: {
      x: {
        max: 100,
        ticks: {
          color: '#6b7280',
          font: { size: 11 },
          callback: v => (typeof v === 'number' ? `${v}%` : v),
        },
        grid: { color: 'rgba(148,163,184,0.22)' },
      },
      y: {
        ticks: { color: '#374151', font: { size: 12 } },
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
            Pipeline health, hiring velocity, and team activity in one calm workspace view.
          </p>
        </div>
        <div className="dashboard-hero-meta">
          <div className="dashboard-hero-meta-item">
            <span>Pipeline health</span>
            <strong>{conversionRate >= 25 ? 'Strong' : conversionRate >= 10 ? 'Stable' : 'Needs attention'}</strong>
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

      {jobsLoading ? (
        <SummaryCardsSkeleton />
      ) : (
        <div className="dashboard-summary-grid">
          <DashboardSummaryCard
            variant="primary"
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            }
            label="Total candidates"
            value={totalApplicantsAcrossJobs}
            trend={{
              ...candidateTrend.pct,
              caption: 'New applications vs prior 30 days',
            }}
            sublabel={`${monthlyDeltaLabel} vs last month · MoM applications`}
          />
          <DashboardSummaryCard
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                <rect x="2" y="7" width="20" height="14" rx="2" />
                <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
              </svg>
            }
            label="Active jobs"
            value={openJobs}
            trend={{
              ...activeJobsTrend.pct,
              caption: 'Jobs created vs prior 30 days',
            }}
            sublabel={`${jobs.length} total roles · ${openJobs} open`}
          />
          <DashboardSummaryCard
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
            }
            label="Interviews scheduled"
            value={workspaceUpcomingInterviews}
            trend={{
              ...interviewsTrend.pct,
              caption: 'Interview times in window vs prior 30 days',
            }}
            sublabel={`${scheduledInterviews} in selected job scope`}
          />
          <DashboardSummaryCard
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
                <path d="M14 2v6h6M10 13h4M10 17h4" />
              </svg>
            }
            label="Offers released"
            value={allApplications.filter(a => a.status === 'offer').length}
            trend={{
              ...offersTrend.pct,
              caption: 'Offer-stage updates vs prior 30 days',
            }}
            sublabel={`${offerStageCount} on selected job`}
          />
        </div>
      )}

      <div className="dashboard-grid">
        <div className="dashboard-panel-span-12">
          <DashboardPanel title="Candidates pipeline (workspace)">
            <div className="dashboard-panel-content">
              {funnelChartData.data.every(v => v === 0) ? (
                <div className="dashboard-empty">No candidates in funnel stages yet.</div>
              ) : (
                <div className="dashboard-chart-shell dashboard-chart-shell-funnel">
                  <Bar data={funnelBarData} options={funnelBarOptions} />
                </div>
              )}
            </div>
          </DashboardPanel>
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
                  options={lineOptions}
                />
              </div>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Job-wise candidate distribution">
          <div className="dashboard-panel-content">
            {jobDistributionSlices.length === 0 ? (
              <div className="dashboard-empty">No applicants mapped to jobs yet.</div>
            ) : (
              <div className="dashboard-chart-shell dashboard-chart-shell-short">
                <Bar
                  data={{
                    labels: jobDistributionSlices.map(slice => slice.label),
                    datasets: [
                      {
                        data: jobDistributionSlices.map(slice => slice.value),
                        backgroundColor: jobDistributionSlices.map(slice => slice.color),
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
        </DashboardPanel>

        <DashboardPanel title="Source of candidates (workspace)">
          <div className="dashboard-panel-content">
            {workspaceSourceSlices.length === 0 ? (
              <div className="dashboard-empty">No application source data yet.</div>
            ) : (
              <div className="dashboard-chart-shell dashboard-chart-shell-short">
                <Pie
                  data={{
                    labels: workspaceSourceSlices.map(slice => slice.label),
                    datasets: [
                      {
                        data: workspaceSourceSlices.map(slice => slice.value),
                        backgroundColor: workspaceSourceSlices.map(slice => slice.color),
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
          <div className="dashboard-panel-content">
            {activityFeedItems.length === 0 ? (
              <div className="dashboard-empty">No recent activity yet.</div>
            ) : (
              <ul className="dashboard-activity-feed" aria-label="Recent hiring activity">
                {activityFeedItems.map(item => (
                  <li key={item.id} className={`dashboard-activity-item dashboard-activity-item--${item.tone}`}>
                    <div className="dashboard-activity-dot" aria-hidden />
                    <div className="dashboard-activity-body">
                      <strong>{item.title}</strong>
                      <span className="dashboard-activity-meta">{item.meta}</span>
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

        <div className="dashboard-panel-span-12">
          <DashboardPanel title="Jobs overview">
            <div className="dashboard-panel-content dashboard-panel-content--flush">
              {jobsLoading ? (
                <LoadingRow />
              ) : jobsError ? (
                <ErrorRow msg={jobsError} />
              ) : jobs.length === 0 ? (
                <div className="dashboard-empty">No jobs yet. Create a role to start tracking applicants.</div>
              ) : (
                <div className="dashboard-table-wrap">
                  <table className="dashboard-jobs-table">
                    <thead>
                      <tr>
                        <th scope="col">Job title</th>
                        <th scope="col">Status</th>
                        <th scope="col" className="dashboard-jobs-table-num">
                          Applicants
                        </th>
                        <th scope="col">Stage</th>
                        <th scope="col" className="dashboard-jobs-table-actions">
                          {/* intentionally narrow */}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {jobs.map(job => {
                        const applicants = applicationsByJobId.get(job.id) ?? 0
                        const stageKey = dominantStageByJobId.get(job.id) ?? '—'
                        const stageLabel = stageKey === '—' ? '—' : formatDashboardLabel(stageKey)
                        return (
                          <tr key={job.id}>
                            <td>
                              <button
                                type="button"
                                className="dashboard-table-job-title"
                                onClick={() => setSelectedJobId(String(job.id))}
                              >
                                {job.title}
                              </button>
                              <span className="dashboard-table-job-sub">
                                {job.department ?? 'General'} · {job.location ?? 'Remote / TBD'}
                              </span>
                            </td>
                            <td>
                              <span className={`tag ${STAGE_COLORS[job.status] ?? 'tag-gray'}`}>{formatDashboardLabel(job.status)}</span>
                            </td>
                            <td className="dashboard-jobs-table-num">{applicants}</td>
                            <td>
                              {applicants === 0 ? (
                                <span className="dashboard-table-muted">—</span>
                              ) : (
                                <span className={`tag ${STAGE_COLORS[stageKey] ?? 'tag-blue'}`}>{stageLabel}</span>
                              )}
                            </td>
                            <td className="dashboard-jobs-table-actions">
                              <Link className="dashboard-link dashboard-link--compact" to={`/account/${accountId}/jobs/${job.id}/edit`}>
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
          </DashboardPanel>
        </div>

      </div>
    </>
  )
}

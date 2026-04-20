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
import { SummaryStatCard, type SummaryTrend } from '../components/dashboard/SummaryStatCard'
import { DashboardChartSkeleton, DashboardKpiRowSkeleton } from '../components/dashboard/DashboardSkeleton'

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

const PIPELINE_FUNNEL_STAGES = ['applied', 'screening', 'interview', 'offer', 'hired'] as const

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

function inDateRange(iso: string, startMs: number, endMs: number) {
  const t = new Date(iso).getTime()
  return t >= startMs && t < endMs
}

function pctChange(current: number, previous: number): SummaryTrend {
  if (previous === 0 && current === 0) return { pct: 0, neutral: true }
  if (previous === 0) return { pct: current > 0 ? 100 : 0 }
  return { pct: Math.round(((current - previous) / previous) * 100) }
}

function DashboardPanel({ title, children, span = 6 }: { title: string; children: ReactNode; span?: number }) {
  return (
    <section className="panel dashboard-panel dashboard-modern-panel" style={{ gridColumn: `span ${span}` }}>
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
  const [allApplicationsLoading, setAllApplicationsLoading] = useState(true)
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
    setAllApplicationsLoading(true)

    applicationsApi
      .list(token)
      .then(rows => {
        if (!cancelled) setAllApplications(rows)
      })
      .catch(() => {
        if (!cancelled) setAllApplications([])
      })
      .finally(() => {
        if (!cancelled) setAllApplicationsLoading(false)
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

  const maxFunnelIndexForApplication = (application: Application) => {
    const seen = new Set<string>()
    for (const h of application.stage_history ?? []) {
      if (PIPELINE_FUNNEL_STAGES.includes(h.stage as (typeof PIPELINE_FUNNEL_STAGES)[number])) seen.add(h.stage)
    }
    if (PIPELINE_FUNNEL_STAGES.includes(application.status as (typeof PIPELINE_FUNNEL_STAGES)[number])) {
      seen.add(application.status)
    }
    let maxIdx = -1
    for (const s of seen) {
      const idx = PIPELINE_FUNNEL_STAGES.indexOf(s as (typeof PIPELINE_FUNNEL_STAGES)[number])
      if (idx > maxIdx) maxIdx = idx
    }
    return maxIdx < 0 ? 0 : maxIdx
  }

  const funnelStageCounts = useMemo(() => {
    const furthest = allApplications.map(maxFunnelIndexForApplication)
    return PIPELINE_FUNNEL_STAGES.map((_, stageIdx) =>
      furthest.filter(maxIdx => maxIdx >= stageIdx).length,
    )
  }, [allApplications])

  const applicantsByJobId = useMemo(() => {
    const m = new Map<number, number>()
    for (const a of allApplications) {
      m.set(a.job_id, (m.get(a.job_id) ?? 0) + 1)
    }
    return m
  }, [allApplications])

  const applicationsByJob = useMemo(() => {
    const m = new Map<number, Application[]>()
    for (const a of allApplications) {
      const arr = m.get(a.job_id)
      if (arr) arr.push(a)
      else m.set(a.job_id, [a])
    }
    return m
  }, [allApplications])

  const jobDistributionChart = useMemo(() => {
    const rows = jobs
      .map(job => ({ id: job.id, title: job.title, count: applicantsByJobId.get(job.id) ?? 0 }))
      .filter(r => r.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
    return rows.map(r => ({
      ...r,
      label: r.title.length > 30 ? `${r.title.slice(0, 28)}…` : r.title,
    }))
  }, [jobs, applicantsByJobId])

  const globalSourceSlices = useMemo(
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

  const periodRanges = useMemo(() => {
    const now = new Date()
    const startThis = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
    const endThis = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime()
    const startPrev = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime()
    const endPrev = startThis
    return { startThis, endThis, startPrev, endPrev }
  }, [])

  const summaryPeriodCounts = useMemo(() => {
    const { startThis, endThis, startPrev, endPrev } = periodRanges
    let candThis = 0
    let candPrev = 0
    let offersThis = 0
    let offersPrev = 0
    for (const a of allApplications) {
      if (inDateRange(a.created_at, startThis, endThis)) candThis += 1
      else if (inDateRange(a.created_at, startPrev, endPrev)) candPrev += 1
      if (a.status === 'offer') {
        if (inDateRange(a.updated_at, startThis, endThis)) offersThis += 1
        else if (inDateRange(a.updated_at, startPrev, endPrev)) offersPrev += 1
      }
    }
    let intThis = 0
    let intPrev = 0
    for (const row of interviews) {
      const t = row.scheduled_at ?? row.created_at
      if (inDateRange(t, startThis, endThis)) intThis += 1
      else if (inDateRange(t, startPrev, endPrev)) intPrev += 1
    }
    let jobsThis = 0
    let jobsPrev = 0
    for (const j of jobs) {
      if (inDateRange(j.created_at, startThis, endThis)) jobsThis += 1
      else if (inDateRange(j.created_at, startPrev, endPrev)) jobsPrev += 1
    }
    return { candThis, candPrev, offersThis, offersPrev, intThis, intPrev, jobsThis, jobsPrev }
  }, [allApplications, interviews, jobs, periodRanges])

  type ActivityItem = {
    id: string
    at: string
    title: string
    subtitle: string
    icon: 'candidate' | 'interview' | 'offer' | 'hire' | 'job'
  }

  const activityFeed = useMemo((): ActivityItem[] => {
    const items: ActivityItem[] = []
    const recentApps = [...allApplications].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 40)
    for (const a of recentApps) {
      items.push({
        id: `app-${a.id}-c`,
        at: a.created_at,
        title: 'Candidate applied',
        subtitle: `${a.candidate_name || a.candidate_email} · Application`,
        icon: 'candidate',
      })
      if (a.status === 'hired') {
        items.push({
          id: `app-${a.id}-h`,
          at: a.updated_at,
          title: 'Candidate hired',
          subtitle: `${a.candidate_name || a.candidate_email}`,
          icon: 'hire',
        })
      } else if (a.status === 'offer') {
        items.push({
          id: `app-${a.id}-o`,
          at: a.updated_at,
          title: 'Offer released',
          subtitle: `${a.candidate_name || a.candidate_email}`,
          icon: 'offer',
        })
      }
    }
    const recentInts = [...interviews]
      .filter(row => row.status === 'scheduled' || row.status === 'pending' || !!row.scheduled_at)
      .sort((a, b) => new Date(b.scheduled_at || b.updated_at).getTime() - new Date(a.scheduled_at || a.updated_at).getTime())
      .slice(0, 20)
    for (const row of recentInts) {
      items.push({
        id: `int-${row.id}`,
        at: row.scheduled_at || row.updated_at,
        title: 'Interview scheduled',
        subtitle: `${row.application?.candidate_name || row.application?.candidate_email || 'Candidate'} · ${row.job?.title ?? 'Job'}`,
        icon: 'interview',
      })
    }
    const recentJobs = [...jobs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 12)
    for (const j of recentJobs) {
      items.push({
        id: `job-${j.id}`,
        at: j.created_at,
        title: 'Job created',
        subtitle: j.title,
        icon: 'job',
      })
    }
    return items.sort((x, y) => new Date(y.at).getTime() - new Date(x.at).getTime()).slice(0, 14)
  }, [allApplications, interviews, jobs])

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

  const funnelLabels = PIPELINE_FUNNEL_STAGES.map(s => formatDashboardLabel(s))
  const funnelColors = PIPELINE_FUNNEL_STAGES.map((_, i) => DASHBOARD_CHART_COLORS[i % DASHBOARD_CHART_COLORS.length])
  const funnelBarData = {
    labels: funnelLabels,
    datasets: [
      {
        label: 'In pipeline (≥ stage)',
        data: funnelStageCounts,
        backgroundColor: funnelColors.map(c => `${c}cc`),
        borderColor: funnelColors,
        borderWidth: 1,
        borderRadius: 8,
        maxBarThickness: 44,
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
            const raw = ctx.raw
            const n = typeof raw === 'number' ? raw : Number(raw)
            return ` ${n} candidate${n === 1 ? '' : 's'} at or past this stage`
          },
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: { color: '#6b7280', precision: 0, font: { size: 11 } },
        grid: { color: 'rgba(148,163,184,0.22)' },
      },
      y: {
        ticks: { color: '#475569', font: { size: 11, weight: 600 } },
        grid: { display: false },
      },
    },
  }

  const jobWiseBarOptions: ChartOptions<'bar'> = {
    ...barOptions,
    indexAxis: 'y',
    scales: {
      x: {
        beginAtZero: true,
        ticks: { color: '#6b7280', precision: 0, font: { size: 11 } },
        grid: { color: 'rgba(148,163,184,0.22)' },
      },
      y: {
        ticks: { color: '#475569', font: { size: 10, weight: 600 } },
        grid: { display: false },
      },
    },
  }

  const sourcePieOptions: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: { boxWidth: 10, usePointStyle: true, pointStyle: 'circle', font: { size: 11 } },
      },
    },
  }

  const totalOffersReleased = allApplications.filter(a => a.status === 'offer').length
  const { candThis, candPrev, offersThis, offersPrev, intThis, intPrev, jobsThis, jobsPrev } = summaryPeriodCounts
  const candidatesTrend = pctChange(candThis, candPrev)
  const jobsTrend = pctChange(jobsThis, jobsPrev)
  const interviewsTrend = pctChange(intThis, intPrev)
  const offersTrend = pctChange(offersThis, offersPrev)

  const activityIconSvg = (kind: ActivityItem['icon']) => {
    const common = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8 }
    switch (kind) {
      case 'candidate':
        return (
          <svg {...common}>
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        )
      case 'interview':
        return (
          <svg {...common}>
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="M8 3v4M16 3v4M3 11h18" />
          </svg>
        )
      case 'offer':
        return (
          <svg {...common}>
            <path d="M4 12h16M8 8h8v10H8z" />
            <path d="M9 8V6a3 3 0 0 1 6 0v2" />
          </svg>
        )
      case 'hire':
        return (
          <svg {...common}>
            <path d="M9 11l2 2 4-4" />
            <circle cx="12" cy="12" r="9" />
          </svg>
        )
      default:
        return (
          <svg {...common}>
            <path d="M4 7h16M4 12h10M4 17h14" />
          </svg>
        )
    }
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

      {jobsLoading || allApplicationsLoading || interviewsLoading ? (
        <DashboardKpiRowSkeleton />
      ) : (
        <div className="dashboard-kpi-grid dashboard-kpi-grid-summary">
          <SummaryStatCard
            variant="primary"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            }
            label="Total candidates"
            value={totalApplicantsAcrossJobs}
            hint="Applications across all jobs"
            trend={candidatesTrend}
          />
          <SummaryStatCard
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
                <rect x="3" y="7" width="18" height="13" rx="2" />
                <path d="M8 7V5a4 4 0 0 1 8 0v2" />
              </svg>
            }
            label="Active jobs"
            value={openJobs}
            hint={`${jobs.length} total roles in workspace`}
            trend={jobsTrend}
          />
          <SummaryStatCard
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="M8 3v4M16 3v4M3 11h18" />
              </svg>
            }
            label="Interviews scheduled"
            value={workspaceUpcomingInterviews}
            hint="Pending or scheduled with a time"
            trend={interviewsTrend}
          />
          <SummaryStatCard
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
                <path d="M4 12h16M8 8h8v10H8z" />
                <path d="M9 8V6a3 3 0 0 1 6 0v2" />
              </svg>
            }
            label="Offers released"
            value={totalOffersReleased}
            hint="Applications currently in offer stage"
            trend={offersTrend}
          />
        </div>
      )}

      <section className="dashboard-charts-band" aria-label="Workspace analytics charts">
        <div className="dashboard-charts-grid">
          <div className="dashboard-chart-card">
            <h3 className="dashboard-chart-card-title">Pipeline funnel</h3>
            <p className="dashboard-chart-card-desc">Candidates at or past each stage (workspace-wide)</p>
            {allApplicationsLoading ? (
              <DashboardChartSkeleton height={240} />
            ) : funnelStageCounts.every(v => v === 0) ? (
              <div className="dashboard-empty dashboard-empty-compact">No pipeline data yet.</div>
            ) : (
              <div className="dashboard-chart-shell dashboard-chart-shell-funnel">
                <Bar data={funnelBarData} options={funnelBarOptions} />
              </div>
            )}
          </div>
          <div className="dashboard-chart-card">
            <h3 className="dashboard-chart-card-title">Applications over time</h3>
            <p className="dashboard-chart-card-desc">New applications by month (last 6 months)</p>
            {allApplicationsLoading ? (
              <DashboardChartSkeleton height={240} />
            ) : monthlyTrend.every(item => item.value === 0) ? (
              <div className="dashboard-empty dashboard-empty-compact">No recent application activity yet.</div>
            ) : (
              <div className="dashboard-chart-shell dashboard-chart-shell-funnel">
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
          <div className="dashboard-chart-card">
            <h3 className="dashboard-chart-card-title">Candidates by job</h3>
            <p className="dashboard-chart-card-desc">Top roles by applicant volume</p>
            {jobsLoading || allApplicationsLoading ? (
              <DashboardChartSkeleton height={240} />
            ) : jobDistributionChart.length === 0 ? (
              <div className="dashboard-empty dashboard-empty-compact">No applicants assigned to jobs yet.</div>
            ) : (
              <div className="dashboard-chart-shell dashboard-chart-shell-funnel">
                <Bar
                  data={{
                    labels: jobDistributionChart.map(r => r.label),
                    datasets: [
                      {
                        label: 'Applicants',
                        data: jobDistributionChart.map(r => r.count),
                        backgroundColor: 'rgba(37,99,235,0.55)',
                        borderColor: '#2563eb',
                        borderRadius: 8,
                        maxBarThickness: 28,
                      },
                    ],
                  }}
                  options={jobWiseBarOptions}
                />
              </div>
            )}
          </div>
          <div className="dashboard-chart-card">
            <h3 className="dashboard-chart-card-title">Source of candidates</h3>
            <p className="dashboard-chart-card-desc">All applications by source type</p>
            {allApplicationsLoading ? (
              <DashboardChartSkeleton height={240} />
            ) : globalSourceSlices.length === 0 ? (
              <div className="dashboard-empty dashboard-empty-compact">No source data yet.</div>
            ) : (
              <div className="dashboard-chart-shell dashboard-chart-shell-funnel">
                <Pie
                  data={{
                    labels: globalSourceSlices.map(s => s.label),
                    datasets: [
                      {
                        data: globalSourceSlices.map(s => s.value),
                        backgroundColor: globalSourceSlices.map(s => s.color),
                        borderColor: '#ffffff',
                        borderWidth: 2,
                      },
                    ],
                  }}
                  options={sourcePieOptions}
                />
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="dashboard-grid">
        <DashboardPanel title="Recent activity" span={5}>
          <div className="dashboard-panel-content dashboard-activity-panel">
            {jobsLoading && allApplicationsLoading && interviewsLoading ? (
              <div className="dashboard-skeleton-stack">
                {Array.from({ length: 6 }, (_, i) => (
                  <div key={i} className="dashboard-activity-skeleton-row">
                    <div className="skeleton-line skeleton-activity-icon" />
                    <div className="dashboard-activity-skeleton-text">
                      <div className="skeleton-line skeleton-line-body" style={{ width: '70%' }} />
                      <div className="skeleton-line skeleton-line-body" style={{ width: '92%' }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : activityFeed.length === 0 ? (
              <div className="dashboard-empty">No recent activity yet.</div>
            ) : (
              <ul className="dashboard-activity-list">
                {activityFeed.map(item => (
                  <li key={item.id} className="dashboard-activity-item">
                    <div className="dashboard-activity-icon" aria-hidden>
                      {activityIconSvg(item.icon)}
                    </div>
                    <div className="dashboard-activity-body">
                      <div className="dashboard-activity-title-row">
                        <strong>{item.title}</strong>
                        <time dateTime={item.at}>{formatDateTimeShort(item.at)}</time>
                      </div>
                      <p className="dashboard-activity-sub">{item.subtitle}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Jobs overview" span={7}>
          <div className="dashboard-panel-content dashboard-jobs-overview-wrap">
            {jobsLoading ? (
              <DashboardChartSkeleton height={200} />
            ) : jobsError ? (
              <ErrorRow msg={jobsError} />
            ) : jobs.length === 0 ? (
              <div className="dashboard-empty">No jobs yet. Create a role to start hiring.</div>
            ) : (
              <div className="dashboard-table-scroll">
                <table className="dashboard-jobs-table">
                  <thead>
                    <tr>
                      <th>Job title</th>
                      <th>Status</th>
                      <th>Applicants</th>
                      <th>Stage focus</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map(job => {
                      const count = applicantsByJobId.get(job.id) ?? 0
                      const jobApps = applicationsByJob.get(job.id) ?? []
                      const bySt = jobApps.reduce<Record<string, number>>((acc, a) => {
                        acc[a.status] = (acc[a.status] ?? 0) + 1
                        return acc
                      }, {})
                      const dominant =
                        PIPELINE_FUNNEL_STAGES.map(s => ({ s, n: bySt[s] ?? 0 })).sort((a, b) => b.n - a.n)[0] ?? null
                      const stageLabel =
                        count === 0
                          ? '—'
                          : dominant && dominant.n > 0
                            ? formatDashboardLabel(dominant.s)
                            : formatDashboardLabel(jobApps[0]?.status ?? 'applied')
                      return (
                        <tr
                          key={job.id}
                          className={selectedJobId === String(job.id) ? 'dashboard-jobs-table-row-active' : undefined}
                        >
                          <td>
                            <button type="button" className="dashboard-job-table-title" onClick={() => setSelectedJobId(String(job.id))}>
                              {job.title}
                            </button>
                            <div className="dashboard-job-table-meta">{job.department ?? 'General'} · {job.location ?? '—'}</div>
                          </td>
                          <td>
                            <span className={`tag ${STAGE_COLORS[job.status] ?? 'tag-blue'}`}>{formatDashboardLabel(job.status)}</span>
                          </td>
                          <td>{count}</td>
                          <td>{stageLabel}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </DashboardPanel>

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

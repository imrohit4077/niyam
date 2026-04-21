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
import { Bar, Doughnut, Line } from 'react-chartjs-2'
import type { DashboardOutletContext } from '../layouts/DashboardOutletContext'
import { jobsApi, type Job } from '../api/jobs'
import { applicationsApi, type Application } from '../api/applications'
import { interviewsApi, type InterviewAssignmentRow } from '../api/interviews'
import { DashboardSummaryCard } from '../components/dashboard/DashboardSummaryCard'
import type { DashboardTrend } from '../components/dashboard/DashboardSummaryCard'
import { countInMonthKeys, monthKey, trendPctVsPriorWindow, windowDayCounts } from '../components/dashboard/dashboardMetrics'

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

const PIPELINE_FUNNEL_LABELS = ['Applied', 'Screening', 'Interview', 'Offer', 'Hired'] as const

function workspaceCumulativeFunnelCounts(applications: Application[]) {
  const active = applications.filter(a => a.status !== 'rejected' && a.status !== 'withdrawn')
  const has = (...statuses: string[]) => active.filter(a => statuses.includes(a.status)).length
  const hired = has('hired')
  const offer = has('offer', 'hired')
  const interview = has('interview', 'offer', 'hired')
  const screening = has('screening', 'interview', 'offer', 'hired')
  const applied = active.length
  return [applied, screening, interview, offer, hired]
}

function makeTrend(label: string, t: { direction: 'up' | 'down' | 'flat'; pct: number } | null): DashboardTrend | null {
  if (!t) return null
  return { direction: t.direction, pct: t.pct, label }
}

type ActivityItem = {
  id: string
  title: string
  meta: string
  at: string
  tone: 'neutral' | 'positive' | 'schedule'
}

function LoadingRow() {
  return (
    <div className="dashboard-loading-row">
      <div className="spinner" style={{ margin: '0 auto 8px', width: 24, height: 24 }} />
      Loading...
    </div>
  )
}

function DashboardSkeletonBlock({ tall }: { tall?: boolean }) {
  return (
    <div className={`dashboard-skeleton-block${tall ? ' dashboard-skeleton-block--tall' : ''}`}>
      <div className="dashboard-skeleton-line dashboard-skeleton-line--short" />
      <div className="dashboard-skeleton-line" />
      <div className="dashboard-skeleton-line dashboard-skeleton-line--medium" />
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

function DashboardPanel({ title, className, children }: { title: string; className?: string; children: ReactNode }) {
  return (
    <section className={`panel dashboard-panel dashboard-modern-panel${className ? ` ${className}` : ''}`}>
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
  const totalCandidates = useMemo(() => new Set(allApplications.map(a => a.candidate_email.toLowerCase())).size, [allApplications])
  const offersReleasedCount = useMemo(
    () => allApplications.filter(a => a.status === 'offer').length,
    [allApplications],
  )
  const funnelCounts = useMemo(() => workspaceCumulativeFunnelCounts(allApplications), [allApplications])
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
    const m = new Map<number, number>()
    for (const a of allApplications) {
      m.set(a.job_id, (m.get(a.job_id) ?? 0) + 1)
    }
    return m
  }, [allApplications])
  const jobDistributionSlices = useMemo(() => {
    const rows = jobs
      .map(job => ({
        key: String(job.id),
        label: job.title.length > 28 ? `${job.title.slice(0, 26)}…` : job.title,
        value: applicantsByJobId.get(job.id) ?? 0,
      }))
      .filter(r => r.value > 0)
      .sort((a, b) => b.value - a.value)
    const top = rows.slice(0, 8)
    const rest = rows.slice(8)
    const otherSum = rest.reduce((s, r) => s + r.value, 0)
    if (otherSum > 0) top.push({ key: 'other', label: 'Other roles', value: otherSum })
    return top.map((row, index) => ({
      ...row,
      color: DASHBOARD_CHART_COLORS[index % DASHBOARD_CHART_COLORS.length],
    }))
  }, [jobs, applicantsByJobId])
  const activityFeed = useMemo((): ActivityItem[] => {
    const items: ActivityItem[] = []
    const recentApps = [...allApplications]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 14)
    for (const a of recentApps) {
      const jobTitle = jobs.find(j => j.id === a.job_id)?.title ?? `Job #${a.job_id}`
      items.push({
        id: `app-${a.id}`,
        title: `Candidate added — ${a.candidate_name || a.candidate_email}`,
        meta: `${jobTitle} · ${formatDashboardLabel(a.status)}`,
        at: a.created_at,
        tone: 'neutral',
      })
    }
    const recentIv = [...interviews]
      .filter(row => row.scheduled_at)
      .sort((a, b) => new Date(b.scheduled_at!).getTime() - new Date(a.scheduled_at!).getTime())
      .slice(0, 10)
    for (const row of recentIv) {
      const name = row.application?.candidate_name || row.application?.candidate_email || 'Candidate'
      const jt = row.job?.title ?? `Job #${row.application?.job_id ?? '—'}`
      items.push({
        id: `iv-${row.id}`,
        title: `Interview scheduled — ${name}`,
        meta: `${jt} · ${formatDashboardLabel(row.status)}`,
        at: row.scheduled_at!,
        tone: 'schedule',
      })
    }
    items.sort((x, y) => new Date(y.at).getTime() - new Date(x.at).getTime())
    return items.slice(0, 12)
  }, [allApplications, interviews, jobs])
  const now = useMemo(() => new Date(), [])
  const prevMonthKey = useMemo(() => {
    const d = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    return monthKey(d)
  }, [now])
  const candidateEmailsThisMonth = useMemo(() => {
    const keys = new Set([monthKey(now)])
    return allApplications.filter(a => keys.has(monthKey(new Date(a.created_at)))).map(a => a.candidate_email.toLowerCase())
  }, [allApplications, now])
  const candidateEmailsPrevMonth = useMemo(() => {
    const keys = new Set([prevMonthKey])
    return allApplications.filter(a => keys.has(monthKey(new Date(a.created_at)))).map(a => a.candidate_email.toLowerCase())
  }, [allApplications, prevMonthKey])
  const uniqueCandidatesMoM = useMemo(() => {
    const cur = new Set(candidateEmailsThisMonth).size
    const prev = new Set(candidateEmailsPrevMonth).size
    return trendPctVsPriorWindow({ recent: cur, prior: prev })
  }, [candidateEmailsThisMonth, candidateEmailsPrevMonth])
  const applicationsMoM = useMemo(() => {
    const cur = countInMonthKeys(allApplications.map(a => a.created_at), new Set([monthKey(now)]))
    const prev = countInMonthKeys(allApplications.map(a => a.created_at), new Set([prevMonthKey]))
    return trendPctVsPriorWindow({ recent: cur, prior: prev })
  }, [allApplications, now, prevMonthKey])
  const interviewScheduleTrend = useMemo(() => {
    const dates = interviews.filter(r => r.scheduled_at).map(r => r.scheduled_at!)
    return trendPctVsPriorWindow(windowDayCounts(dates, 28, 28))
  }, [interviews])
  const offersMoM = useMemo(() => {
    const toOfferAt = (a: Application) => {
      const fromHistory = [...(a.stage_history ?? [])]
        .filter(h => h.stage === 'offer')
        .sort((x, y) => new Date(x.changed_at).getTime() - new Date(y.changed_at).getTime())[0]?.changed_at
      return fromHistory ?? (a.status === 'offer' || a.status === 'hired' ? a.updated_at : null)
    }
    const curKeys = new Set([monthKey(now)])
    const prevKeys = new Set([prevMonthKey])
    let cur = 0
    let prev = 0
    for (const a of allApplications) {
      const iso = toOfferAt(a)
      if (!iso) continue
      const k = monthKey(new Date(iso))
      if (curKeys.has(k)) cur += 1
      if (prevKeys.has(k)) prev += 1
    }
    return trendPctVsPriorWindow({ recent: cur, prior: prev })
  }, [allApplications, now, prevMonthKey])
  const newJobsThisMonth = useMemo(
    () => jobs.filter(j => monthKey(new Date(j.created_at)) === monthKey(now)).length,
    [jobs, now],
  )
  const newJobsPrevMonth = useMemo(
    () => jobs.filter(j => monthKey(new Date(j.created_at)) === prevMonthKey).length,
    [jobs, prevMonthKey],
  )
  const activeJobsListingTrend = useMemo(
    () => trendPctVsPriorWindow({ recent: newJobsThisMonth, prior: newJobsPrevMonth }),
    [newJobsThisMonth, newJobsPrevMonth],
  )
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
  const horizontalBarOptions: ChartOptions<'bar'> = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
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
  const funnelBarColors = ['#38bdf8', '#0ea5e9', '#2563eb', '#4f46e5', '#059669']
  const jobSourcePieOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: 0,
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 12, usePointStyle: true, pointStyle: 'circle', font: { size: 11 } } },
    },
  }
  const dominantApplicantStageLabel = (jobId: number) => {
    const rows = allApplications.filter(a => a.job_id === jobId)
    if (rows.length === 0) return '—'
    const weight: Record<string, number> = {
      hired: 6,
      offer: 5,
      interview: 4,
      screening: 3,
      applied: 2,
      rejected: 0,
      withdrawn: 0,
    }
    let best = rows[0].status
    let bestW = weight[best] ?? 1
    for (const a of rows) {
      const w = weight[a.status] ?? 1
      if (w > bestW) {
        bestW = w
        best = a.status
      }
    }
    return formatDashboardLabel(best)
  }
  const jobsTableRows = useMemo(
    () =>
      [...jobs].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 12),
    [jobs],
  )
  const iconCandidates = (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
  const iconBriefcase = (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
    </svg>
  )
  const iconCalendar = (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
  const iconGift = (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <polyline points="20 12 20 22 4 22 4 12" />
      <rect x="2" y="7" width="20" height="5" />
      <line x1="12" y1="22" x2="12" y2="7" />
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
    </svg>
  )
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

      <div className="dashboard-summary-row">
        {jobsLoading && jobs.length === 0 ? (
          <>
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="dashboard-summary-card dashboard-summary-card--skeleton" aria-hidden>
                <div className="dashboard-skeleton-icon" />
                <div className="dashboard-skeleton-line dashboard-skeleton-line--short" />
                <div className="dashboard-skeleton-line dashboard-skeleton-line--value" />
                <div className="dashboard-skeleton-line dashboard-skeleton-line--medium" />
              </div>
            ))}
          </>
        ) : (
          <>
            <DashboardSummaryCard
              icon={iconCandidates}
              label="Total candidates"
              value={totalCandidates}
              trend={makeTrend('Unique applicants vs prior month (by email)', uniqueCandidatesMoM)}
              sublabel={`${totalApplicantsAcrossJobs} applications · ${avgApplicantsPerJob} avg / job`}
            />
            <DashboardSummaryCard
              icon={iconBriefcase}
              label="Active jobs"
              value={openJobs}
              trend={makeTrend('New listings vs prior month', activeJobsListingTrend)}
              sublabel={`${jobs.length} total requisitions`}
              highlight
            />
            <DashboardSummaryCard
              icon={iconCalendar}
              label="Interviews scheduled"
              value={workspaceUpcomingInterviews}
              trend={makeTrend('Scheduled time slots vs prior 28 days', interviewScheduleTrend)}
              sublabel={`${scheduledInterviews} in selected job scope`}
            />
            <DashboardSummaryCard
              icon={iconGift}
              label="Offers released"
              value={offersReleasedCount}
              trend={makeTrend('First transition to offer stage vs prior month', offersMoM)}
              sublabel={`${totalHiredCandidates} hired all-time`}
            />
          </>
        )}
      </div>

      <div className="dashboard-secondary-metrics" aria-label="Workspace metrics">
        <div className="dashboard-secondary-metric">
          <span>Jobs listed</span>
          <strong>{jobs.length}</strong>
        </div>
        <div className="dashboard-secondary-metric">
          <span>Hired (all roles)</span>
          <strong>{totalHiredCandidates}</strong>
        </div>
        <div className="dashboard-secondary-metric">
          <span>Applications (this vs last mo.)</span>
          <strong>
            {currentMonthApplications}
            <span className="dashboard-secondary-delta">{monthlyDeltaLabel}</span>
          </strong>
        </div>
        <div className="dashboard-secondary-metric">
          <span>MoM applications</span>
          <strong>
            {applicationsMoM ? (
              <span className={applicationsMoM.direction === 'down' ? 'dashboard-trend-text--down' : 'dashboard-trend-text--up'}>
                {applicationsMoM.direction === 'up' ? '↑' : applicationsMoM.direction === 'down' ? '↓' : '→'} {applicationsMoM.pct}%
              </span>
            ) : (
              '—'
            )}
          </strong>
        </div>
      </div>

      <div className="dashboard-grid">
        <DashboardPanel title="Pipeline funnel (workspace)">
          <div className="dashboard-panel-content">
            {funnelCounts.every(v => v === 0) ? (
              <div className="dashboard-empty">No active pipeline data yet.</div>
            ) : (
              <div className="dashboard-chart-shell dashboard-chart-shell-funnel">
                <Bar
                  data={{
                    labels: [...PIPELINE_FUNNEL_LABELS],
                    datasets: [
                      {
                        label: 'Candidates',
                        data: funnelCounts,
                        backgroundColor: funnelBarColors,
                        borderRadius: 8,
                        maxBarThickness: 48,
                      },
                    ],
                  }}
                  options={barOptions}
                />
              </div>
            )}
            <p className="dashboard-footnote dashboard-footnote--tight">
              Cumulative counts (active applications only): each stage includes everyone at or beyond that step.
            </p>
          </div>
        </DashboardPanel>

        <DashboardPanel title="Applications over time">
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
            {jobDistributionSlices.length === 0 ? (
              <div className="dashboard-empty">No applications assigned to jobs yet.</div>
            ) : (
              <div className="dashboard-chart-shell dashboard-chart-shell-tall">
                <Bar
                  data={{
                    labels: jobDistributionSlices.map(s => s.label),
                    datasets: [
                      {
                        data: jobDistributionSlices.map(s => s.value),
                        backgroundColor: jobDistributionSlices.map(s => s.color),
                        borderRadius: 6,
                        maxBarThickness: 22,
                      },
                    ],
                  }}
                  options={horizontalBarOptions}
                />
              </div>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Source of candidates (workspace)">
          <div className="dashboard-panel-content">
            <DashboardDoughnutChart
              slices={workspaceSourceSlices}
              emptyLabel="No source attribution yet."
              legendLabel="Sources"
            />
          </div>
        </DashboardPanel>

        <DashboardPanel title="Recent activity">
          <div className="dashboard-panel-content dashboard-activity-wrap">
            {activityFeed.length === 0 ? (
              <div className="dashboard-empty">No recent candidate or interview activity.</div>
            ) : (
              <ul className="dashboard-activity-list">
                {activityFeed.map(item => (
                  <li key={item.id} className={`dashboard-activity-item dashboard-activity-item--${item.tone}`}>
                    <div className="dashboard-activity-dot" aria-hidden />
                    <div className="dashboard-activity-body">
                      <p className="dashboard-activity-title">{item.title}</p>
                      <p className="dashboard-activity-meta">{item.meta}</p>
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

        <DashboardPanel title="Jobs overview">
          <div className="dashboard-panel-content dashboard-table-wrap">
            {jobsLoading ? (
              <div className="dashboard-table-skeleton">
                <DashboardSkeletonBlock />
                <DashboardSkeletonBlock />
                <DashboardSkeletonBlock />
              </div>
            ) : jobsError ? (
              <ErrorRow msg={jobsError} />
            ) : jobs.length === 0 ? (
              <div className="dashboard-empty">Create a job to see it listed here.</div>
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
                    {jobsTableRows.map(job => (
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
                        <td>{applicantsByJobId.get(job.id) ?? 0}</td>
                        <td>{dominantApplicantStageLabel(job.id)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="dashboard-panel-footer">
              <Link className="dashboard-link" to={`/account/${accountId}/jobs`}>
                View all jobs
              </Link>
            </div>
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

        <DashboardPanel title="Source of candidates (selected job)">
          <div className="dashboard-panel-content">
            {analyticsLoading ? (
              <div className="dashboard-chart-shell dashboard-chart-shell-short">
                <div className="dashboard-chart-skeleton" aria-hidden>
                  <div className="dashboard-skeleton-pie" />
                  <div className="dashboard-skeleton-legend">
                    <div className="dashboard-skeleton-line dashboard-skeleton-line--short" />
                    <div className="dashboard-skeleton-line dashboard-skeleton-line--medium" />
                    <div className="dashboard-skeleton-line dashboard-skeleton-line--short" />
                  </div>
                </div>
              </div>
            ) : sourceSlices.length === 0 ? (
              <div className="dashboard-empty">No source data is available for this job.</div>
            ) : (
              <>
                <div className="dashboard-chart-shell dashboard-chart-shell-short">
                  <Doughnut
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
                    options={jobSourcePieOptions}
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

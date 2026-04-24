import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  DoughnutController,
  Filler,
  Legend,
  LineController,
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
import { SummaryStatCard } from '../components/dashboard/SummaryStatCard'
import { computeTrendPercent } from '../components/dashboard/trendUtils'
import { IconAward, IconBriefcase, IconCalendar, IconUsers } from '../components/dashboard/dashboardIcons'

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
  LineController,
  BarController,
  DoughnutController,
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

const MS_PER_DAY = 86_400_000

/** Last 30 days vs the 30 days immediately before (rolling, from `reference` time). */
function rolling30DayWindows(reference = new Date()) {
  const t = reference.getTime()
  const currentStart = t - 30 * MS_PER_DAY
  const priorEnd = currentStart
  const priorStart = priorEnd - 30 * MS_PER_DAY
  return { currentStart, priorStart, priorEnd: t }
}

function inOpenInterval(ts: number, lo: number, hi: number) {
  return ts > lo && ts <= hi
}

const FUNNEL_STATUS_ORDER = ['applied', 'screening', 'interview', 'offer', 'hired'] as const
const FUNNEL_LABELS: Record<(typeof FUNNEL_STATUS_ORDER)[number], string> = {
  applied: 'Applied',
  screening: 'Screening',
  interview: 'Interview',
  offer: 'Offer',
  hired: 'Hired',
}
const FUNNEL_BAR_COLORS = ['#0ea5e9', '#38bdf8', '#3b82f6', '#22c55e', '#059669']

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
    })

    return () => {
      cancelled = true
    }
  }, [token])

  useEffect(() => {
    let cancelled = false
    if (!selectedJobId) {
      queueMicrotask(() => {
        if (!cancelled) {
          setJobApplications([])
          setAnalyticsError('')
        }
      })
      return () => {
        cancelled = true
      }
    }

    queueMicrotask(() => {
      if (cancelled) return
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

  const { currentStart, priorStart, priorEnd } = useMemo(() => rolling30DayWindows(), [])
  const prior30Applications = useMemo(
    () => allApplications.filter(a => inOpenInterval(new Date(a.created_at).getTime(), priorStart, priorEnd)),
    [allApplications, priorStart, priorEnd],
  )
  const current30Applications = useMemo(
    () => allApplications.filter(a => inOpenInterval(new Date(a.created_at).getTime(), currentStart, priorEnd)),
    [allApplications, currentStart, priorEnd],
  )
  const trendCandidates = useMemo(
    () => computeTrendPercent(current30Applications.length, prior30Applications.length),
    [current30Applications.length, prior30Applications.length],
  )
  const jobsCreatedCurrent = useMemo(
    () => jobs.filter(j => inOpenInterval(new Date(j.created_at).getTime(), currentStart, priorEnd)).length,
    [jobs, currentStart, priorEnd],
  )
  const jobsCreatedPrior = useMemo(
    () => jobs.filter(j => inOpenInterval(new Date(j.created_at).getTime(), priorStart, priorEnd)).length,
    [jobs, priorStart, priorEnd],
  )
  const trendActiveJobs = useMemo(
    () => computeTrendPercent(jobsCreatedCurrent, jobsCreatedPrior),
    [jobsCreatedCurrent, jobsCreatedPrior],
  )
  const interviewsScheduledCurrent = useMemo(
    () =>
      interviews.filter(row => {
        if (!row.scheduled_at) return false
        const t = new Date(row.scheduled_at).getTime()
        return inOpenInterval(t, currentStart, priorEnd)
      }).length,
    [interviews, currentStart, priorEnd],
  )
  const interviewsScheduledPrior = useMemo(
    () =>
      interviews.filter(row => {
        if (!row.scheduled_at) return false
        const t = new Date(row.scheduled_at).getTime()
        return inOpenInterval(t, priorStart, priorEnd)
      }).length,
    [interviews, priorStart, priorEnd],
  )
  const trendInterviews = useMemo(
    () => computeTrendPercent(interviewsScheduledCurrent, interviewsScheduledPrior),
    [interviewsScheduledCurrent, interviewsScheduledPrior],
  )
  const upcomingInterviewCount = useMemo(
    () =>
      interviews.filter(
        row =>
          !!row.scheduled_at && (row.status === 'scheduled' || row.status === 'pending'),
      ).length,
    [interviews],
  )
  const offersReleasedCurrent = useMemo(
    () =>
      allApplications.filter(a => {
        if (a.status !== 'offer') return false
        return inOpenInterval(new Date(a.updated_at).getTime(), currentStart, priorEnd)
      }).length,
    [allApplications, currentStart, priorEnd],
  )
  const offersReleasedPrior = useMemo(
    () =>
      allApplications.filter(a => {
        if (a.status !== 'offer') return false
        return inOpenInterval(new Date(a.updated_at).getTime(), priorStart, priorEnd)
      }).length,
    [allApplications, priorStart, priorEnd],
  )
  const trendOffers = useMemo(
    () => computeTrendPercent(offersReleasedCurrent, offersReleasedPrior),
    [offersReleasedCurrent, offersReleasedPrior],
  )

  const workspaceStatusCounts = useMemo(() => {
    const acc: Record<string, number> = {}
    allApplications.forEach(a => {
      acc[a.status] = (acc[a.status] ?? 0) + 1
    })
    return acc
  }, [allApplications])

  const funnelChartData = useMemo(() => {
    const data = FUNNEL_STATUS_ORDER.map(key => workspaceStatusCounts[key] ?? 0)
    return {
      labels: FUNNEL_STATUS_ORDER.map(key => FUNNEL_LABELS[key]),
      datasets: [
        {
          label: 'Candidates',
          data,
          backgroundColor: FUNNEL_BAR_COLORS,
          borderRadius: 8,
          maxBarThickness: 28,
        },
      ],
    }
  }, [workspaceStatusCounts])

  const applicantsByJobId = useMemo(() => {
    const m = new Map<number, number>()
    allApplications.forEach(a => {
      m.set(a.job_id, (m.get(a.job_id) ?? 0) + 1)
    })
    return m
  }, [allApplications])

  const jobDistributionChartData = useMemo(() => {
    const rows = jobs
      .map(job => ({ id: job.id, title: job.title, count: applicantsByJobId.get(job.id) ?? 0 }))
      .filter(r => r.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
    return {
      labels: rows.map(r => (r.title.length > 22 ? `${r.title.slice(0, 20)}…` : r.title)),
      datasets: [
        {
          label: 'Applicants',
          data: rows.map(r => r.count),
          backgroundColor: '#3b82f6',
          borderRadius: 8,
          maxBarThickness: 36,
        },
      ],
    }
  }, [jobs, applicantsByJobId])

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

  const dominantStageByJobId = useMemo(() => {
    const byJob = new Map<number, Record<string, number>>()
    allApplications.forEach(a => {
      const cur = byJob.get(a.job_id) ?? {}
      cur[a.status] = (cur[a.status] ?? 0) + 1
      byJob.set(a.job_id, cur)
    })
    const map = new Map<number, string>()
    jobs.forEach(j => {
      const counts = byJob.get(j.id) ?? {}
      let best = ''
      let bestN = -1
      for (const [k, v] of Object.entries(counts)) {
        if (v > bestN) {
          bestN = v
          best = k
        }
      }
      map.set(j.id, best ? formatDashboardLabel(best) : '—')
    })
    return map
  }, [allApplications, jobs])

  type ActivityItem = { id: string; at: number; label: string; sub: string; href?: string }
  const activityFeed = useMemo((): ActivityItem[] => {
    const items: ActivityItem[] = []
    allApplications.slice(0, 80).forEach(a => {
      items.push({
        id: `app-created-${a.id}`,
        at: new Date(a.created_at).getTime(),
        label: `Application received`,
        sub: `${a.candidate_name || a.candidate_email} applied`,
        href: `/account/${accountId}/job-applications/${a.id}`,
      })
    })
    interviews.slice(0, 40).forEach(row => {
      const name = row.application?.candidate_name || row.application?.candidate_email || 'Candidate'
      const jobTitle = row.job?.title ?? 'Role'
      if (row.scheduled_at) {
        items.push({
          id: `int-sched-${row.id}`,
          at: new Date(row.scheduled_at).getTime(),
          label: 'Interview scheduled',
          sub: `${name} · ${jobTitle}`,
        })
      } else {
        items.push({
          id: `int-upd-${row.id}`,
          at: new Date(row.updated_at).getTime(),
          label: 'Interview updated',
          sub: `${name} · ${formatDashboardLabel(row.status)}`,
        })
      }
    })
    jobs.slice(0, 40).forEach(j => {
      items.push({
        id: `job-created-${j.id}`,
        at: new Date(j.created_at).getTime(),
        label: 'Job created',
        sub: j.title,
        href: `/account/${accountId}/jobs/${j.id}/edit`,
      })
    })
    return items.sort((a, b) => b.at - a.at).slice(0, 14)
  }, [allApplications, interviews, jobs, accountId])

  const maxSourceValue = Math.max(...sourceSlices.map(slice => slice.value), 0)
  const sourceTopLabel = sourceSlices.find(slice => slice.value === maxSourceValue)?.label ?? 'No data'

  const summaryLoading = jobsLoading || applicationsLoading

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
        ticks: { color: '#374151', font: { size: 12 } },
        grid: { display: false },
      },
    },
  }

  const jobBarHorizontalOptions: ChartOptions<'bar'> = {
    ...barOptions,
    indexAxis: 'y',
    scales: {
      x: {
        beginAtZero: true,
        ticks: { color: '#6b7280', precision: 0, font: { size: 11 } },
        grid: { color: 'rgba(148,163,184,0.22)' },
      },
      y: {
        ticks: { color: '#374151', font: { size: 11 }, maxRotation: 0 },
        grid: { display: false },
      },
    },
  }

  const pieOptions: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: { boxWidth: 10, usePointStyle: true, pointStyle: 'circle', font: { size: 11 } },
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
            Pipeline health, hiring velocity, and role-level detail in one place — tuned for how recruiting teams actually work.
          </p>
        </div>
        <div className="dashboard-hero-meta">
          <div className="dashboard-hero-meta-item">
            <span>Pipeline health (selected job)</span>
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

      <div className="dashboard-summary-row" role="region" aria-label="Workspace summary">
        <SummaryStatCard
          icon={<IconUsers />}
          label="Total candidates"
          value={totalApplicantsAcrossJobs}
          hint="All applications in this workspace"
          trendPct={trendCandidates.pct}
          trendDirection={trendCandidates.direction}
          positiveWhenUp
          loading={summaryLoading}
        />
        <SummaryStatCard
          icon={<IconBriefcase />}
          label="Active jobs"
          value={openJobs}
          hint={`${jobs.length} total listings`}
          trendPct={trendActiveJobs.pct}
          trendDirection={trendActiveJobs.direction}
          positiveWhenUp
          loading={summaryLoading}
        />
        <SummaryStatCard
          icon={<IconCalendar />}
          label="Interviews scheduled"
          value={upcomingInterviewCount}
          hint="Scheduled or pending with a time set"
          trendPct={trendInterviews.pct}
          trendDirection={trendInterviews.direction}
          positiveWhenUp
          loading={jobsLoading || interviewsLoading}
        />
        <SummaryStatCard
          icon={<IconAward />}
          label="Offers released"
          value={allApplications.filter(a => a.status === 'offer').length}
          hint="Currently in offer stage"
          trendPct={trendOffers.pct}
          trendDirection={trendOffers.direction}
          positiveWhenUp
          loading={summaryLoading}
        />
      </div>

      <div className="dashboard-charts-band" aria-label="Workspace charts">
        <div className="dashboard-chart-tile dashboard-chart-tile-span-6">
          <div className="dashboard-chart-tile-inner">
            <h3 className="dashboard-chart-tile-title">Pipeline funnel</h3>
            <p className="dashboard-chart-tile-sub">Workspace · current snapshot by stage</p>
            {applicationsLoading ? (
              <div className="dashboard-chart-skeleton" />
            ) : funnelChartData.datasets[0].data.every(v => v === 0) ? (
              <div className="dashboard-empty">No candidates in the funnel yet.</div>
            ) : (
              <div className="dashboard-chart-shell dashboard-chart-shell-funnel">
                <Bar data={funnelChartData} options={funnelBarOptions} />
              </div>
            )}
          </div>
        </div>
        <div className="dashboard-chart-tile dashboard-chart-tile-span-6">
          <div className="dashboard-chart-tile-inner">
            <h3 className="dashboard-chart-tile-title">Applications over time</h3>
            <p className="dashboard-chart-tile-sub">Last six months · workspace</p>
            {applicationsLoading ? (
              <div className="dashboard-chart-skeleton" />
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
        </div>
        <div className="dashboard-chart-tile dashboard-chart-tile-span-7">
          <div className="dashboard-chart-tile-inner">
            <h3 className="dashboard-chart-tile-title">Candidates by job</h3>
            <p className="dashboard-chart-tile-sub">Top roles by applicant volume</p>
            {summaryLoading ? (
              <div className="dashboard-chart-skeleton" />
            ) : jobDistributionChartData.datasets[0].data.length === 0 ? (
              <div className="dashboard-empty">No applicants mapped to jobs yet.</div>
            ) : (
              <div className="dashboard-chart-shell dashboard-chart-shell-jobs-bar">
                <Bar data={jobDistributionChartData} options={jobBarHorizontalOptions} />
              </div>
            )}
          </div>
        </div>
        <div className="dashboard-chart-tile dashboard-chart-tile-span-5">
          <div className="dashboard-chart-tile-inner">
            <h3 className="dashboard-chart-tile-title">Source of candidates</h3>
            <p className="dashboard-chart-tile-sub">Workspace · application source</p>
            {applicationsLoading ? (
              <div className="dashboard-chart-skeleton" />
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
        </div>
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

        <DashboardPanel title="Recent activity">
          <div className="dashboard-panel-content">
            {summaryLoading && interviewsLoading ? (
              <div className="dashboard-activity-skeleton-wrap" aria-busy="true">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="dashboard-activity-skeleton-row" />
                ))}
              </div>
            ) : activityFeed.length === 0 ? (
              <div className="dashboard-empty">No recent activity yet.</div>
            ) : (
              <ul className="dashboard-activity-list">
                {activityFeed.map(item => {
                  const inner = (
                    <>
                      <span className="dashboard-activity-time">
                        {new Date(item.at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </span>
                      <span className="dashboard-activity-label">{item.label}</span>
                      <span className="dashboard-activity-sub">{item.sub}</span>
                    </>
                  )
                  return (
                    <li key={item.id} className="dashboard-activity-item">
                      {item.href ? (
                        <Link className="dashboard-activity-link" to={item.href}>
                          {inner}
                        </Link>
                      ) : (
                        <div className="dashboard-activity-static">{inner}</div>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Jobs overview">
          <div className="dashboard-panel-content dashboard-jobs-overview-wrap">
            {jobsLoading ? (
              <div className="dashboard-table-skeleton" aria-busy="true">
                <div className="dashboard-table-skel-row dashboard-table-skel-head" />
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="dashboard-table-skel-row" />
                ))}
              </div>
            ) : jobsError ? (
              <ErrorRow msg={jobsError} />
            ) : jobs.length === 0 ? (
              <div className="dashboard-empty">No jobs yet.</div>
            ) : (
              <div className="dashboard-jobs-table-scroll">
                <table className="dashboard-jobs-table">
                  <thead>
                    <tr>
                      <th>Job title</th>
                      <th>Status</th>
                      <th className="dashboard-jobs-table-num">Applicants</th>
                      <th>Stage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map(job => (
                      <tr key={job.id}>
                        <td>
                          <Link className="dashboard-jobs-table-title" to={`/account/${accountId}/jobs/${job.id}/edit`}>
                            {job.title}
                          </Link>
                          <span className="dashboard-jobs-table-muted">
                            {job.department ?? 'General'} · {job.location ?? 'Location TBD'}
                          </span>
                        </td>
                        <td>
                          <span className={`tag ${STAGE_COLORS[job.status] ?? 'tag-blue'}`}>{formatDashboardLabel(job.status)}</span>
                        </td>
                        <td className="dashboard-jobs-table-num">{applicantsByJobId.get(job.id) ?? 0}</td>
                        <td>
                          <span className="dashboard-jobs-table-stage">{dominantStageByJobId.get(job.id) ?? '—'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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

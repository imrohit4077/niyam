/* eslint-disable react-hooks/set-state-in-effect -- fetch effects reset loading/error state before async I/O (matches app pattern) */
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
import { Bar, Line, Pie } from 'react-chartjs-2'
import type { DashboardOutletContext } from '../layouts/DashboardOutletContext'
import { jobsApi, type Job } from '../api/jobs'
import { applicationsApi, type Application } from '../api/applications'
import { interviewsApi, type InterviewAssignmentRow } from '../api/interviews'
import { DashboardDoughnutChart } from '../components/dashboard/DashboardDoughnutChart'
import { DashboardPanel } from '../components/dashboard/DashboardPanel'
import { DASHBOARD_BRAND, DASHBOARD_BRAND_SOFT, STAGE_COLORS } from '../components/dashboard/dashboardConstants'
import { formatDashboardLabel, formatDateTimeShort, formatRelativeTime } from '../components/dashboard/dashboardFormat'
import { makeDashboardSlices } from '../components/dashboard/dashboardSlices'
import type { DashboardSlice } from '../components/dashboard/dashboardSlices'
import { SummaryStatCard, type TrendDirection } from '../components/dashboard/SummaryStatCard'

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

type PipelineModalKind = 'applicants' | 'interviews' | 'offers' | 'hired'

const FUNNEL_STAGES = ['applied', 'screening', 'interview', 'offer', 'hired'] as const

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

function daysAgo(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function countInRange<T>(items: T[], getTime: (item: T) => number | null, start: number, end: number) {
  return items.filter(item => {
    const t = getTime(item)
    return t != null && t >= start && t < end
  }).length
}

function trendFromCounts(current: number, previous: number): { percent: number | null; direction: TrendDirection } {
  if (previous === 0 && current === 0) return { percent: null, direction: 'flat' }
  if (previous === 0) return { percent: null, direction: current > 0 ? 'up' : 'flat' }
  const pct = Math.round(((current - previous) / previous) * 100)
  return {
    percent: Math.abs(pct),
    direction: pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat',
  }
}

function IconUsers() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function IconBriefcase() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
    </svg>
  )
}

function IconCalendar() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function IconGift() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <polyline points="20 12 20 22 4 22 4 12" />
      <rect x="2" y="7" width="20" height="5" />
      <line x1="12" y1="22" x2="12" y2="7" />
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
    </svg>
  )
}

type ActivityKind = 'application' | 'interview' | 'offer' | 'hired'

type ActivityItem = {
  id: string
  kind: ActivityKind
  title: string
  subtitle: string
  at: string
  href: string
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
  const [applicationsReady, setApplicationsReady] = useState(false)
  const [jobApplications, setJobApplications] = useState<Application[]>([])
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [analyticsError, setAnalyticsError] = useState('')
  const [activePipelineModal, setActivePipelineModal] = useState<PipelineModalKind | null>(null)
  const [trendNowMs, setTrendNowMs] = useState<number | null>(null)

  useEffect(() => {
    queueMicrotask(() => setTrendNowMs(Date.now()))
    const id = window.setInterval(() => setTrendNowMs(Date.now()), 60_000)
    return () => window.clearInterval(id)
  }, [])

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
    setApplicationsReady(false)

    applicationsApi
      .list(token)
      .then(rows => {
        if (!cancelled) setAllApplications(rows)
      })
      .catch(() => {
        if (!cancelled) setAllApplications([])
      })
      .finally(() => {
        if (!cancelled) setApplicationsReady(true)
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
  const sourceSlicesJob = makeDashboardSlices(
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
  const maxSourceValueJob = Math.max(...sourceSlicesJob.map(slice => slice.value), 0)
  const sourceTopLabel = sourceSlicesJob.find(slice => slice.value === maxSourceValueJob)?.label ?? 'No data'

  const candidatesTrend = useMemo(() => {
    if (trendNowMs == null) return { percent: null as number | null, direction: 'flat' as TrendDirection }
    const nowMs = trendNowMs
    const t30 = daysAgo(30)
    const t60 = daysAgo(60)
    const cur = countInRange(allApplications, a => new Date(a.created_at).getTime(), t30, nowMs)
    const prev = countInRange(allApplications, a => new Date(a.created_at).getTime(), t60, t30)
    return trendFromCounts(cur, prev)
  }, [allApplications, trendNowMs])

  const jobsTrend = useMemo(() => {
    if (trendNowMs == null) return { percent: null as number | null, direction: 'flat' as TrendDirection }
    const nowMs = trendNowMs
    const t30 = daysAgo(30)
    const t60 = daysAgo(60)
    const cur = countInRange(jobs, j => new Date(j.created_at).getTime(), t30, nowMs)
    const prev = countInRange(jobs, j => new Date(j.created_at).getTime(), t60, t30)
    return trendFromCounts(cur, prev)
  }, [jobs, trendNowMs])

  const interviewsTrend = useMemo(() => {
    if (trendNowMs == null) return { percent: null as number | null, direction: 'flat' as TrendDirection }
    const nowMs = trendNowMs
    const futureEnd = nowMs + 14 * 86400000
    const pastStart = nowMs - 14 * 86400000
    const cur = interviews.filter(row => {
      const t = row.scheduled_at ? new Date(row.scheduled_at).getTime() : null
      return t != null && t >= nowMs && t < futureEnd
    }).length
    const prev = interviews.filter(row => {
      const t = row.scheduled_at ? new Date(row.scheduled_at).getTime() : null
      return t != null && t >= pastStart && t < nowMs
    }).length
    return trendFromCounts(cur, prev)
  }, [interviews, trendNowMs])

  const offersReleasedCount = allApplications.filter(a => a.status === 'offer').length
  const offersTrend = useMemo(() => {
    if (trendNowMs == null) return { percent: null as number | null, direction: 'flat' as TrendDirection }
    const nowMs = trendNowMs
    const t30 = daysAgo(30)
    const t60 = daysAgo(60)
    const offers = allApplications.filter(a => a.status === 'offer')
    const cur = countInRange(offers, a => new Date(a.updated_at).getTime(), t30, nowMs)
    const prev = countInRange(offers, a => new Date(a.updated_at).getTime(), t60, t30)
    return trendFromCounts(cur, prev)
  }, [allApplications, trendNowMs])

  const workspaceFunnelCounts = useMemo(() => {
    const acc: Record<string, number> = {}
    FUNNEL_STAGES.forEach(s => {
      acc[s] = 0
    })
    allApplications.forEach(a => {
      const s = a.status
      if (s in acc) acc[s] += 1
    })
    return FUNNEL_STAGES.map(stage => ({
      stage,
      label: formatDashboardLabel(stage),
      value: acc[stage] ?? 0,
    }))
  }, [allApplications])

  const workspaceSourceSlices: DashboardSlice[] = useMemo(
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

  const applicationsByJobId = useMemo(() => {
    const m = new Map<number, number>()
    allApplications.forEach(a => {
      m.set(a.job_id, (m.get(a.job_id) ?? 0) + 1)
    })
    return m
  }, [allApplications])

  const dominantStageByJob = useMemo(() => {
    const perJob: Record<number, Record<string, number>> = {}
    allApplications.forEach(a => {
      if (!perJob[a.job_id]) perJob[a.job_id] = {}
      perJob[a.job_id][a.status] = (perJob[a.job_id][a.status] ?? 0) + 1
    })
    const result = new Map<number, string>()
    Object.entries(perJob).forEach(([jobId, counts]) => {
      let best = 'applied'
      let bestN = 0
      Object.entries(counts).forEach(([status, n]) => {
        if (n > bestN) {
          bestN = n
          best = status
        }
      })
      result.set(Number(jobId), best)
    })
    return result
  }, [allApplications])

  const jobDistribution = useMemo(() => {
    return jobs
      .map(job => ({
        id: job.id,
        title: job.title,
        count: applicationsByJobId.get(job.id) ?? 0,
      }))
      .filter(j => j.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
  }, [jobs, applicationsByJobId])

  const activityFeed = useMemo((): ActivityItem[] => {
    const items: ActivityItem[] = []
    const recentApps = [...allApplications]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 6)
    recentApps.forEach(a => {
      const jobTitle = jobs.find(j => j.id === a.job_id)?.title ?? `Job #${a.job_id}`
      items.push({
        id: `app-${a.id}`,
        kind: 'application',
        title: `Candidate added — ${a.candidate_name || a.candidate_email}`,
        subtitle: jobTitle,
        at: a.created_at,
        href: `/account/${accountId}/job-applications/${a.id}`,
      })
    })
    interviews.forEach(row => {
      if (row.status !== 'scheduled' && row.status !== 'pending') return
      const at = row.scheduled_at || row.updated_at
      items.push({
        id: `int-${row.id}`,
        kind: 'interview',
        title: `Interview ${row.scheduled_at ? 'scheduled' : 'updated'} — ${row.application?.candidate_name || row.application?.candidate_email || 'Candidate'}`,
        subtitle: row.job?.title ?? 'Interview',
        at,
        href: `/account/${accountId}/interviews`,
      })
    })
    allApplications
      .filter(a => a.status === 'offer' || a.status === 'hired')
      .forEach(a => {
        items.push({
          id: `stage-${a.id}-${a.status}`,
          kind: a.status === 'hired' ? 'hired' : 'offer',
          title:
            a.status === 'hired'
              ? `Candidate hired — ${a.candidate_name || a.candidate_email}`
              : `Offer stage — ${a.candidate_name || a.candidate_email}`,
          subtitle: jobs.find(j => j.id === a.job_id)?.title ?? `Job #${a.job_id}`,
          at: a.updated_at,
          href: `/account/${accountId}/job-applications/${a.id}`,
        })
      })
    return items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 12)
  }, [allApplications, interviews, jobs, accountId])

  const summaryLoading = jobsLoading || !applicationsReady

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

  const barOptionsHorizontal: ChartOptions<'bar'> = {
    ...barOptions,
    indexAxis: 'y',
    scales: {
      x: {
        beginAtZero: true,
        ticks: { color: '#6b7280', precision: 0, font: { size: 11 } },
        grid: { color: 'rgba(148,163,184,0.22)' },
      },
      y: {
        ticks: { color: '#6b7280', font: { size: 11 }, callback: (v: string | number) => String(v) },
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
      legend: { position: 'right', labels: { boxWidth: 10, usePointStyle: true, font: { size: 11 } } },
    },
  }

  const funnelHasData = workspaceFunnelCounts.some(x => x.value > 0)

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

  const activityIcon = (kind: ActivityKind) => {
    switch (kind) {
      case 'interview':
        return <IconCalendar />
      case 'offer':
      case 'hired':
        return <IconGift />
      default:
        return <IconUsers />
    }
  }

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
            Pipeline velocity, candidate flow, and role-level detail in one place. Select a job below to focus analytics.
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

      <div className="dashboard-stat-grid">
        <SummaryStatCard
          label="Total Candidates"
          value={totalApplicantsAcrossJobs}
          icon={<IconUsers />}
          trendPercent={candidatesTrend.percent}
          trendDirection={candidatesTrend.direction}
          sublabel="Across all open and closed reqs"
          loading={summaryLoading}
          highlight
        />
        <SummaryStatCard
          label="Active Jobs"
          value={openJobs}
          icon={<IconBriefcase />}
          trendPercent={jobsTrend.percent}
          trendDirection={jobsTrend.direction}
          sublabel={`${jobs.length} total reqs · new roles vs prior 30d`}
          loading={summaryLoading}
        />
        <SummaryStatCard
          label="Interviews Scheduled"
          value={workspaceUpcomingInterviews}
          icon={<IconCalendar />}
          trendPercent={interviewsTrend.percent}
          trendDirection={interviewsTrend.direction}
          sublabel="Next 14d vs last 14d on calendar"
          loading={summaryLoading || interviewsLoading}
        />
        <SummaryStatCard
          label="Offers Released"
          value={offersReleasedCount}
          icon={<IconGift />}
          trendPercent={offersTrend.percent}
          trendDirection={offersTrend.direction}
          sublabel="In offer stage · activity vs prior 30d"
          loading={summaryLoading}
        />
      </div>

      <div className="dashboard-kpi-grid dashboard-kpi-grid-secondary">
        <article className="dashboard-kpi-card dashboard-kpi-primary">
          <span>All Requisitions</span>
          <strong>{jobs.length}</strong>
          <p>{openJobs} currently open</p>
        </article>
        <article className="dashboard-kpi-card">
          <span>Selected Job Applicants</span>
          <strong>{totalApplicants}</strong>
          <p>{selectedJob?.title ?? 'Pick a job for detail'}</p>
        </article>
        <article className="dashboard-kpi-card">
          <span>Total Hired</span>
          <strong>{totalHiredCandidates}</strong>
          <p>{openingFillRate}% fill rate across openings</p>
        </article>
        <article className="dashboard-kpi-card">
          <span>Monthly Pipeline Delta</span>
          <strong>{monthlyDeltaLabel}</strong>
          <p>
            {currentMonthApplications} this month vs {previousMonthApplications} last month
          </p>
        </article>
      </div>

      <div className="dashboard-section-label">Workspace analytics</div>
      <div className="dashboard-grid dashboard-charts-grid">
        <DashboardPanel title="Pipeline funnel" className="dashboard-panel-span-6">
          <div className="dashboard-panel-content">
            {!applicationsReady ? (
              <LoadingRow />
            ) : !funnelHasData ? (
              <div className="dashboard-empty">No candidate pipeline data yet.</div>
            ) : (
              <div className="dashboard-chart-shell dashboard-chart-shell-funnel">
                <Bar
                  data={{
                    labels: workspaceFunnelCounts.map(x => x.label),
                    datasets: [
                      {
                        label: 'Candidates',
                        data: workspaceFunnelCounts.map(x => x.value),
                        backgroundColor: workspaceFunnelCounts.map(
                          (_, i) => ['#0ea5e9', '#38bdf8', '#3b82f6', '#6366f1', '#22c55e'][i] ?? '#94a3b8',
                        ),
                        borderRadius: 8,
                        maxBarThickness: 48,
                      },
                    ],
                  }}
                  options={barOptionsHorizontal}
                />
              </div>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Applications over time" className="dashboard-panel-span-6">
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
                        borderColor: DASHBOARD_BRAND,
                        backgroundColor: DASHBOARD_BRAND_SOFT,
                        borderWidth: 2,
                        pointRadius: 4,
                        pointHoverRadius: 5,
                        pointBackgroundColor: '#ffffff',
                        pointBorderColor: DASHBOARD_BRAND,
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

        <DashboardPanel title="Applicants by job" className="dashboard-panel-span-6">
          <div className="dashboard-panel-content">
            {!applicationsReady ? (
              <LoadingRow />
            ) : jobDistribution.length === 0 ? (
              <div className="dashboard-empty">No applications yet.</div>
            ) : (
              <div className="dashboard-chart-shell dashboard-chart-shell-short">
                <Bar
                  data={{
                    labels: jobDistribution.map(j => (j.title.length > 22 ? `${j.title.slice(0, 22)}…` : j.title)),
                    datasets: [
                      {
                        data: jobDistribution.map(j => j.count),
                        backgroundColor: '#0ea5e9',
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

        <DashboardPanel title="Source of candidates" className="dashboard-panel-span-6">
          <div className="dashboard-panel-content">
            {!applicationsReady ? (
              <LoadingRow />
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

      <div className="dashboard-section-label">Role focus</div>
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
                <div className="dashboard-footnote">Tip: select a role to update pipeline and source panels.</div>
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

        <DashboardPanel title="Applicant Sources (Selected Job)">
          <div className="dashboard-panel-content">
            {analyticsLoading ? (
              <LoadingRow />
            ) : sourceSlicesJob.length === 0 ? (
              <div className="dashboard-empty">No source data is available for this job.</div>
            ) : (
              <>
                <div className="dashboard-chart-shell dashboard-chart-shell-short">
                  <Bar
                    data={{
                      labels: sourceSlicesJob.map(slice => slice.label),
                      datasets: [
                        {
                          data: sourceSlicesJob.map(slice => slice.value),
                          backgroundColor: sourceSlicesJob.map(slice => slice.color),
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
                    <strong>{sourceSlicesJob.length}</strong>
                    <span>Distinct source channels</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Recent activity">
          <div className="dashboard-panel-content">
            {!applicationsReady ? (
              <LoadingRow />
            ) : activityFeed.length === 0 ? (
              <div className="dashboard-empty">No recent activity yet.</div>
            ) : (
              <ul className="dashboard-activity-list">
                {activityFeed.map(item => (
                  <li key={item.id}>
                    <Link to={item.href} className="dashboard-activity-row">
                      <span className="dashboard-activity-icon">{activityIcon(item.kind)}</span>
                      <div className="dashboard-activity-body">
                        <strong>{item.title}</strong>
                        <span>{item.subtitle}</span>
                      </div>
                      <time className="dashboard-activity-time" dateTime={item.at}>
                        {formatRelativeTime(item.at)}
                      </time>
                    </Link>
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
      </div>

      <div className="dashboard-section-label">Jobs overview</div>
      <section className="panel dashboard-jobs-table-panel">
        <div className="panel-header dashboard-modern-panel-header">
          <span className="panel-header-title">All jobs</span>
        </div>
        <div className="panel-body dashboard-modern-panel-body">
          <div className="dashboard-panel-content dashboard-table-wrap">
            {jobsLoading ? (
              <LoadingRow />
            ) : jobsError ? (
              <ErrorRow msg={jobsError} />
            ) : jobs.length === 0 ? (
              <div className="dashboard-empty">Create a job to start tracking applicants.</div>
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
                    const count = applicationsByJobId.get(job.id) ?? 0
                    const dominant = dominantStageByJob.get(job.id) ?? '—'
                    return (
                      <tr
                        key={job.id}
                        className={selectedJobId === String(job.id) ? 'dashboard-jobs-table-row-active' : undefined}
                      >
                        <td>
                          <button type="button" className="dashboard-jobs-table-title-btn" onClick={() => setSelectedJobId(String(job.id))}>
                            {job.title}
                          </button>
                        </td>
                        <td>
                          <span className={`tag ${STAGE_COLORS[job.status] ?? 'tag-blue'}`}>{formatDashboardLabel(job.status)}</span>
                        </td>
                        <td>{count}</td>
                        <td>
                          {count === 0 ? (
                            <span className="dashboard-table-muted">—</span>
                          ) : (
                            <span className={`tag ${STAGE_COLORS[dominant] ?? 'tag-blue'}`}>{formatDashboardLabel(dominant)}</span>
                          )}
                        </td>
                        <td className="dashboard-jobs-table-actions">
                          <Link className="dashboard-link dashboard-link-compact" to={`/account/${accountId}/jobs/${job.id}/edit`}>
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
        </div>
      </section>
    </>
  )
}

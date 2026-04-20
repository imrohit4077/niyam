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
import { Bar, Line } from 'react-chartjs-2'
import type { DashboardOutletContext } from '../layouts/DashboardOutletContext'
import { jobsApi, type Job } from '../api/jobs'
import { applicationsApi, type Application } from '../api/applications'
import { interviewsApi, type InterviewAssignmentRow } from '../api/interviews'
import { DASHBOARD_CHART_COLORS, PIPELINE_FUNNEL_STATUSES, STAGE_COLORS } from '../components/dashboard/dashboardConstants'
import {
  compareWindows,
  countInDateRange,
  formatDashboardLabel,
  formatDateTimeShort,
  formatRelativeDay,
  makeDashboardSlices,
  type DashboardSlice,
} from '../components/dashboard/dashboardHelpers'
import { DashboardPanel } from '../components/dashboard/DashboardPanel'
import { DashboardSummaryCard } from '../components/dashboard/DashboardSummaryCard'
import { DashboardDoughnutChart, DashboardPieChart } from '../components/dashboard/DashboardCharts'

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

function DashboardSkeletonBlock({ tall }: { tall?: boolean }) {
  return <div className={`dashboard-skeleton-block${tall ? ' dashboard-skeleton-block-tall' : ''}`} aria-hidden />
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

function IconUsers() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconBriefcase() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2M2 13h20" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconCalendar() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconGift() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M20 12v10H4V12M2 7h20v5H2V7zM12 22V7M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zm0 0h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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
    const loadingTimer = window.setTimeout(() => {
      if (!cancelled) {
        setJobsLoading(true)
        setJobsError('')
      }
    }, 0)

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
      window.clearTimeout(loadingTimer)
    }
  }, [token])

  useEffect(() => {
    let cancelled = false
    const loadingTimer = window.setTimeout(() => {
      if (!cancelled) {
        setInterviewsLoading(true)
        setInterviewsError('')
      }
    }, 0)

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
      window.clearTimeout(loadingTimer)
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
      const clearTimer = window.setTimeout(() => {
        setJobApplications([])
        setAnalyticsError('')
      }, 0)
      return () => window.clearTimeout(clearTimer)
    }

    let cancelled = false
    const loadingTimer = window.setTimeout(() => {
      if (!cancelled) {
        setAnalyticsLoading(true)
        setAnalyticsError('')
      }
    }, 0)

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
      window.clearTimeout(loadingTimer)
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
    DASHBOARD_CHART_COLORS,
  )
  const jobApplicationsByStatus = jobApplications.reduce<Record<string, number>>((acc, application) => {
    acc[application.status] = (acc[application.status] ?? 0) + 1
    return acc
  }, {})
  const analyticsSlices = makeDashboardSlices(Object.entries(jobApplicationsByStatus), DASHBOARD_CHART_COLORS)
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
  const upcomingInterviewsCount = useMemo(() => {
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)
    return interviews.filter(row => {
      if (!row.scheduled_at) return false
      const t = new Date(row.scheduled_at).getTime()
      if (t < startOfToday.getTime()) return false
      return row.status === 'scheduled' || row.status === 'pending'
    }).length
  }, [interviews])
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
    DASHBOARD_CHART_COLORS,
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

  const weekWindows = useMemo(() => {
    const end = new Date()
    const startCurrent = new Date(end)
    startCurrent.setDate(end.getDate() - 7)
    const startPrev = new Date(startCurrent)
    startPrev.setDate(startCurrent.getDate() - 7)
    return { end, startCurrent, startPrev, mid: startCurrent }
  }, [])

  const applicationsLast7d = useMemo(
    () => countInDateRange(allApplications, a => a.created_at, weekWindows.startCurrent, weekWindows.end),
    [allApplications, weekWindows],
  )
  const applicationsPrev7d = useMemo(
    () => countInDateRange(allApplications, a => a.created_at, weekWindows.startPrev, weekWindows.mid),
    [allApplications, weekWindows],
  )

  const offersReleasedTotal = useMemo(
    () => allApplications.filter(a => a.status === 'offer').length,
    [allApplications],
  )
  const offersLast7d = useMemo(
    () =>
      countInDateRange(
        allApplications.filter(a => a.status === 'offer'),
        a => a.updated_at,
        weekWindows.startCurrent,
        weekWindows.end,
      ),
    [allApplications, weekWindows],
  )
  const offersPrev7d = useMemo(
    () =>
      countInDateRange(
        allApplications.filter(a => a.status === 'offer'),
        a => a.updated_at,
        weekWindows.startPrev,
        weekWindows.mid,
      ),
    [allApplications, weekWindows],
  )

  const interviewsLast7d = useMemo(
    () =>
      countInDateRange(
        interviews,
        r => r.scheduled_at,
        weekWindows.startCurrent,
        weekWindows.end,
      ),
    [interviews, weekWindows],
  )
  const interviewsPrev7d = useMemo(
    () =>
      countInDateRange(
        interviews,
        r => r.scheduled_at,
        weekWindows.startPrev,
        weekWindows.mid,
      ),
    [interviews, weekWindows],
  )

  const jobsWithApplicantsLast7d = useMemo(() => {
    const set = new Set<number>()
    for (const a of allApplications) {
      const t = new Date(a.created_at).getTime()
      if (t >= weekWindows.startCurrent.getTime() && t < weekWindows.end.getTime()) set.add(a.job_id)
    }
    return set.size
  }, [allApplications, weekWindows])

  const jobsWithApplicantsPrev7d = useMemo(() => {
    const set = new Set<number>()
    for (const a of allApplications) {
      const t = new Date(a.created_at).getTime()
      if (t >= weekWindows.startPrev.getTime() && t < weekWindows.mid.getTime()) set.add(a.job_id)
    }
    return set.size
  }, [allApplications, weekWindows])

  const workspaceFunnelCounts = useMemo(() => {
    const acc: Record<string, number> = {}
    for (const s of PIPELINE_FUNNEL_STATUSES) acc[s] = 0
    for (const a of allApplications) {
      if (acc[a.status] != null) acc[a.status] += 1
    }
    return acc
  }, [allApplications])

  const funnelChartSlices: DashboardSlice[] = PIPELINE_FUNNEL_STATUSES.map((status, index) => ({
    key: status,
    label: formatDashboardLabel(status),
    value: workspaceFunnelCounts[status] ?? 0,
    color: DASHBOARD_CHART_COLORS[index % DASHBOARD_CHART_COLORS.length],
  }))

  const applicantsByJobId = useMemo(() => {
    const m = new Map<number, number>()
    for (const a of allApplications) {
      m.set(a.job_id, (m.get(a.job_id) ?? 0) + 1)
    }
    return m
  }, [allApplications])

  const dominantStageByJobId = useMemo(() => {
    const counts = new Map<number, Record<string, number>>()
    for (const a of allApplications) {
      const byJob = counts.get(a.job_id) ?? {}
      byJob[a.status] = (byJob[a.status] ?? 0) + 1
      counts.set(a.job_id, byJob)
    }
    const result = new Map<number, string>()
    for (const [jobId, byStatus] of counts) {
      let best = ''
      let bestN = -1
      for (const [st, n] of Object.entries(byStatus)) {
        if (st === 'rejected' || st === 'withdrawn') continue
        if (n > bestN) {
          best = st
          bestN = n
        }
      }
      result.set(jobId, best)
    }
    return result
  }, [allApplications])

  const topJobsByApplicants = useMemo(() => {
    return [...jobs]
      .map(job => ({ job, n: applicantsByJobId.get(job.id) ?? 0 }))
      .filter(x => x.n > 0)
      .sort((a, b) => b.n - a.n)
      .slice(0, 8)
  }, [jobs, applicantsByJobId])

  const activityItems = useMemo(() => {
    type Item = { id: string; at: number; line: string; sub: string; href: string | null }
    const items: Item[] = []
    for (const a of allApplications) {
      const t = new Date(a.created_at).getTime()
      items.push({
        id: `app-created-${a.id}`,
        at: t,
        line: `Candidate added: ${a.candidate_name || a.candidate_email}`,
        sub: jobs.find(j => j.id === a.job_id)?.title ?? `Job #${a.job_id}`,
        href: `/account/${accountId}/job-applications/${a.id}`,
      })
    }
    for (const row of interviews) {
      if (!row.scheduled_at) continue
      const t = new Date(row.scheduled_at).getTime()
      items.push({
        id: `int-${row.id}`,
        at: t,
        line: `Interview scheduled: ${row.application?.candidate_name || row.application?.candidate_email || 'Candidate'}`,
        sub: row.job?.title ?? `Job #${row.application?.job_id ?? '—'}`,
        href: `/account/${accountId}/interviews`,
      })
    }
    for (const a of allApplications) {
      const last = a.stage_history?.length ? a.stage_history[a.stage_history.length - 1] : null
      if (!last || last.stage !== 'offer') continue
      const t = new Date(last.changed_at).getTime()
      items.push({
        id: `offer-${a.id}-${last.changed_at}`,
        at: t,
        line: `Offer stage: ${a.candidate_name || a.candidate_email}`,
        sub: jobs.find(j => j.id === a.job_id)?.title ?? `Job #${a.job_id}`,
        href: `/account/${accountId}/job-applications/${a.id}`,
      })
    }
    items.sort((x, y) => y.at - x.at)
    return items.slice(0, 12)
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
        ticks: { color: '#6b7280', font: { size: 11 } },
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

  const trendCandidates = compareWindows(applicationsLast7d, applicationsPrev7d)
  const trendJobs = compareWindows(jobsWithApplicantsLast7d, jobsWithApplicantsPrev7d)
  const trendInterviews = compareWindows(interviewsLast7d, interviewsPrev7d)
  const trendOffers = compareWindows(offersLast7d, offersPrev7d)

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
            Pipeline velocity, candidate volume, and hiring outcomes across your workspace — with role-level drilldown when you
            select a job.
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

      <div className="dashboard-kpi-grid dashboard-summary-grid">
        <DashboardSummaryCard
          label="Total Candidates"
          value={totalApplicantsAcrossJobs}
          footnote={`${applicationsLast7d} new in last 7 days`}
          icon={<IconUsers />}
          trend={trendCandidates}
        />
        <DashboardSummaryCard
          label="Active Jobs"
          value={openJobs}
          footnote={`${jobs.length} total roles in workspace`}
          icon={<IconBriefcase />}
          trend={trendJobs}
        />
        <DashboardSummaryCard
          label="Interviews Scheduled"
          value={upcomingInterviewsCount}
          footnote="Upcoming on calendar"
          icon={<IconCalendar />}
          trend={trendInterviews}
        />
        <DashboardSummaryCard
          label="Offers Released"
          value={offersReleasedTotal}
          footnote="Candidates currently in offer"
          icon={<IconGift />}
          trend={trendOffers}
        />
      </div>

      <div className="dashboard-secondary-strip">
        <div className="dashboard-secondary-metric">
          <span>MoM applications</span>
          <strong>{monthlyDeltaLabel}</strong>
          <small>
            {currentMonthApplications} this month vs {previousMonthApplications} last
          </small>
        </div>
        <div className="dashboard-secondary-metric">
          <span>Total hired</span>
          <strong>{totalHiredCandidates}</strong>
          <small>{openingFillRate}% fill rate vs openings</small>
        </div>
        <div className="dashboard-secondary-metric">
          <span>Selected job interviews</span>
          <strong>{scheduledInterviews}</strong>
          <small>Matches job filter below</small>
        </div>
      </div>

      <div className="dashboard-grid">
        <DashboardPanel title="Workspace Pipeline Funnel">
          <div className="dashboard-panel-content">
            {funnelChartSlices.every(s => s.value === 0) ? (
              <div className="dashboard-empty">No candidates in funnel stages yet.</div>
            ) : (
              <div className="dashboard-chart-shell dashboard-chart-shell-funnel">
                <Bar
                  data={{
                    labels: funnelChartSlices.map(s => s.label),
                    datasets: [
                      {
                        data: funnelChartSlices.map(s => s.value),
                        backgroundColor: funnelChartSlices.map(s => s.color),
                        borderRadius: 8,
                        maxBarThickness: 28,
                      },
                    ],
                  }}
                  options={funnelBarOptions}
                />
              </div>
            )}
            <p className="dashboard-footnote dashboard-footnote-tight">Counts all applications in Applied → Hired stages (workspace-wide).</p>
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

        <DashboardPanel title="Candidates by Job">
          <div className="dashboard-panel-content">
            {jobsLoading ? (
              <div className="dashboard-skeleton-stack">
                <DashboardSkeletonBlock />
                <DashboardSkeletonBlock />
              </div>
            ) : topJobsByApplicants.length === 0 ? (
              <div className="dashboard-empty">No applicants yet. Open a job to start collecting applications.</div>
            ) : (
              <div className="dashboard-chart-shell dashboard-chart-shell-short">
                <Bar
                  data={{
                    labels: topJobsByApplicants.map(x => x.job.title),
                    datasets: [
                      {
                        data: topJobsByApplicants.map(x => x.n),
                        backgroundColor: 'rgba(14, 165, 233, 0.55)',
                        borderColor: 'rgba(14, 165, 233, 0.95)',
                        borderWidth: 1,
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

        <DashboardPanel title="Source of Candidates (Selected Job)">
          <div className="dashboard-panel-content">
            {analyticsLoading ? (
              <div className="dashboard-skeleton-stack">
                <DashboardSkeletonBlock tall />
              </div>
            ) : sourceSlices.length === 0 ? (
              <div className="dashboard-empty">No source data is available for this job.</div>
            ) : (
              <>
                <DashboardPieChart slices={sourceSlices} emptyLabel="No source data is available for this job." />
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

        <DashboardPanel title="Recent Activity">
          <div className="dashboard-panel-content">
            {allApplications.length === 0 && interviews.length === 0 ? (
              <div className="dashboard-empty">Activity will appear as you add candidates and schedule interviews.</div>
            ) : (
              <ul className="dashboard-activity-list">
                {activityItems.map(item => (
                  <li key={item.id} className="dashboard-activity-item">
                    <div className="dashboard-activity-dot" aria-hidden />
                    <div className="dashboard-activity-body">
                      {item.href ? (
                        <Link className="dashboard-activity-title" to={item.href}>
                          {item.line}
                        </Link>
                      ) : (
                        <span className="dashboard-activity-title">{item.line}</span>
                      )}
                      <span className="dashboard-activity-sub">{item.sub}</span>
                    </div>
                    <span className="dashboard-activity-time">{formatRelativeDay(item.at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Jobs Overview">
          <div className="dashboard-panel-content dashboard-table-wrap">
            {jobsLoading ? (
              <div className="dashboard-skeleton-stack">
                <DashboardSkeletonBlock />
                <DashboardSkeletonBlock />
                <DashboardSkeletonBlock />
              </div>
            ) : jobsError ? (
              <ErrorRow msg={jobsError} />
            ) : jobs.length === 0 ? (
              <div className="dashboard-empty">No jobs yet. Create a role to get started.</div>
            ) : (
              <table className="dashboard-jobs-table">
                <thead>
                  <tr>
                    <th>Job title</th>
                    <th>Status</th>
                    <th>Applicants</th>
                    <th>Stage</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map(job => {
                    const count = applicantsByJobId.get(job.id) ?? 0
                    const dom = dominantStageByJobId.get(job.id)
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
                          <span className={`tag ${STAGE_COLORS[job.status] ?? 'tag-blue'}`}>{formatDashboardLabel(job.status)}</span>
                        </td>
                        <td>{count}</td>
                        <td>{dom ? <span className="dashboard-stage-pill">{formatDashboardLabel(dom)}</span> : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
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
                <div className="dashboard-footnote">Select a role to update pipeline and source analytics.</div>
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
                <div className="dashboard-footnote">Click a metric card to inspect candidate-level records in detail.</div>
              </>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Applicant Sources (Bar)">
          <div className="dashboard-panel-content">
            {analyticsLoading ? (
              <LoadingRow />
            ) : sourceSlices.length === 0 ? (
              <div className="dashboard-empty">No source data is available for this job.</div>
            ) : (
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

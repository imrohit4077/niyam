import { useEffect, useMemo, useState } from 'react'
/* eslint-disable react-hooks/set-state-in-effect -- async data effects reset loading state at start (standard fetch pattern) */
import { Link, useOutletContext } from 'react-router-dom'
import { type ChartOptions } from 'chart.js'
import { Line } from 'react-chartjs-2'
import type { DashboardOutletContext } from '../layouts/DashboardOutletContext'
import { jobsApi, type Job } from '../api/jobs'
import { applicationsApi, type Application } from '../api/applications'
import { interviewsApi, type InterviewAssignmentRow } from '../api/interviews'
import '../components/dashboard/chartRegister'
import { DashboardKpiCard } from '../components/dashboard/DashboardKpiCard'
import { DashboardPanel } from '../components/dashboard/DashboardPanel'
import { DashboardDoughnutChart } from '../components/dashboard/DashboardDoughnutChart'
import { DashboardFunnelChart } from '../components/dashboard/DashboardFunnelChart'
import { DashboardSourcePieChart } from '../components/dashboard/DashboardSourcePieChart'
import { DashboardJobDistributionBar } from '../components/dashboard/DashboardJobDistributionBar'
import { DashboardActivityFeed, type ActivityItem } from '../components/dashboard/DashboardActivityFeed'
import { DashboardLoadingBlock } from '../components/dashboard/DashboardLoading'
import { makeDashboardSlices, formatDashboardLabel } from '../components/dashboard/dashboardFormatters'
import { DASHBOARD_CHART_BRAND } from '../components/dashboard/dashboardConstants'

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

type PipelineModalKind = 'applicants' | 'interviews' | 'offers' | 'hired'

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

function formatDateTimeShort(value: string | null) {
  if (!value) return 'Not scheduled'
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function relTime(iso: string) {
  const t = new Date(iso).getTime()
  const d = Date.now() - t
  const m = Math.floor(d / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function jobStageLabel(status: string) {
  if (status === 'open') return 'Recruiting'
  if (status === 'paused') return 'Paused'
  if (status === 'closed') return 'Closed'
  if (status === 'draft') return 'Draft'
  return formatDashboardLabel(status)
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
        per_page: 40,
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

  const workspaceScheduledInterviews = useMemo(
    () =>
      interviews.filter(
        row => row.status === 'scheduled' || row.status === 'pending' || !!row.scheduled_at,
      ),
    [interviews],
  )

  const offerApplicationCount = useMemo(
    () => allApplications.filter(a => a.status === 'offer').length,
    [allApplications],
  )

  const applicantsByJob = useMemo(() => {
    const m: Record<number, number> = {}
    allApplications.forEach(a => {
      m[a.job_id] = (m[a.job_id] ?? 0) + 1
    })
    return m
  }, [allApplications])

  const { monthlyTrend, prevMonthApplications, twoMonthsAgoApplications, weekScheduled, prevWeekScheduled } = useMemo(() => {
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

    const d = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const prevYm = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const d2 = new Date(now.getFullYear(), now.getMonth() - 2, 1)
    const twoAgoYm = `${d2.getFullYear()}-${String(d2.getMonth() + 1).padStart(2, '0')}`

    const startWeek = new Date(now)
    startWeek.setDate(now.getDate() - now.getDay())
    startWeek.setHours(0, 0, 0, 0)
    const prevStart = new Date(startWeek)
    prevStart.setDate(startWeek.getDate() - 7)
    const prevEnd = new Date(startWeek.getTime() - 1)

    let wk = 0
    let pw = 0
    workspaceScheduledInterviews.forEach(row => {
      const t = row.scheduled_at
      if (!t) return
      const time = new Date(t).getTime()
      if (time >= startWeek.getTime()) wk += 1
      if (time >= prevStart.getTime() && time <= prevEnd.getTime()) pw += 1
    })

    return {
      monthlyTrend: keys.map(item => ({ label: item.label, value: counters[item.key] ?? 0, key: item.key })),
      prevMonthApplications: counters[prevYm] ?? 0,
      twoMonthsAgoApplications: counters[twoAgoYm] ?? 0,
      weekScheduled: wk,
      prevWeekScheduled: pw,
    }
  }, [allApplications, workspaceScheduledInterviews])

  const { offersThisMonth, offersPrevMonth } = useMemo(() => {
    const now = new Date()
    const startThis = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
    const startPrev = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime()
    const endPrev = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999).getTime()
    let t = 0
    let p = 0
    allApplications.forEach(a => {
      if (a.status !== 'offer') return
      const time = new Date(a.updated_at).getTime()
      if (time >= startThis) t += 1
      else if (time >= startPrev && time <= endPrev) p += 1
    })
    return { offersThisMonth: t, offersPrevMonth: p }
  }, [allApplications])

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
  const maxSourceValue = Math.max(...sourceSlices.map(slice => slice.value), 0)
  const sourceTopLabel = sourceSlices.find(slice => slice.value === maxSourceValue)?.label ?? 'No data'

  const funnelCounts = {
    applied: jobApplicationsByStatus.applied ?? 0,
    screening: jobApplicationsByStatus.screening ?? 0,
    interview: jobApplicationsByStatus.interview ?? 0,
    offer: jobApplicationsByStatus.offer ?? 0,
    hired: jobApplicationsByStatus.hired ?? 0,
  }

  const activityItems: ActivityItem[] = useMemo(() => {
    const out: { t: number; item: ActivityItem }[] = []
    const jobTitle = (id: number) => jobs.find(j => j.id === id)?.title ?? `Job #${id}`

    const appSorted = [...allApplications].sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    )
    appSorted.slice(0, 10).forEach(app => {
      const isNew = Math.abs(new Date(app.created_at).getTime() - new Date(app.updated_at).getTime()) < 5000
      out.push({
        t: new Date(app.updated_at).getTime(),
        item: {
          id: `app-${app.id}`,
          title: isNew
            ? `New candidate: ${app.candidate_name || app.candidate_email}`
            : `Application updated: ${app.candidate_name || app.candidate_email}`,
          meta: `${jobTitle(app.job_id)} · ${formatDashboardLabel(app.status)} · ${relTime(app.updated_at)}`,
          icon: isNew ? 'mail' : 'briefcase',
        },
      })
    })

    const intSorted = [...interviews]
      .filter(i => i.scheduled_at)
      .sort((a, b) => new Date(b.scheduled_at!).getTime() - new Date(a.scheduled_at!).getTime())
    intSorted.slice(0, 8).forEach(row => {
      const jid = row.job?.id ?? row.application?.job_id
      out.push({
        t: new Date(row.scheduled_at!).getTime(),
        item: {
          id: `int-${row.id}`,
          title: `Interview: ${row.application?.candidate_name || row.application?.candidate_email || 'Candidate'}`,
          meta: `${row.job?.title ?? jobTitle(jid ?? 0)} · ${formatDateTimeShort(row.scheduled_at)}`,
          icon: 'calendar',
        },
      })
    })

    out.sort((a, b) => b.t - a.t)
    return out.slice(0, 12).map(x => x.item)
  }, [allApplications, interviews, jobs])

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

  const kpiLoading = jobsLoading
  const scheduledForJob = interviewPanelRows.length

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
                  <DashboardLoadingBlock label="Loading interviews..." />
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
                          <span>
                            {new Date(application.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
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
                          <span>
                            {new Date(application.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
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
                        <span>
                          {new Date(application.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
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
            Real-time view of your pipeline, sources, and hiring activity — select a job to focus analytics.
          </p>
        </div>
        <div className="dashboard-hero-meta">
          <div className="dashboard-hero-meta-item">
            <span>Pipeline health</span>
            <strong>{conversionRate >= 25 ? 'Strong' : conversionRate >= 10 ? 'Stable' : 'Needs attention'}</strong>
          </div>
          <div className="dashboard-hero-meta-item">
            <span>Fill rate</span>
            <strong>{openingFillRate}%</strong>
          </div>
          <div className="dashboard-hero-meta-item">
            <span>Avg applicants / job</span>
            <strong>{avgApplicantsPerJob}</strong>
          </div>
        </div>
      </div>

      {kpiLoading ? (
        <div className="dashboard-kpi-grid" aria-hidden>
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="dashboard-skeleton-kpi" />
          ))}
        </div>
      ) : (
        <div className="dashboard-kpi-grid">
          <DashboardKpiCard
            primary
            icon="candidates"
            title="Total candidates"
            value={totalApplicantsAcrossJobs}
            trend={{ current: prevMonthApplications, previous: twoMonthsAgoApplications }}
            caption="Across all jobs (MoM change)"
          />
          <DashboardKpiCard
            icon="jobs"
            title="Active jobs"
            value={openJobs}
            trend={null}
            caption={`${jobs.length} total roles in workspace`}
          />
          <DashboardKpiCard
            icon="interview"
            title="Interviews scheduled"
            value={weekScheduled}
            trend={{ current: weekScheduled, previous: prevWeekScheduled }}
            caption="This week vs last week"
          />
          <DashboardKpiCard
            icon="offer"
            title="Offers released"
            value={offerApplicationCount}
            trend={{ current: offersThisMonth, previous: offersPrevMonth }}
            caption="Applications in offer stage (MoM activity on offer records)"
          />
        </div>
      )}

      <div className="dashboard-grid">
        <DashboardPanel title="Jobs by status" className="dashboard-panel-tall">
          <div className="dashboard-panel-content">
            {jobsLoading ? (
              <DashboardLoadingBlock label="Loading jobs..." />
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
                <p className="dashboard-footnote">Select a role to update pipeline, sources, and charts.</p>
              </>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Pipeline funnel" className="dashboard-panel-tall">
          <div className="dashboard-panel-content">
            {analyticsLoading ? (
              <DashboardLoadingBlock label="Loading pipeline..." />
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
                <DashboardFunnelChart counts={funnelCounts} emptyLabel="No applicants for this job yet." />
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
                    <strong>{scheduledForJob}</strong>
                    <span>Interviews</span>
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
                    <span>Hire conversion</span>
                  </div>
                  <div className="dashboard-microstat-card">
                    <strong>{rejectedCount}</strong>
                    <span>Rejected / withdrawn</span>
                  </div>
                </div>
                <p className="dashboard-footnote">Click a metric to see candidate records.</p>
              </>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Source of candidates">
          <div className="dashboard-panel-content">
            {analyticsLoading ? (
              <DashboardLoadingBlock />
            ) : sourceSlices.length === 0 ? (
              <div className="dashboard-empty">No source data for this job.</div>
            ) : (
              <>
                <div className="dashboard-pie-bar-row">
                  <div className="dashboard-pie-wrap">
                    <DashboardSourcePieChart slices={sourceSlices} emptyLabel="No sources." />
                  </div>
                  <div className="dashboard-source-insights">
                    <div className="dashboard-insight-card">
                      <strong>{sourceTopLabel}</strong>
                      <span>Top source</span>
                    </div>
                    <div className="dashboard-insight-card">
                      <strong>{sourceSlices.length}</strong>
                      <span>Source channels</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Job-wise applicants">
          <div className="dashboard-panel-content">
            <DashboardJobDistributionBar jobs={jobs} allApplications={allApplications} />
          </div>
        </DashboardPanel>

        <DashboardPanel title="Application trend" className="dashboard-panel-wide">
          <div className="dashboard-panel-content">
            {monthlyTrend.every(item => item.value === 0) ? (
              <div className="dashboard-empty">No application activity in the last 6 months.</div>
            ) : (
              <div className="dashboard-chart-shell dashboard-chart-shell-short">
                <Line
                  data={{
                    labels: monthlyTrend.map(item => item.label),
                    datasets: [
                      {
                        data: monthlyTrend.map(item => item.value),
                        borderColor: DASHBOARD_CHART_BRAND,
                        backgroundColor: 'rgba(37,99,235,0.12)',
                        borderWidth: 2,
                        pointRadius: 4,
                        pointHoverRadius: 5,
                        pointBackgroundColor: '#ffffff',
                        pointBorderColor: DASHBOARD_CHART_BRAND,
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

        <DashboardPanel title="Upcoming interviews">
          <div className="dashboard-panel-content">
            {interviewsLoading ? (
              <DashboardLoadingBlock label="Loading..." />
            ) : interviewsError ? (
              <ErrorRow msg={interviewsError} />
            ) : filteredUpcomingInterviews.length === 0 ? (
              <div className="dashboard-empty">No interviews in this scope.</div>
            ) : (
              <div className="dashboard-schedule">
                {filteredUpcomingInterviews.slice(0, 6).map(row => (
                  <div key={row.id} className="dashboard-schedule-item">
                    <div>
                      <strong>{row.application?.candidate_name || row.application?.candidate_email || 'Candidate'}</strong>
                      <span>{row.job?.title ?? `Job #${row.application?.job_id ?? '—'}`}</span>
                    </div>
                    <div className="dashboard-schedule-meta">
                      <span className={`tag ${STAGE_COLORS[row.status] ?? 'tag-blue'}`}>
                        {formatDashboardLabel(row.status)}
                      </span>
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

        <DashboardPanel title="Activity">
          <div className="dashboard-panel-content">
            {jobsLoading && allApplications.length === 0 ? (
              <DashboardLoadingBlock label="Loading activity..." />
            ) : (
              <DashboardActivityFeed
                items={activityItems}
                emptyLabel="No recent activity yet. Applications and scheduled interviews will appear here."
              />
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Jobs overview" className="dashboard-panel-full">
          <div className="dashboard-panel-content dashboard-table-panel">
            {jobsLoading ? (
              <DashboardLoadingBlock label="Loading jobs..." />
            ) : jobsError ? (
              <ErrorRow msg={jobsError} />
            ) : jobs.length === 0 ? (
              <div className="dashboard-empty">No jobs yet. Create a role to get started.</div>
            ) : (
              <div className="dashboard-table-wrap">
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
                    {jobs.map(job => (
                      <tr key={job.id}>
                        <td>
                          <Link className="dashboard-table-link" to={`/account/${accountId}/jobs/${job.id}/edit`}>
                            {job.title}
                          </Link>
                        </td>
                        <td>
                          <span className={`tag ${STAGE_COLORS[job.status] ?? 'tag-gray'}`}>{formatDashboardLabel(job.status)}</span>
                        </td>
                        <td>{applicantsByJob[job.id] ?? 0}</td>
                        <td className="dashboard-table-muted">{jobStageLabel(job.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </DashboardPanel>
      </div>
    </>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import type { DashboardOutletContext } from '../layouts/DashboardOutletContext'
import { jobsApi, type Job } from '../api/jobs'
import { applicationsApi, type Application } from '../api/applications'
import { interviewsApi, type InterviewAssignmentRow } from '../api/interviews'
import { FUNNEL_STAGES, STAGE_COLORS, type FunnelStage } from '../components/dashboard/dashboardConstants'
import {
  countApplicationsInWindow,
  formatDashboardLabel,
  formatDateTimeShort,
  makeDashboardSlices,
  pctChange,
  trailingPeriodPair,
} from '../components/dashboard/dashboardFormat'
import { DashboardPanel } from '../components/dashboard/DashboardPanel'
import {
  DashboardBarChart,
  DashboardDoughnutChart,
  DashboardLineChart,
} from '../components/dashboard/DashboardCharts'
import {
  DashboardSummaryKpi,
  KpiIconBriefcase,
  KpiIconCalendar,
  KpiIconCandidates,
  KpiIconGift,
} from '../components/dashboard/DashboardSummaryKpi'
import { buildActivityFeed } from '../components/dashboard/dashboardActivityModel'
import { DashboardActivityFeed } from '../components/dashboard/DashboardActivityFeed'
import { buildJobTableRows } from '../components/dashboard/dashboardJobsModel'
import { DashboardJobsTable } from '../components/dashboard/DashboardJobsTable'

const FUNNEL_LABELS = FUNNEL_STAGES.map(s => formatDashboardLabel(s))

type PipelineModalKind = 'applicants' | 'interviews' | 'offers' | 'hired'

function LoadingRow() {
  return (
    <div className="dashboard-skeleton-panel" role="status" aria-label="Loading">
      <div className="dashboard-skeleton-line dashboard-skeleton-line-lg" />
      <div className="dashboard-skeleton-line" />
      <div className="dashboard-skeleton-line dashboard-skeleton-line-short" />
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

function countHistoryTransitionsToStage(applications: Application[], stage: string, window: { start: number; end: number }) {
  let n = 0
  for (const app of applications) {
    for (const h of app.stage_history ?? []) {
      if (h.stage === stage) {
        const t = new Date(h.changed_at).getTime()
        if (t >= window.start && t < window.end) n += 1
      }
    }
  }
  return n
}

function countInterviewsScheduledInWindow(rows: InterviewAssignmentRow[], window: { start: number; end: number }) {
  return rows.filter(row => {
    if (!row.scheduled_at) return false
    const t = new Date(row.scheduled_at).getTime()
    return t >= window.start && t < window.end
  }).length
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

  const periodPair = useMemo(() => trailingPeriodPair(30), [])

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

  const applicationsByJobId = useMemo(() => {
    const m = new Map<number, Record<string, number>>()
    for (const app of allApplications) {
      const cur = m.get(app.job_id) ?? {}
      cur[app.status] = (cur[app.status] ?? 0) + 1
      m.set(app.job_id, cur)
    }
    return m
  }, [allApplications])

  const funnelWorkspaceCounts = useMemo(() => {
    const acc: Record<string, number> = {}
    for (const s of FUNNEL_STAGES) acc[s] = 0
    for (const app of allApplications) {
      if (FUNNEL_STAGES.includes(app.status as FunnelStage)) {
        acc[app.status] = (acc[app.status] ?? 0) + 1
      }
    }
    return FUNNEL_STAGES.map(stage => acc[stage] ?? 0)
  }, [allApplications])

  const funnelColors = FUNNEL_STAGES.map((_, i) => ['#0ea5e9', '#3b82f6', '#6366f1', '#10b981', '#059669'][i] ?? '#6b7280')

  const jobDistribution = useMemo(() => {
    const pairs = jobs.map(job => {
      const by = applicationsByJobId.get(job.id) ?? {}
      const n = Object.values(by).reduce((s, v) => s + v, 0)
      return { job, n }
    })
    pairs.sort((a, b) => b.n - a.n)
    const top = pairs.slice(0, 12)
    return {
      labels: top.map(({ job }) => (job.title.length > 28 ? `${job.title.slice(0, 26)}…` : job.title)),
      values: top.map(({ n }) => n),
      colors: top.map((_, i) => ['#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#64748b'][i % 6]),
    }
  }, [jobs, applicationsByJobId])

  const jobTableRows = useMemo(() => buildJobTableRows(jobs, applicationsByJobId), [jobs, applicationsByJobId])

  const activityItems = useMemo(
    () => buildActivityFeed(allApplications, interviews, accountId, 12),
    [allApplications, interviews, accountId],
  )

  const offersReleasedTotal = useMemo(
    () => allApplications.filter(a => a.status === 'offer').length,
    [allApplications],
  )

  const kpiTrends = useMemo(() => {
    const { current, previous } = periodPair
    const appsCreatedCur = countApplicationsInWindow(
      allApplications.map(a => a.created_at),
      current,
    )
    const appsCreatedPrev = countApplicationsInWindow(
      allApplications.map(a => a.created_at),
      previous,
    )

    const jobsListedCur = jobs.filter(j => {
      const t = new Date(j.created_at).getTime()
      return t >= current.start && t < current.end
    }).length
    const jobsListedPrev = jobs.filter(j => {
      const t = new Date(j.created_at).getTime()
      return t >= previous.start && t < previous.end
    }).length

    const intCur = countInterviewsScheduledInWindow(interviews, current)
    const intPrev = countInterviewsScheduledInWindow(interviews, previous)

    const offerCur = countHistoryTransitionsToStage(allApplications, 'offer', current)
    const offerPrev = countHistoryTransitionsToStage(allApplications, 'offer', previous)

    return {
      candidates: pctChange(appsCreatedCur, appsCreatedPrev),
      jobs: pctChange(jobsListedCur, jobsListedPrev),
      interviews: pctChange(intCur, intPrev),
      offers: pctChange(offerCur, offerPrev),
    }
  }, [allApplications, jobs, interviews, periodPair])

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
  const workspaceAnalyticsLoading = applicationsLoading

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
            Pipeline velocity, candidate sources, and role health — in one calm view. Tune the selected job to drill into a single requisition.
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

      <div className="dashboard-summary-kpi-grid" role="region" aria-label="Key metrics">
        <DashboardSummaryKpi
          icon={<KpiIconCandidates />}
          label="Total candidates"
          value={applicationsLoading ? '—' : totalApplicantsAcrossJobs}
          trend={{ pct: kpiTrends.candidates, label: 'Application inflow vs prior 30 days' }}
          sublabel={applicationsLoading ? 'Loading workspace…' : 'Workspace total · inflow vs prior 30d'}
          highlight
        />
        <DashboardSummaryKpi
          icon={<KpiIconBriefcase />}
          label="Active jobs"
          value={jobsLoading ? '—' : openJobs}
          trend={{ pct: kpiTrends.jobs, label: 'New listings vs prior 30 days' }}
          sublabel={jobsLoading ? 'Loading…' : `${openJobs} open · ${jobs.length} total roles`}
        />
        <DashboardSummaryKpi
          icon={<KpiIconCalendar />}
          label="Interviews scheduled"
          value={interviewsLoading ? '—' : workspaceUpcomingInterviews}
          trend={{ pct: kpiTrends.interviews, label: 'Newly scheduled vs prior 30 days' }}
          sublabel={interviewsLoading ? 'Loading…' : 'Upcoming on your calendar scope'}
        />
        <DashboardSummaryKpi
          icon={<KpiIconGift />}
          label="Offers released"
          value={applicationsLoading ? '—' : offersReleasedTotal}
          trend={{ pct: kpiTrends.offers, label: 'Stage moves to offer vs prior 30 days' }}
          sublabel={applicationsLoading ? 'Loading…' : 'Candidates currently in offer stage'}
        />
      </div>

      <div className="dashboard-secondary-strip" role="region" aria-label="Secondary metrics">
        <div className="dashboard-secondary-item">
          <span>Jobs listed</span>
          <strong>{jobsLoading ? '—' : jobs.length}</strong>
        </div>
        <div className="dashboard-secondary-item">
          <span>Monthly pipeline delta</span>
          <strong>{monthlyDeltaLabel}</strong>
          <small>
            {currentMonthApplications} this month vs {previousMonthApplications} last
          </small>
        </div>
        <div className="dashboard-secondary-item">
          <span>Total hired</span>
          <strong>{applicationsLoading ? '—' : totalHiredCandidates}</strong>
          <small>{openingFillRate}% fill rate across openings</small>
        </div>
      </div>

      <div className="dashboard-grid">
        <DashboardPanel title="Jobs by status">
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
                <div className="dashboard-footnote">Select a role to update pipeline, sources, and interview scope.</div>
              </>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Selected job pipeline">
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
                    <span>Hire conversion</span>
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

        <DashboardPanel title="Pipeline funnel (workspace)">
          <div className="dashboard-panel-content">
            {workspaceAnalyticsLoading ? (
              <LoadingRow />
            ) : funnelWorkspaceCounts.every(v => v === 0) ? (
              <div className="dashboard-empty">No candidates in funnel stages yet.</div>
            ) : (
              <DashboardBarChart
                labels={FUNNEL_LABELS}
                values={funnelWorkspaceCounts}
                colors={funnelColors}
                horizontal
                shellClassName="dashboard-chart-shell dashboard-chart-shell-funnel"
              />
            )}
            <p className="dashboard-chart-caption">Applied → Screening → Interview → Offer → Hired across all jobs.</p>
          </div>
        </DashboardPanel>

        <DashboardPanel title="Applications over time">
          <div className="dashboard-panel-content">
            {workspaceAnalyticsLoading ? (
              <LoadingRow />
            ) : monthlyTrend.every(item => item.value === 0) ? (
              <div className="dashboard-empty">No recent application activity yet.</div>
            ) : (
              <DashboardLineChart labels={monthlyTrend.map(m => m.label)} values={monthlyTrend.map(m => m.value)} />
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Applicant sources (selected job)">
          <div className="dashboard-panel-content">
            {analyticsLoading ? (
              <LoadingRow />
            ) : sourceSlices.length === 0 ? (
              <div className="dashboard-empty">No source data is available for this job.</div>
            ) : (
              <>
                <DashboardBarChart
                  labels={sourceSlices.map(s => s.label)}
                  values={sourceSlices.map(s => s.value)}
                  colors={sourceSlices.map(s => s.color)}
                  shellClassName="dashboard-chart-shell dashboard-chart-shell-short"
                />
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

        <DashboardPanel title="Candidate sources (workspace)">
          <div className="dashboard-panel-content">
            {workspaceAnalyticsLoading ? (
              <LoadingRow />
            ) : (
              <DashboardDoughnutChart slices={workspaceSourceSlices} emptyLabel="No applications yet." legendLabel="Sources" />
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Applicants by job">
          <div className="dashboard-panel-content">
            {workspaceAnalyticsLoading || jobsLoading ? (
              <LoadingRow />
            ) : jobDistribution.labels.length === 0 ? (
              <div className="dashboard-empty">Add jobs to see distribution.</div>
            ) : (
              <DashboardBarChart labels={jobDistribution.labels} values={jobDistribution.values} colors={jobDistribution.colors} />
            )}
            <p className="dashboard-chart-caption">Top roles by applicant volume (workspace).</p>
          </div>
        </DashboardPanel>

        <DashboardPanel title="Recent activity">
          <div className="dashboard-panel-content">
            <DashboardActivityFeed
              items={activityItems}
              loading={applicationsLoading || interviewsLoading}
              emptyLabel="No recent activity yet."
              accountId={accountId}
            />
          </div>
        </DashboardPanel>

        <DashboardPanel title="Upcoming interviews (selected scope)">
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

        <DashboardPanel title="Jobs overview">
          <div className="dashboard-panel-content dashboard-panel-content-flush">
            <DashboardJobsTable rows={jobTableRows} loading={jobsLoading || applicationsLoading} accountId={accountId} />
          </div>
        </DashboardPanel>
      </div>
    </>
  )
}

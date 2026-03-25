import type { Application } from './applications'

const BASE = '/api/v1'

export type ReferralAccountSettings = {
  enabled: boolean
  public_apply_base_url: string
  notify_referrer_milestones: boolean
  hris_webhook_url: string
  hris_webhook_secret: string
}

export type ReferralLinkPayload = {
  id: number
  token: string
  job_id: number
  apply_token: string
  referral_url: string
  path_with_query: string
}

export type ReferralBonusRow = {
  id: number
  account_id: number
  application_id: number
  referral_link_id: number | null
  referrer_user_id: number
  amount: number
  currency: string
  status: string
  eligible_after: string | null
  paid_at: string | null
  hris_sync_status: string
  external_payout_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type LeaderboardEntry = {
  user_id: number
  name: string
  email: string
  referrals_count: number
  hires_count: number
}

export type ReferralGeneratedLinkRow = {
  id: number
  account_id: number
  employee_user_id: number
  job_id: number
  token: string
  created_at: string
  updated_at: string
  employee: { id: number; name: string; email: string } | null
  job: { id: number; title: string; department: string | null; status: string } | null
  applications_count: number
  awaiting_first_apply: boolean
}

export type ReferralEnrichedApplication = Application & {
  job?: { id: number; title: string; department: string | null; status: string } | null
  referrer?: { id: number; name: string; email: string } | null
  bonus?: {
    id: number
    status: string
    amount: number
    currency: string
    eligible_after: string | null
    paid_at: string | null
  } | null
}

export type ReferralBonusEnriched = ReferralBonusRow & {
  application: ReferralEnrichedApplication | null
  referrer: { id: number; name: string; email: string } | null
  job: { id: number; title: string; department: string | null; status: string } | null
}

export type ReferralAdminOverview = {
  generated_links: ReferralGeneratedLinkRow[]
  active_referrals: ReferralEnrichedApplication[]
  past_referrals: ReferralEnrichedApplication[]
  hired_referrals: ReferralEnrichedApplication[]
  bonuses_pending: ReferralBonusEnriched[]
  bonuses_paid: ReferralBonusEnriched[]
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

async function req<T>(path: string, token: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { ...authHeaders(token), ...(options.headers as Record<string, string> ?? {}) },
    ...options,
  })
  const json = await res.json()
  if (!json.success) throw new Error(json.error || 'Request failed')
  return json.data as T
}

export const referralsApi = {
  getAccountSettings: (token: string) => req<ReferralAccountSettings>('/account/referral_settings', token),

  updateAccountSettings: (token: string, patch: Partial<ReferralAccountSettings>) =>
    req<ReferralAccountSettings>('/account/referral_settings', token, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),

  getJobReferralLink: (token: string, jobId: number) =>
    req<ReferralLinkPayload>(`/jobs/${jobId}/referral_link`, token),

  listBonuses: (token: string, status?: string) => {
    const q = status ? `?status=${encodeURIComponent(status)}` : ''
    return req<ReferralBonusRow[]>(`/referral_bonuses${q}`, token)
  },

  updateBonus: (token: string, id: number, body: Record<string, unknown>) =>
    req<ReferralBonusRow>(`/referral_bonuses/${id}`, token, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  exportBonusesCsv: async (token: string): Promise<Blob> => {
    const res = await fetch(`${BASE}/referral_bonuses/export`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      throw new Error((j as { error?: string }).error || 'Export failed')
    }
    return res.blob()
  },

  leaderboard: (token: string, limit?: number) => {
    const q = limit != null ? `?limit=${limit}` : ''
    return req<{ leaderboard: LeaderboardEntry[] }>(`/referrals/leaderboard${q}`, token)
  },

  myReferrals: (token: string) => req<Application[]>('/referrals/my', token),

  adminOverview: (token: string) => req<ReferralAdminOverview>('/referrals/admin/overview', token),
}

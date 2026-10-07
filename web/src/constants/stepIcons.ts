import type { Model3DName } from '../icons'

/** 3D icon for each job-setup section and role-kickoff step (wizard headers). */
const STEP_ICONS: Record<string, Model3DName> = {
  basic_info: 'jobs',
  role_details: 'jobs',
  objectives: 'plans',
  skills: 'sparkle',
  compensation: 'trophy',
  referral: 'referrals',
  hiring_team: 'team',
  recruiter: 'profile',
  pipeline: 'pipeline',
  interview: 'stages',
  evaluation: 'audit',
  posting: 'postings',
  automation: 'sparkle',
  analytics: 'analytics',
  attachments: 'folder',
  permissions: 'lock',
  compliance: 'audit',
}

export function stepIcon(stepId: string | undefined): Model3DName {
  return (stepId && STEP_ICONS[stepId]) || 'jobs'
}

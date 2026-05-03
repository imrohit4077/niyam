export type JobSetupSectionId =
  | 'basic_info'
  | 'skills'
  | 'compensation'
  | 'referral'
  | 'hiring_team'
  | 'pipeline'
  | 'interview'
  | 'evaluation'
  | 'posting'
  | 'automation'
  | 'analytics'
  | 'attachments'
  | 'permissions'
  | 'compliance'

export const JOB_SETUP_SECTIONS: { id: JobSetupSectionId; label: string }[] = [
  { id: 'basic_info', label: 'Basic Job Info' },
  { id: 'skills', label: 'Skills' },
  { id: 'compensation', label: 'Compensation & budget' },
  { id: 'referral', label: 'Employee referrals' },
  { id: 'hiring_team', label: 'Hiring team' },
  { id: 'pipeline', label: 'Hiring pipeline' },
  { id: 'interview', label: 'Hiring stages' },
  { id: 'evaluation', label: 'Evaluation & scorecards' },
  { id: 'posting', label: 'Posting & visibility' },
  { id: 'automation', label: 'Automation & AI' },
  { id: 'analytics', label: 'Analytics & tracking' },
  { id: 'attachments', label: 'Attachments' },
  { id: 'permissions', label: 'Permissions' },
  { id: 'compliance', label: 'Compliance & metadata' },
]

export const DEFAULT_ENABLED_JOB_SETUP_SECTIONS: JobSetupSectionId[] = JOB_SETUP_SECTIONS.map(s => s.id)

export const DEFAULT_JOB_SETUP_FIELDS_BY_SECTION: Record<JobSetupSectionId, string[]> = {
  basic_info: ['core_details', 'location_mode', 'role_characteristics', 'requirements', 'custom_fields', 'labels', 'description'],
  skills: ['main'],
  compensation: ['main'],
  referral: ['main'],
  hiring_team: ['main'],
  pipeline: ['main'],
  interview: ['main'],
  evaluation: ['main'],
  posting: ['main'],
  automation: ['main'],
  analytics: ['main'],
  attachments: ['main'],
  permissions: ['main'],
  compliance: ['main'],
}

import type { Model3DName } from '../icons'

export type RouteMeta = {
  title: string
  subtitle: string
  icon: Model3DName
}

/** Matched against the full pathname; first match wins — order specific paths before their parents. */
const ROUTES: [RegExp, RouteMeta][] = [
  [/^\/account\/\d+\/jobs\/new\/?$/, { title: 'New job', subtitle: 'Draft a role and walk it through setup', icon: 'jobs' }],
  [/^\/account\/\d+\/jobs\/\d+\/edit/, { title: 'Edit job', subtitle: 'Update role details, team and pipeline', icon: 'jobs' }],
  [/^\/account\/\d+\/jobs\/all/, { title: 'Jobs', subtitle: 'Every open, draft and closed role in your workspace', icon: 'jobs' }],
  [/^\/account\/\d+\/jobs\/mine/, { title: 'My jobs', subtitle: 'Roles where you are on the hiring team', icon: 'jobs' }],
  [/^\/account\/\d+\/jobs\/role-kickoff/, { title: 'Role kickoff', subtitle: 'Align hiring managers before a req goes live', icon: 'kickoff' }],
  [/^\/account\/\d+\/structured-hiring\/attributes/, { title: 'Attributes', subtitle: 'The skills and traits every interview is scored on', icon: 'attributes' }],
  [/^\/account\/\d+\/structured-hiring\/stages/, { title: 'Stages', subtitle: 'Reusable interview stage templates', icon: 'stages' }],
  [/^\/account\/\d+\/hiring-plans/, { title: 'Hiring plans', subtitle: 'Headcount, budget and target dates by role', icon: 'plans' }],
  [/^\/account\/\d+\/pipeline/, { title: 'Pipeline', subtitle: 'Move candidates through every stage at a glance', icon: 'pipeline' }],
  [/^\/account\/\d+\/job-boards/, { title: 'Job boards', subtitle: 'Where your roles are published and how they perform', icon: 'boards' }],
  [/^\/account\/\d+\/postings/, { title: 'Postings', subtitle: 'Live and scheduled job postings', icon: 'postings' }],
  [/^\/account\/\d+\/job-applications\/\d+/, { title: 'Candidate', subtitle: 'Application, scorecards and activity', icon: 'profile' }],
  [/^\/account\/\d+\/job-applications/, { title: 'Applications', subtitle: 'Every application across all roles', icon: 'applications' }],
  [/^\/account\/\d+\/esign-documents/, { title: 'Signed documents', subtitle: 'Offer letters and agreements sent for signature', icon: 'signature' }],
  [/^\/account\/\d+\/candidates/, { title: 'Candidates', subtitle: 'Your talent pool across every role', icon: 'candidates' }],
  [/^\/account\/\d+\/interviews/, { title: 'Interviews', subtitle: 'Your interview assignments and feedback', icon: 'interviews' }],
  [/^\/account\/\d+\/referrals/, { title: 'Referrals', subtitle: 'Refer great people and track their progress', icon: 'referrals' }],
  [/^\/account\/\d+\/team/, { title: 'Team', subtitle: 'Members, roles and permissions', icon: 'team' }],
  [/^\/account\/\d+\/settings\/esign\/templates\/new/, { title: 'New template', subtitle: 'Design a reusable signing document', icon: 'esign' }],
  [/^\/account\/\d+\/settings\/esign\/templates\/\d+\/edit/, { title: 'Edit template', subtitle: 'Design a reusable signing document', icon: 'esign' }],
  [/^\/account\/\d+\/settings\/esign\/templates\/?$/, { title: 'Templates', subtitle: 'Reusable documents for e-signature', icon: 'esign' }],
  [/^\/account\/\d+\/settings\/esign\/rules/, { title: 'Automation', subtitle: 'Send documents automatically on stage changes', icon: 'esign' }],
  [/^\/account\/\d+\/settings\/esign\/advanced/, { title: 'E-sign advanced', subtitle: 'Signing defaults and delivery options', icon: 'esign' }],
  [/^\/account\/\d+\/settings\/esign/, { title: 'E-sign', subtitle: 'Templates, automation and signing settings', icon: 'esign' }],
  [/^\/account\/\d+\/settings\/general\/organization/, { title: 'Organization', subtitle: 'Company profile and defaults', icon: 'building' }],
  [/^\/account\/\d+\/settings\/general\/job-setup-flow/, { title: 'Job setup flow', subtitle: 'The steps recruiters follow when creating a job', icon: 'stages' }],
  [/^\/account\/\d+\/settings\/general\/departments/, { title: 'Departments', subtitle: 'Organize roles by team', icon: 'folder' }],
  [/^\/account\/\d+\/settings\/general\/job-locations/, { title: 'Job locations', subtitle: 'Offices and remote regions', icon: 'location' }],
  [/^\/account\/\d+\/settings\/general\/workspace/, { title: 'Workspace', subtitle: 'Workspace identity and preferences', icon: 'workspace' }],
  [/^\/account\/\d+\/settings\/general\/appearance/, { title: 'Typography', subtitle: 'Fonts, size and readability for everyone', icon: 'typography' }],
  [/^\/account\/\d+\/settings\/general\/referrals/, { title: 'Referral program', subtitle: 'Bonuses and rules for employee referrals', icon: 'referrals' }],
  [/^\/account\/\d+\/settings\/custom-fields\/candidates/, { title: 'Candidate fields', subtitle: 'Extra data captured on applications', icon: 'fields' }],
  [/^\/account\/\d+\/settings\/custom-fields\/jobs/, { title: 'Job fields', subtitle: 'Extra data captured on every job', icon: 'fields' }],
  [/^\/account\/\d+\/settings\/custom-fields/, { title: 'Custom fields', subtitle: 'Extend jobs and candidates with your own data', icon: 'fields' }],
  [/^\/account\/\d+\/settings\/labels/, { title: 'Labels', subtitle: 'Color-coded tags for jobs and candidates', icon: 'labels' }],
  [/^\/account\/\d+\/settings\/communication-channels/, { title: 'Communication', subtitle: 'Email and messaging channels', icon: 'mail' }],
  [/^\/account\/\d+\/settings\/audit-compliance\/delivery-failures/, { title: 'Delivery failures', subtitle: 'Audit events that could not be delivered', icon: 'audit' }],
  [/^\/account\/\d+\/settings\/audit-compliance\/audit-logs/, { title: 'Audit logs', subtitle: 'Who changed what, and when', icon: 'audit' }],
  [/^\/account\/\d+\/settings\/audit-compliance/, { title: 'Audit & compliance', subtitle: 'Activity trail and data governance', icon: 'audit' }],
  [/^\/account\/\d+\/settings/, { title: 'Settings', subtitle: 'Configure your workspace', icon: 'settings' }],
  [/^\/account\/\d+\/profile/, { title: 'Overview', subtitle: 'Your hiring at a glance', icon: 'dashboard' }],
]

const FALLBACK: RouteMeta = { title: 'Niyam', subtitle: '', icon: 'brand' }

export function routeMeta(pathname: string): RouteMeta {
  for (const [re, meta] of ROUTES) if (re.test(pathname)) return meta
  return FALLBACK
}

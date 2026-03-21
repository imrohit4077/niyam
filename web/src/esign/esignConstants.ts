export const ESIGN_STAGE_TYPES = ['applied', 'screening', 'interview', 'offer', 'hired', 'rejected', 'withdrawn'] as const

export const ESIGN_MERGE_CHIPS: { token: string; label: string }[] = [
  { token: '{candidate_name}', label: 'Name' },
  { token: '{candidate_email}', label: 'Email' },
  { token: '{job_title}', label: 'Job title' },
  { token: '{company_name}', label: 'Company' },
  { token: '{today}', label: 'Today’s date' },
  { token: '{salary_range}', label: 'Salary range' },
]

export const ESIGN_MERGE_MORE =
  '{department} · {location} · {requisition_id} · {hiring_plan_deadline} · {candidate_phone} · {candidate_location}'

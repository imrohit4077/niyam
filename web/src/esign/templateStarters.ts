import type { Model3DName } from '../icons'
import {
  createBlock,
  type ButtonBlock,
  type DividerBlock,
  type SectionBlock,
  type SpacerBlock,
  type TemplateBlock,
  type TemplateDocument,
  type TextBlock,
} from './templateDocument'

/** Starting points offered when creating a new e-sign template. */
export type TemplateStarter = {
  id: string
  name: string
  description: string
  icon: Model3DName
  build: () => TemplateDocument
}

function text(content: string, opts: Partial<Omit<TextBlock, 'id' | 'type'>> = {}): TextBlock {
  return { ...(createBlock('text') as TextBlock), content, ...opts }
}

function section(title: string, content: string, variant: SectionBlock['variant'] = 'card'): SectionBlock {
  return { ...(createBlock('section') as SectionBlock), title, content, variant }
}

function button(label: string): ButtonBlock {
  return { ...(createBlock('button') as ButtonBlock), label }
}

const divider = (style: DividerBlock['style'] = 'subtle'): DividerBlock => ({ ...(createBlock('divider') as DividerBlock), style })
const spacer = (height = 16): SpacerBlock => ({ ...(createBlock('spacer') as SpacerBlock), height })

const doc = (blocks: TemplateBlock[]): TemplateDocument => ({ version: 1, blocks })

export const TEMPLATE_STARTERS: TemplateStarter[] = [
  {
    id: 'blank',
    name: 'Blank document',
    description: 'Start from a single paragraph and build your own layout.',
    icon: 'applications',
    build: () => doc([text('Dear {candidate_name},')]),
  },
  {
    id: 'offer',
    name: 'Offer letter',
    description: 'Role, compensation, start date and signature acknowledgement.',
    icon: 'trophy',
    build: () =>
      doc([
        text('Offer of employment', { fontSize: 24, fontWeight: 'bold' }),
        text('{company_name} · {today}', { fontSize: 13, color: '#6c7491' }),
        divider(),
        text('Dear {candidate_name},'),
        text(
          'We are delighted to offer you the position of {job_title} in our {department} team. We were impressed by your experience and believe you will be a great addition.',
        ),
        section('Compensation', 'Annual base salary in the range of {salary_range} ({salary_currency}), paid in accordance with company payroll.'),
        section('Location', 'This role is based in {location}. Your requisition reference is {requisition_id}.', 'minimal'),
        text('Please review and sign this letter to confirm your acceptance.'),
        spacer(8),
        button('Accept offer'),
        spacer(8),
        text('Warm regards,\nThe {company_name} hiring team', { color: '#4e5572' }),
      ]),
  },
  {
    id: 'nda',
    name: 'Non-disclosure agreement',
    description: 'Mutual confidentiality terms before sharing sensitive material.',
    icon: 'lock',
    build: () =>
      doc([
        text('Mutual non-disclosure agreement', { fontSize: 22, fontWeight: 'bold' }),
        text('Between {company_name} and {candidate_name} · {today}', { fontSize: 13, color: '#6c7491' }),
        divider('solid'),
        section('1. Confidential information', 'Any non-public business, technical or financial information disclosed during the hiring process for {job_title}.', 'highlight'),
        section('2. Obligations', 'The receiving party will use confidential information only to evaluate the opportunity and will not disclose it to third parties.', 'highlight'),
        section('3. Term', 'These obligations remain in effect for two (2) years from the date of signature.', 'highlight'),
        spacer(),
        text('By signing below, both parties agree to the terms above.', { fontSize: 13, color: '#4e5572' }),
      ]),
  },
  {
    id: 'employment',
    name: 'Employment confirmation',
    description: 'Confirm employment details once a candidate is hired.',
    icon: 'audit',
    build: () =>
      doc([
        text('Letter of employment', { fontSize: 22, fontWeight: 'bold' }),
        text('{today}', { fontSize: 13, color: '#6c7491' }),
        divider(),
        text('To whom it may concern,'),
        text('This letter confirms that {candidate_name} has accepted the role of {job_title} with {company_name}, based in {location}.'),
        section('Employment details', 'Department: {department}\nReference: {requisition_id}', 'card'),
        text('Sincerely,\n{company_name}', { color: '#4e5572' }),
      ]),
  },
  {
    id: 'interview',
    name: 'Interview invitation',
    description: 'Invite a candidate to the next round with a confirmation button.',
    icon: 'interviews',
    build: () =>
      doc([
        text("You're invited to interview", { fontSize: 22, fontWeight: 'bold', align: 'center' }),
        text('{job_title} · {company_name}', { fontSize: 14, color: '#6c7491', align: 'center' }),
        spacer(8),
        text('Hi {candidate_name},'),
        text('Thanks for your interest in {job_title}. We would love to continue the conversation and invite you to the next interview round.'),
        section('What to expect', 'A 45-minute conversation with the hiring team focused on your experience and the role.', 'highlight'),
        button('Confirm attendance'),
      ]),
  },
]

/** Example values used by the preview mode so authors see the finished letter. */
export function sampleMergeData(companyName: string): Record<string, string> {
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const deadline = new Date()
  deadline.setDate(deadline.getDate() + 30)
  return {
    candidate_name: 'Alex Morgan',
    candidate_email: 'alex.morgan@example.com',
    candidate_phone: '+1 (555) 010-0420',
    candidate_location: 'Austin, TX',
    job_title: 'Senior Product Designer',
    company_name: companyName || 'Acme Corp',
    department: 'Design',
    location: 'Remote — United States',
    requisition_id: 'REQ-1042',
    hiring_plan_deadline: fmt(deadline),
    salary_range: '$120,000 – $140,000',
    salary_currency: 'USD',
    today: fmt(new Date()),
  }
}

/** ATS block template — canonical JSON stored in esign_templates.content_blocks */

export type BlockType = 'text' | 'image' | 'section' | 'button' | 'divider' | 'spacer'

export type TextFontWeight = 'normal' | 'medium' | 'semibold' | 'bold'

export type TextBlock = {
  id: string
  type: 'text'
  content: string
  fontSize: number
  color: string
  align: 'left' | 'center' | 'right'
  fontWeight: TextFontWeight
}

export type ImageBlock = {
  id: string
  type: 'image'
  src: string
  alt: string
  widthPct: number
}

export type SectionVariant = 'card' | 'minimal' | 'highlight'

export type SectionBlock = {
  id: string
  type: 'section'
  title: string
  content: string
  bodyFontSize: number
  bodyColor: string
  bodyAlign: 'left' | 'center' | 'right'
  variant: SectionVariant
}

export type ButtonBlock = {
  id: string
  type: 'button'
  label: string
  href: string
  align: 'left' | 'center' | 'right'
  bgColor: string
  textColor: string
  borderRadius: number
}

export type DividerStyle = 'solid' | 'dashed' | 'subtle'

export type DividerBlock = {
  id: string
  type: 'divider'
  style: DividerStyle
}

export type SpacerBlock = {
  id: string
  type: 'spacer'
  height: number
}

export type TemplateBlock = TextBlock | ImageBlock | SectionBlock | ButtonBlock | DividerBlock | SpacerBlock

export type TemplateDocument = { version: 1; blocks: TemplateBlock[] }

export function createBlock(type: BlockType): TemplateBlock {
  const id = crypto.randomUUID()
  switch (type) {
    case 'text':
      return {
        id,
        type: 'text',
        content: 'Dear {candidate_name},',
        fontSize: 15,
        color: '#111827',
        align: 'left',
        fontWeight: 'normal',
      }
    case 'image':
      return { id, type: 'image', src: '', alt: 'Company logo', widthPct: 40 }
    case 'section':
      return {
        id,
        type: 'section',
        title: 'Compensation',
        content: 'We are pleased to offer a package in the range of {salary_range} ({salary_currency}).',
        bodyFontSize: 14,
        bodyColor: '#374151',
        bodyAlign: 'left',
        variant: 'card',
      }
    case 'button':
      return {
        id,
        type: 'button',
        label: 'Acknowledge receipt',
        href: '#',
        align: 'center',
        bgColor: '#0284c7',
        textColor: '#ffffff',
        borderRadius: 8,
      }
    case 'divider':
      return { id, type: 'divider', style: 'solid' }
    case 'spacer':
      return { id, type: 'spacer', height: 24 }
  }
}

export function emptyDocument(): TemplateDocument {
  return { version: 1, blocks: [createBlock('text')] }
}

export function htmlToPlainText(html: string): string {
  const s = html || ''
  try {
    const doc = new DOMParser().parseFromString(s, 'text/html')
    const t = doc.body.textContent?.replace(/\s+/g, ' ').trim()
    return t || ''
  } catch {
    return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  }
}

/** Coerce blocks loaded from API that may omit newer optional fields */
export function hydrateDocument(doc: TemplateDocument): TemplateDocument {
  return {
    ...doc,
    blocks: doc.blocks.map(b => hydrateBlock(b)),
  }
}

function hydrateBlock(b: TemplateBlock): TemplateBlock {
  switch (b.type) {
    case 'text':
      return {
        ...b,
        fontWeight: b.fontWeight ?? 'normal',
      }
    case 'section':
      return {
        ...b,
        variant: b.variant ?? 'card',
      }
    case 'button':
      return {
        ...b,
        bgColor: b.bgColor ?? '#0284c7',
        textColor: b.textColor ?? '#ffffff',
        borderRadius: b.borderRadius ?? 8,
      }
    case 'divider':
      return { ...b, style: b.style ?? 'solid' }
    case 'spacer':
      return { ...b, height: typeof b.height === 'number' ? b.height : 24 }
    default:
      return b
  }
}

export function documentFromTemplateRow(contentBlocks: unknown, contentHtml: string): TemplateDocument {
  const cb = contentBlocks as TemplateDocument | null | undefined
  if (cb && cb.version === 1 && Array.isArray(cb.blocks) && cb.blocks.length > 0) {
    return hydrateDocument(JSON.parse(JSON.stringify(cb)) as TemplateDocument)
  }
  const plain = htmlToPlainText(contentHtml)
  const b = createBlock('text') as TextBlock
  b.content =
    plain ||
    'Start with blocks from the left. Use merge tags like {candidate_name} and {job_title}.'
  return { version: 1, blocks: [b] }
}

export function patchBlock(doc: TemplateDocument, id: string, partial: Partial<TemplateBlock>): TemplateDocument {
  return {
    ...doc,
    blocks: doc.blocks.map(b => (b.id === id ? ({ ...b, ...partial } as TemplateBlock) : b)),
  }
}

export function removeBlock(doc: TemplateDocument, id: string): TemplateDocument {
  return { ...doc, blocks: doc.blocks.filter(b => b.id !== id) }
}

export function duplicateBlock(doc: TemplateDocument, id: string): TemplateDocument {
  const idx = doc.blocks.findIndex(b => b.id === id)
  if (idx < 0) return doc
  const raw = doc.blocks[idx]
  const nb = JSON.parse(JSON.stringify(raw)) as TemplateBlock
  nb.id = crypto.randomUUID()
  const next = [...doc.blocks]
  next.splice(idx + 1, 0, nb)
  return { ...doc, blocks: next }
}

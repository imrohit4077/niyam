import { useCallback, useMemo, useState, type ReactNode } from 'react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDroppable,
  useDraggable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  type BlockType,
  type ButtonBlock,
  type SectionBlock,
  type TemplateBlock,
  type TemplateDocument,
  type TextBlock,
  createBlock,
  patchBlock,
  removeBlock,
} from '../esign/templateDocument'

const PALETTE: { type: BlockType; label: string; hint: string }[] = [
  { type: 'text', label: 'Text', hint: 'Paragraphs & merge tags' },
  { type: 'image', label: 'Image', hint: 'Logo or banner URL' },
  { type: 'section', label: 'Section', hint: 'Titled block (salary, terms)' },
  { type: 'button', label: 'Button', hint: 'Call-to-action link' },
]

function PaletteItem({ type, label }: { type: BlockType; label: string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${type}`,
    data: { source: 'palette' as const, blockType: type },
  })
  return (
    <button
      type="button"
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`esign-tpl-palette-item${isDragging ? ' is-dragging' : ''}`}
    >
      {label}
    </button>
  )
}

function CanvasDropZone({
  children,
  onBackgroundClick,
}: {
  children: ReactNode
  onBackgroundClick: () => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: 'canvas-root' })
  return (
    <div
      ref={setNodeRef}
      className={`esign-tpl-canvas-inner${isOver ? ' is-over' : ''}`}
      onClick={onBackgroundClick}
      role="presentation"
    >
      {children}
    </div>
  )
}

function SortableCanvasBlock({
  block,
  selected,
  onSelect,
}: {
  block: TemplateBlock
  selected: boolean
  onSelect: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`esign-tpl-block${selected ? ' is-selected' : ''}${isDragging ? ' is-dragging' : ''}`}
      onClick={e => {
        e.stopPropagation()
        onSelect()
      }}
      role="button"
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
    >
      <button
        type="button"
        className="esign-tpl-block-grip"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        ⋮⋮
      </button>
      <div className="esign-tpl-block-preview">{blockPreview(block)}</div>
    </div>
  )
}

function blockPreview(b: TemplateBlock): ReactNode {
  switch (b.type) {
    case 'text':
      return (
        <div
          className="esign-tpl-preview-text"
          style={{
            fontSize: Math.min(b.fontSize, 18),
            color: b.color,
            textAlign: b.align,
          }}
        >
          {b.content.slice(0, 220)}
          {b.content.length > 220 ? '…' : ''}
        </div>
      )
    case 'image':
      return b.src ? (
        <img className="esign-tpl-preview-img" src={b.src} alt={b.alt} />
      ) : (
        <span className="esign-tpl-preview-placeholder">Image — paste URL in settings →</span>
      )
    case 'section':
      return (
        <div className="esign-tpl-preview-section">
          {b.title && <strong>{b.title}</strong>}
          <div style={{ fontSize: Math.min(b.bodyFontSize, 15), color: b.bodyColor, textAlign: b.bodyAlign }}>
            {b.content.slice(0, 160)}
            {b.content.length > 160 ? '…' : ''}
          </div>
        </div>
      )
    case 'button':
      return (
        <div style={{ textAlign: b.align }}>
          <span className="esign-tpl-preview-btn">{b.label}</span>
        </div>
      )
    default:
      return null
  }
}

function BlockInspector({
  block,
  onPatch,
  mergeChips,
  onCopyToken,
  morePlaceholders,
}: {
  block: TemplateBlock
  onPatch: (p: Partial<TemplateBlock>) => void
  mergeChips: { token: string; label: string }[]
  onCopyToken: (t: string) => void
  morePlaceholders: string
}) {
  return (
    <div className="esign-tpl-inspector">
      <p className="esign-tpl-inspector-type">{block.type}</p>
      {block.type === 'text' && (
        <>
          <label className="esign-tpl-inspector-label">Content</label>
          <textarea
            className="esign-tpl-inspector-textarea"
            rows={8}
            value={block.content}
            onChange={e => onPatch({ content: e.target.value })}
          />
          <label className="esign-tpl-inspector-label">Font size</label>
          <input
            type="number"
            min={10}
            max={36}
            className="esign-tpl-inspector-input"
            value={block.fontSize}
            onChange={e => onPatch({ fontSize: Number(e.target.value) || 15 })}
          />
          <label className="esign-tpl-inspector-label">Color</label>
          <input
            type="color"
            className="esign-tpl-inspector-color"
            value={block.color.length === 7 ? block.color : '#111827'}
            onChange={e => onPatch({ color: e.target.value })}
          />
          <label className="esign-tpl-inspector-label">Alignment</label>
          <select
            className="esign-tpl-inspector-select"
            value={block.align}
            onChange={e => onPatch({ align: e.target.value as TextBlock['align'] })}
          >
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </>
      )}
      {block.type === 'image' && (
        <>
          <label className="esign-tpl-inspector-label">Image URL</label>
          <input
            className="esign-tpl-inspector-input"
            value={block.src}
            onChange={e => onPatch({ src: e.target.value })}
            placeholder="https://…"
          />
          <label className="esign-tpl-inspector-label">Alt text</label>
          <input
            className="esign-tpl-inspector-input"
            value={block.alt}
            onChange={e => onPatch({ alt: e.target.value })}
          />
          <label className="esign-tpl-inspector-label">Width %</label>
          <input
            type="number"
            min={20}
            max={100}
            className="esign-tpl-inspector-input"
            value={block.widthPct}
            onChange={e => onPatch({ widthPct: Number(e.target.value) || 100 })}
          />
        </>
      )}
      {block.type === 'section' && (
        <>
          <label className="esign-tpl-inspector-label">Section title</label>
          <input
            className="esign-tpl-inspector-input"
            value={block.title}
            onChange={e => onPatch({ title: e.target.value })}
          />
          <label className="esign-tpl-inspector-label">Body</label>
          <textarea
            className="esign-tpl-inspector-textarea"
            rows={6}
            value={block.content}
            onChange={e => onPatch({ content: e.target.value })}
          />
          <label className="esign-tpl-inspector-label">Body font size</label>
          <input
            type="number"
            min={10}
            max={22}
            className="esign-tpl-inspector-input"
            value={block.bodyFontSize}
            onChange={e => onPatch({ bodyFontSize: Number(e.target.value) || 14 })}
          />
          <label className="esign-tpl-inspector-label">Body color</label>
          <input
            type="color"
            className="esign-tpl-inspector-color"
            value={block.bodyColor.length === 7 ? block.bodyColor : '#374151'}
            onChange={e => onPatch({ bodyColor: e.target.value })}
          />
          <label className="esign-tpl-inspector-label">Body alignment</label>
          <select
            className="esign-tpl-inspector-select"
            value={block.bodyAlign}
            onChange={e => onPatch({ bodyAlign: e.target.value as SectionBlock['bodyAlign'] })}
          >
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </>
      )}
      {block.type === 'button' && (
        <>
          <label className="esign-tpl-inspector-label">Label</label>
          <input
            className="esign-tpl-inspector-input"
            value={block.label}
            onChange={e => onPatch({ label: e.target.value })}
          />
          <label className="esign-tpl-inspector-label">Link (https…)</label>
          <input
            className="esign-tpl-inspector-input"
            value={block.href}
            onChange={e => onPatch({ href: e.target.value })}
            placeholder="#"
          />
          <label className="esign-tpl-inspector-label">Alignment</label>
          <select
            className="esign-tpl-inspector-select"
            value={block.align}
            onChange={e => onPatch({ align: e.target.value as ButtonBlock['align'] })}
          >
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </>
      )}
      <div className="esign-tpl-inspector-chips">
        <span className="esign-tpl-inspector-chips-label">Merge tags</span>
        <div className="esign-chips">
          {mergeChips.map(c => (
            <button key={c.token} type="button" className="esign-chip" onClick={() => onCopyToken(c.token)}>
              {c.label}
            </button>
          ))}
        </div>
        <p className="esign-more-fields-text" style={{ marginTop: 8 }}>
          {morePlaceholders}
        </p>
      </div>
    </div>
  )
}

export type EsignTemplateBuilderProps = {
  document: TemplateDocument
  onDocumentChange: (d: TemplateDocument) => void
  selectedId: string | null
  onSelectId: (id: string | null) => void
  mergeChips: { token: string; label: string }[]
  onCopyToken: (t: string) => void
  morePlaceholders: string
}

export function EsignTemplateBuilder({
  document: doc,
  onDocumentChange,
  selectedId,
  onSelectId,
  mergeChips,
  onCopyToken,
  morePlaceholders,
}: EsignTemplateBuilderProps) {
  const [overlayPalette, setOverlayPalette] = useState<BlockType | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  )

  const ids = useMemo(() => doc.blocks.map(b => b.id), [doc.blocks])

  const selected = useMemo(
    () => doc.blocks.find(b => b.id === selectedId) ?? null,
    [doc, selectedId],
  )

  const onDragStart = useCallback((e: DragStartEvent) => {
    const id = String(e.active.id)
    if (id.startsWith('palette-')) {
      const t = e.active.data.current?.blockType as BlockType | undefined
      if (t) setOverlayPalette(t)
    }
  }, [])

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      setOverlayPalette(null)
      const { active, over } = event
      if (!over) return
      const aid = String(active.id)

      if (aid.startsWith('palette-')) {
        const type = active.data.current?.blockType as BlockType | undefined
        if (!type) return
        const nb = createBlock(type)
        const overId = String(over.id)
        if (overId === 'canvas-root') {
          onDocumentChange({ ...doc, blocks: [...doc.blocks, nb] })
          onSelectId(nb.id)
          return
        }
        const idx = doc.blocks.findIndex(b => b.id === overId)
        if (idx >= 0) {
          const next = [...doc.blocks]
          next.splice(idx, 0, nb)
          onDocumentChange({ ...doc, blocks: next })
          onSelectId(nb.id)
        }
        return
      }

      if (active.id !== over.id) {
        const oldIndex = doc.blocks.findIndex(b => b.id === active.id)
        const newIndex = doc.blocks.findIndex(b => b.id === over.id)
        if (oldIndex < 0 || newIndex < 0) return
        onDocumentChange({ ...doc, blocks: arrayMove(doc.blocks, oldIndex, newIndex) })
      }
    },
    [doc, onDocumentChange, onSelectId],
  )

  const patch = useCallback(
    (id: string, partial: Partial<TemplateBlock>) => {
      onDocumentChange(patchBlock(doc, id, partial))
    },
    [doc, onDocumentChange],
  )

  const del = useCallback(
    (id: string) => {
      onDocumentChange(removeBlock(doc, id))
      if (selectedId === id) onSelectId(null)
    },
    [doc, onDocumentChange, onSelectId, selectedId],
  )

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="esign-tpl-builder">
        <aside className="esign-tpl-panel esign-tpl-panel--left">
          <h4 className="esign-tpl-panel-title">Blocks</h4>
          <p className="esign-tpl-panel-hint">Drag onto the canvas</p>
          <div className="esign-tpl-palette">
            {PALETTE.map(p => (
              <div key={p.type} className="esign-tpl-palette-row">
                <PaletteItem type={p.type} label={p.label} />
                <span className="esign-tpl-palette-hint">{p.hint}</span>
              </div>
            ))}
          </div>
        </aside>

        <div className="esign-tpl-panel esign-tpl-panel--center">
          <div className="esign-tpl-canvas-head">
            <h4 className="esign-tpl-panel-title">Canvas</h4>
            {selectedId && (
              <button type="button" className="esign-tpl-remove-btn" onClick={() => del(selectedId)}>
                Remove block
              </button>
            )}
          </div>
          <CanvasDropZone onBackgroundClick={() => onSelectId(null)}>
            <SortableContext items={ids} strategy={verticalListSortingStrategy}>
              {doc.blocks.length === 0 ? (
                <p className="esign-tpl-empty-canvas">Drag blocks here to build your document.</p>
              ) : (
                doc.blocks.map(b => (
                  <SortableCanvasBlock
                    key={b.id}
                    block={b}
                    selected={b.id === selectedId}
                    onSelect={() => onSelectId(b.id)}
                  />
                ))
              )}
            </SortableContext>
          </CanvasDropZone>
        </div>

        <aside className="esign-tpl-panel esign-tpl-panel--right">
          <h4 className="esign-tpl-panel-title">Settings</h4>
          {selected ? (
            <BlockInspector
              block={selected}
              onPatch={p => patch(selected.id, p)}
              mergeChips={mergeChips}
              onCopyToken={onCopyToken}
              morePlaceholders={morePlaceholders}
            />
          ) : (
            <p className="esign-tpl-inspector-empty">Select a block on the canvas to edit text, colors, and links.</p>
          )}
        </aside>
      </div>

      <DragOverlay dropAnimation={null}>
        {overlayPalette ? (
          <div className="esign-tpl-overlay">{PALETTE.find(p => p.type === overlayPalette)?.label}</div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

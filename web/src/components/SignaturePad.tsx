import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react'

export type SignaturePadHandle = {
  isEmpty: () => boolean
  clear: () => void
  toDataURL: () => string
}

type Props = {
  className?: string
  /** Logical CSS height in px (width is 100% of container) */
  height?: number
}

export const SignaturePad = forwardRef<SignaturePadHandle, Props>(function SignaturePad(
  { className = '', height = 160 },
  ref,
) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const last = useRef<{ x: number; y: number } | null>(null)

  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return
    const dpr = window.devicePixelRatio || 1
    const w = wrap.clientWidth
    const h = height
    canvas.width = Math.max(1, Math.floor(w * dpr))
    canvas.height = Math.max(1, Math.floor(h * dpr))
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.scale(dpr, dpr)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, w, h)
    ctx.strokeStyle = '#0f1923'
    ctx.lineWidth = 2.25
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [height])

  useEffect(() => {
    setupCanvas()
    const ro = new ResizeObserver(() => setupCanvas())
    if (wrapRef.current) ro.observe(wrapRef.current)
    return () => ro.disconnect()
  }, [setupCanvas])

  const pos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const r = canvas.getBoundingClientRect()
    if ('touches' in e && e.touches[0]) {
      return { x: e.touches[0].clientX - r.left, y: e.touches[0].clientY - r.top }
    }
    const me = e as React.MouseEvent
    return { x: me.clientX - r.left, y: me.clientY - r.top }
  }

  const start = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    drawing.current = true
    last.current = pos(e)
  }

  const move = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing.current) return
    e.preventDefault()
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || !last.current) return
    const p = pos(e)
    const dpr = window.devicePixelRatio || 1
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.strokeStyle = '#0f1923'
    ctx.lineWidth = 2.25
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(last.current.x, last.current.y)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
    last.current = p
  }

  const end = () => {
    drawing.current = false
    last.current = null
  }

  useImperativeHandle(ref, () => ({
    isEmpty: () => {
      const canvas = canvasRef.current
      if (!canvas) return true
      const ctx = canvas.getContext('2d')
      if (!ctx) return true
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]
        if (r < 248 || g < 248 || b < 248) return false
      }
      return true
    },
    clear: () => {
      setupCanvas()
    },
    toDataURL: () => canvasRef.current?.toDataURL('image/png') ?? '',
  }))

  return (
    <div ref={wrapRef} className={`signature-pad-wrap ${className}`.trim()}>
      <canvas
        ref={canvasRef}
        className="signature-pad-canvas"
        role="img"
        aria-label="Draw your signature"
        onMouseDown={start}
        onMouseMove={move}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={start}
        onTouchMove={move}
        onTouchEnd={end}
      />
    </div>
  )
})

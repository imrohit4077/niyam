import { useEffect, useState, type CSSProperties } from 'react'
import Icon from './Icon'
import { MODEL_META, type Model3DName } from './three/meta'
import { peekIcon } from './three/cache'

type Props = {
  name: Model3DName
  /** Rendered box size in CSS px. */
  size?: number
  /** Sit the model on a soft tinted tile (good for headers, KPI cards, settings tiles). */
  tile?: boolean
  className?: string
  title?: string
}

/**
 * Glossy 3D icon. The model is rendered once by the shared offscreen renderer
 * (lazy-loaded with three.js) and cached; until then — or if WebGL is
 * unavailable — a tinted tile with the matching line glyph is shown.
 */
export default function Icon3D({ name, size = 40, tile = false, className, title }: Props) {
  const [loaded, setLoaded] = useState<{ name: Model3DName; url: string } | null>(null)
  const url = loaded?.name === name ? loaded.url : peekIcon(name)

  useEffect(() => {
    if (url) return
    let alive = true
    import('./three/snapshot')
      .then(m => m.renderIcon(name))
      .then(rendered => {
        if (alive) setLoaded({ name, url: rendered })
      })
      .catch(() => {
        /* no WebGL — keep the glyph fallback */
      })
    return () => {
      alive = false
    }
  }, [name, url])

  const style = { '--nx3d-size': `${size}px`, '--nx3d-tint': MODEL_META[name].tint } as CSSProperties
  const cls = ['nx-3d', tile ? 'nx-3d--tile' : '', url ? 'nx-3d--ready' : '', className ?? ''].filter(Boolean).join(' ')

  return (
    <span className={cls} style={style} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      {url ? (
        <img className="nx-3d-img" src={url} alt="" draggable={false} decoding="async" />
      ) : (
        <span className="nx-3d-fallback">
          <Icon name={name} size={Math.round(size * (tile ? 0.46 : 0.6))} strokeWidth={1.9} />
        </span>
      )}
    </span>
  )
}

import { Component, lazy, Suspense, useState, type ReactNode } from 'react'
import Icon3D from './Icon3D'
import type { HeroSatellite } from './three/HeroScene'
import type { Model3DName } from './three/meta'

const HeroScene = lazy(() => import('./three/HeroScene'))

type Props = {
  center?: Model3DName
  centerScale?: number
  satellites?: HeroSatellite[]
  parallax?: number
  calm?: boolean
  className?: string
  /** Size of the static poster shown until the live scene is ready. */
  posterSize?: number
}

/** If WebGL can't start, quietly keep the static poster. */
class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

/**
 * Lazy-loaded live 3D hero. A cached still of the centre model shows instantly;
 * the live canvas cross-fades in after its first rendered frame, so the area
 * never sits empty or pops. The three.js bundle only downloads where this is used.
 */
export default function Hero3D({ className, posterSize = 128, ...sceneProps }: Props) {
  const [ready, setReady] = useState(false)
  return (
    <div className={`nx-hero-wrap${ready ? ' is-ready' : ''}${className ? ` ${className}` : ''}`}>
      <div className="nx-hero-poster" aria-hidden>
        <Icon3D name={sceneProps.center ?? 'brand'} size={posterSize} />
      </div>
      <SceneBoundary>
        <Suspense fallback={null}>
          <HeroScene {...sceneProps} onReady={() => setReady(true)} />
        </Suspense>
      </SceneBoundary>
    </div>
  )
}

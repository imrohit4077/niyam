import { Component, lazy, Suspense, type ReactNode } from 'react'
import Icon3D from './Icon3D'
import type { HeroSatellite } from './three/HeroScene'
import type { Model3DName } from './three/meta'

const HeroScene = lazy(() => import('./three/HeroScene'))

type Props = {
  center?: Model3DName
  centerScale?: number
  satellites?: HeroSatellite[]
  parallax?: number
  className?: string
}

/** If WebGL can't start, quietly fall back to the static icon. */
class SceneBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

/** Lazy-loaded live 3D hero; the three.js bundle only downloads where this is used. */
export default function Hero3D(props: Props) {
  const fallback = (
    <div className={props.className ? `nx-hero-scene nx-hero-scene--static ${props.className}` : 'nx-hero-scene nx-hero-scene--static'}>
      <Icon3D name={props.center ?? 'brand'} size={140} />
    </div>
  )
  return (
    <SceneBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <HeroScene {...props} />
      </Suspense>
    </SceneBoundary>
  )
}

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, Float } from '@react-three/drei'
import type { Group } from 'three'
import { buildFramedModel, disposeModel } from './models'
import { addStudioLighting, STUDIO_EXPOSURE, STUDIO_TONE_MAPPING } from './studio'
import type { Model3DName } from './meta'

/**
 * `position` x/y are viewport-relative (-1…1, inset so the model stays fully in
 * frame at any canvas aspect); z is world depth.
 */
export type HeroSatellite = { name: Model3DName; position: [number, number, number]; scale?: number }

type Props = {
  /** Centre model — the brand mark by default. */
  center?: Model3DName
  centerScale?: number
  satellites?: HeroSatellite[]
  /** How strongly the scene leans toward the pointer (0 disables). */
  parallax?: number
  className?: string
}

function Studio() {
  const scene = useThree(s => s.scene)
  const gl = useThree(s => s.gl)
  useEffect(() => addStudioLighting(scene, gl), [scene, gl])
  return null
}

function Model({ name, scale = 1, position = [0, 0, 0] }: { name: Model3DName; scale?: number; position?: [number, number, number] }) {
  const obj = useMemo(() => buildFramedModel(name), [name])
  useEffect(() => () => disposeModel(obj), [obj])
  // Wrap so the caller's scale composes with (not replaces) the model's normalising scale.
  return (
    <group scale={scale} position={position}>
      <primitive object={obj} />
    </group>
  )
}

function Satellite({ sat, index, speed }: { sat: HeroSatellite; index: number; speed: number }) {
  const viewport = useThree(s => s.viewport)
  const scale = sat.scale ?? 0.45
  const [nx, ny, z] = sat.position
  const halfW = Math.max(viewport.width / 2 - scale * 1.25, 0)
  const halfH = Math.max(viewport.height / 2 - scale * 1.25, 0)
  return (
    <Float speed={(1.8 + (index % 3) * 0.45) * speed} rotationIntensity={0.8 * speed} floatIntensity={1.1 * speed}>
      <Model name={sat.name} scale={scale} position={[nx * halfW, ny * halfH, z]} />
    </Float>
  )
}

function Rig({ parallax, children }: { parallax: number; children: ReactNode }) {
  const ref = useRef<Group>(null)
  useFrame(state => {
    const g = ref.current
    if (!g || parallax === 0) return
    g.rotation.y += (state.pointer.x * 0.45 * parallax - g.rotation.y) * 0.06
    g.rotation.x += (-state.pointer.y * 0.25 * parallax - g.rotation.x) * 0.06
  })
  return <group ref={ref}>{children}</group>
}

function usePrefersReducedMotion() {
  const [reduced] = useState(() => {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    } catch {
      return false
    }
  })
  return reduced
}

/**
 * Live, softly floating 3D composition (brand mark + orbiting ATS objects).
 * Renders only while on screen, and holds still for reduced-motion users.
 */
export default function HeroScene({ center = 'brand', centerScale = 1.25, satellites = [], parallax = 1, className }: Props) {
  const wrap = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(true)
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    const el = wrap.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.01 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const speed = reduced ? 0 : 1

  return (
    <div ref={wrap} className={className ? `nx-hero-scene ${className}` : 'nx-hero-scene'} aria-hidden>
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0, 7], fov: 30 }}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ gl }) => {
          gl.toneMapping = STUDIO_TONE_MAPPING
          gl.toneMappingExposure = STUDIO_EXPOSURE
        }}
        frameloop={reduced ? 'demand' : visible ? 'always' : 'never'}
      >
        <Studio />
        <Rig parallax={reduced ? 0 : parallax}>
          <Float speed={1.4 * speed} rotationIntensity={0.35 * speed} floatIntensity={0.6 * speed}>
            <Model name={center} scale={centerScale} />
          </Float>
          {satellites.map((s, i) => (
            <Satellite key={`${s.name}-${i}`} sat={s} index={i} speed={speed} />
          ))}
        </Rig>
        <ContactShadows position={[0, -1.75, 0]} opacity={0.28} scale={9} blur={2.6} far={3.5} frames={1} color="#1d2150" />
      </Canvas>
    </div>
  )
}

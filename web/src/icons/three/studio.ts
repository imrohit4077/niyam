import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

/** Neutral (Khronos PBR) keeps brand hues saturated where ACES washes them out. */
export const STUDIO_TONE_MAPPING = THREE.NeutralToneMapping
export const STUDIO_EXPOSURE = 1.0

/**
 * Shared studio lighting for snapshots and live scenes: a procedural room
 * environment for clearcoat reflections (no HDR download) plus key/rim/fill
 * lights. Returns a cleanup that removes everything it added.
 */
export function addStudioLighting(scene: THREE.Scene, renderer: THREE.WebGLRenderer): () => void {
  const pmrem = new THREE.PMREMGenerator(renderer)
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  pmrem.dispose()
  scene.environment = env
  scene.environmentIntensity = 0.62

  const key = new THREE.DirectionalLight('#ffffff', 1.9)
  key.position.set(2.5, 4, 5)
  const rim = new THREE.DirectionalLight('#9fb4ff', 0.9)
  rim.position.set(-4, 2, -3)
  const fill = new THREE.HemisphereLight('#ffffff', '#b9c3f2', 0.45)
  scene.add(key, rim, fill)

  return () => {
    scene.remove(key, rim, fill)
    if (scene.environment === env) scene.environment = null
    env.dispose()
  }
}

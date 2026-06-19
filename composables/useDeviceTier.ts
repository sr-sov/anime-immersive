/**
 * Device capability tiering for the immersive layer.
 *
 * A WebGL canvas painting under live DOM text is one of the most perf-hostile
 * combinations on the web, so the gallery is NOT a binary WebGL/no-WebGL toggle.
 * `canvasSuitability()` inspects the actual device — WebGL availability, the GPU
 * renderer string against a known low-end/software set, the device-pixel-ratio
 * times the logical area (the real fragment-shading load), memory and core
 * hints — and returns one of three tiers:
 *
 *   'gl'     — render the OGL displacement/chromatic shader (the signature).
 *   'parallax' — DOM-only GSAP crossfade + drift. No canvas, no shader. The
 *                full editorial composition, just composited on the GPU cheaply.
 *   'static' — no motion at all (reduced-motion or a genuinely weak device):
 *              the legible card stack.
 *
 * This runs ONLY on the client, after mount, so it never touches the server
 * render. It is intentionally conservative: when in doubt it demotes, because a
 * smooth DOM parallax beats a janky shader every time.
 */

export type DeviceTier = 'gl' | 'parallax' | 'static'

// Renderer-string fragments that signal a software rasteriser or a low-end GPU
// where a full-screen fragment shader under text will not hold 60fps.
const WEAK_RENDERERS = [
  'swiftshader',
  'software',
  'llvmpipe',
  'microsoft basic render',
  'mesa offscreen',
  'apple gpu (low',
  'powervr sgx',
  'adreno (tm) 3', // Adreno 3xx — old Android
  'adreno (tm) 4', // Adreno 4xx — older mid Android
  'mali-4',
  'mali-t6',
  'mali-t7',
]

function readWebGL(): { ok: boolean; renderer: string } {
  try {
    const c = document.createElement('canvas')
    const gl = (c.getContext('webgl') ||
      c.getContext('experimental-webgl')) as WebGLRenderingContext | null
    if (!gl) return { ok: false, renderer: '' }
    const dbg = gl.getExtension('WEBGL_debug_renderer_info')
    const renderer = dbg
      ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '')
      : String(gl.getParameter(gl.RENDERER) || '')
    // Free the probe context so we don't leak a GL context.
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    return { ok: true, renderer: renderer.toLowerCase() }
  } catch {
    return { ok: false, renderer: '' }
  }
}

/**
 * Decide the immersive tier for THIS device. Must run client-side only.
 * `reduced` short-circuits to 'static' (reduced-motion is a first-class path).
 */
export function canvasSuitability(reduced: boolean): DeviceTier {
  if (reduced) return 'static'
  if (typeof window === 'undefined') return 'static'

  const { ok, renderer } = readWebGL()

  // No WebGL at all → DOM parallax (still cinematic), not a dead static page.
  if (!ok) return 'parallax'

  // Known-weak GPU / software rasteriser → DOM parallax.
  if (renderer && WEAK_RENDERERS.some((w) => renderer.includes(w))) {
    return 'parallax'
  }

  // Hardware hints: very low memory or core count → demote.
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
  if (typeof mem === 'number' && mem > 0 && mem <= 2) return 'parallax'
  const cores = navigator.hardwareConcurrency
  if (typeof cores === 'number' && cores > 0 && cores <= 2) return 'parallax'

  // Fragment-shading load: a full-screen shader at high DPR on a large viewport
  // shades millions of pixels per frame. Cap the effective pixel budget; over
  // it (e.g. a 3x-DPR phone, or a huge 2x display) we keep the canvas but the
  // renderer already caps DPR at 2 — so this only demotes the genuinely heavy
  // combination of small-but-very-dense screens where a shader stutters.
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const logicalArea = window.innerWidth * window.innerHeight
  // A small, very dense touch screen (phone) with a software-ish profile: prefer
  // parallax. Coarse pointer + high raw DPR is the tell.
  const rawDpr = window.devicePixelRatio || 1
  const coarse = window.matchMedia?.('(pointer: coarse)')?.matches
  if (coarse && rawDpr >= 2.5) return 'parallax'

  // Guard against a pathological huge canvas (very large 2x monitor) where the
  // shader cost outruns the GPU budget — rare, but demote to be safe.
  if (dpr * logicalArea > 6_000_000) return 'parallax'

  return 'gl'
}

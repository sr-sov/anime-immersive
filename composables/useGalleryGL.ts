import { Mesh, Plane, Program, Renderer, Texture, Vec2 } from 'ogl'
import { clamp, lerp } from '~/utils/motion'

/**
 * A lightweight WebGL crossfade gallery (OGL).
 *
 * A single full-bleed plane samples two cover textures and blends between them
 * with a displacement + chromatic-aberration shader. `setProgress(i, frac)`
 * drives which pair is shown and how far the transition has run; an internal
 * eased follower keeps the blend buttery even when scroll jumps. The plane is
 * cover-fit (object-fit: cover) per-texture via an aspect uniform.
 *
 * This is the atmospheric layer only — all readable content lives in the DOM
 * on top. If WebGL is unavailable the caller renders a CSS crossfade instead,
 * so nothing here is load-bearing for comprehension or a11y.
 */

export interface GalleryGL {
  setProgress: (index: number, frac: number) => void
  setHover: (amount: number) => void
  setMouse: (x: number, y: number) => void
  resize: () => void
  render: () => void
  destroy: () => void
  ready: Promise<void>
}

const VERT = /* glsl */ `
  attribute vec2 uv;
  attribute vec3 position;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`

// Displacement-driven crossfade with a subtle RGB split that peaks mid-transition.
const FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uFrom;
  uniform sampler2D uTo;
  uniform float uProgress;     // 0..1 within the current transition
  uniform float uHover;        // 0..1 pointer presence -> aberration boost
  uniform vec2  uFromSize;     // texture aspect handling
  uniform vec2  uToSize;
  uniform vec2  uRes;          // canvas resolution
  uniform vec2  uMouse;        // normalized mouse (0..1)

  // object-fit: cover UVs for a texture of size texRes in a viewport uRes.
  vec2 coverUV(vec2 uv, vec2 texRes) {
    float rA = uRes.x / uRes.y;
    float rT = texRes.x / texRes.y;
    vec2 scale = (rA > rT) ? vec2(1.0, rT / rA) : vec2(rA / rT, 1.0);
    return (uv - 0.5) * scale + 0.5;
  }

  void main() {
    // Smooth, eased transition curve.
    float p = smoothstep(0.0, 1.0, uProgress);

    // A radial displacement that pushes outgoing out and incoming in.
    vec2 dir = vUv - uMouse;
    float dist = length(dir);
    float disp = (0.06 + uHover * 0.05) * (1.0 - p) * p * 4.0;

    vec2 uvFrom = coverUV(vUv + dir * disp, uFromSize);
    vec2 uvTo   = coverUV(vUv - dir * disp, uToSize);

    // Chromatic aberration, strongest at the midpoint of the transition.
    float ca = (0.004 + uHover * 0.006) * (p * (1.0 - p) * 4.0);
    vec3 from;
    from.r = texture2D(uFrom, uvFrom + vec2(ca, 0.0)).r;
    from.g = texture2D(uFrom, uvFrom).g;
    from.b = texture2D(uFrom, uvFrom - vec2(ca, 0.0)).b;
    vec3 to;
    to.r = texture2D(uTo, uvTo + vec2(ca, 0.0)).r;
    to.g = texture2D(uTo, uvTo).g;
    to.b = texture2D(uTo, uvTo - vec2(ca, 0.0)).b;

    vec3 color = mix(from, to, p);

    // ---- The real duotone -------------------------------------------------
    // The brand is a magenta-rose / cyan duotone, so the SHADER carries it: the
    // outgoing frame is graded toward rose, the incoming toward cyan (ice), and
    // the split peaks mid-transition where the two hues cross. Luminance drives
    // the mix so shadows stay in the void while highlights pick up the accent —
    // a genuine duotone wash, not a flat tint.
    vec3 rose = vec3(1.000, 0.302, 0.553); // #ff4d8d
    vec3 ice  = vec3(0.247, 0.878, 0.878); // #3fe0e0
    float lum = dot(color, vec3(0.299, 0.587, 0.114));
    vec3 duo = mix(rose, ice, p);                 // rose -> cyan across the cut
    float split = p * (1.0 - p) * 4.0;            // 0 at ends, 1 at the midpoint
    float wash = (0.12 + uHover * 0.10) * split;  // accent strongest mid-cross
    color = mix(color, color * (0.6 + 0.8 * lum) + duo * lum * 0.6, wash);

    // Cinematic grade: lift shadows toward the void, gentle vignette.
    float vig = smoothstep(1.15, 0.35, dist);
    color *= mix(0.82, 1.0, vig);
    color = mix(vec3(0.055, 0.039, 0.063), color, 0.92); // toward #0e0a10

    gl_FragColor = vec4(color, 1.0);
  }
`

export function createGalleryGL(
  canvas: HTMLCanvasElement,
  urls: string[],
): GalleryGL {
  const renderer = new Renderer({
    canvas,
    dpr: Math.min(window.devicePixelRatio || 1, 2),
    alpha: false,
    antialias: false,
  })
  const gl = renderer.gl
  gl.clearColor(0.055, 0.039, 0.063, 1)

  const textures: Texture[] = urls.map(() => {
    const t = new Texture(gl)
    return t
  })
  const sizes: Vec2[] = urls.map(() => new Vec2(1, 1))

  // Load each image; first-paint uses a flat fill until ready.
  const loaded: Promise<void>[] = urls.map(
    (url, i) =>
      new Promise<void>((resolve) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
          textures[i].image = img
          sizes[i].set(img.naturalWidth, img.naturalHeight)
          resolve()
        }
        img.onerror = () => resolve() // keep the gallery alive on a bad cover
        img.src = url
      }),
  )

  const program = new Program(gl, {
    vertex: VERT,
    fragment: FRAG,
    uniforms: {
      uFrom: { value: textures[0] },
      uTo: { value: textures[Math.min(1, textures.length - 1)] },
      uProgress: { value: 0 },
      uHover: { value: 0 },
      uFromSize: { value: sizes[0] },
      uToSize: { value: sizes[Math.min(1, sizes.length - 1)] },
      uRes: { value: new Vec2(1, 1) },
      uMouse: { value: new Vec2(0.5, 0.5) },
    },
  })

  const mesh = new Mesh(gl, { geometry: new Plane(gl), program })

  // Eased followers so a scroll jump doesn't snap the blend.
  let targetIndex = 0
  let targetFrac = 0
  let curIndex = 0
  let curFrac = 0
  let hoverTarget = 0
  let hover = 0
  const mouseTarget = new Vec2(0.5, 0.5)

  function resize() {
    const w = canvas.clientWidth || window.innerWidth
    const h = canvas.clientHeight || window.innerHeight
    renderer.setSize(w, h)
    program.uniforms.uRes.value.set(
      gl.canvas.width,
      gl.canvas.height,
    )
  }

  function setProgress(index: number, frac: number) {
    targetIndex = clamp(index, 0, textures.length - 1)
    targetFrac = clamp(frac, 0, 1)
  }
  function setHover(amount: number) {
    hoverTarget = clamp(amount, 0, 1)
  }
  function setMouse(x: number, y: number) {
    mouseTarget.set(clamp(x, 0, 1), clamp(y, 0, 1))
  }

  function render() {
    // Ease scalar followers toward target (cheap, frame-count tolerant).
    curFrac = lerp(curFrac, targetFrac, 0.12)
    if (targetIndex !== curIndex && Math.abs(curFrac - targetFrac) < 0.01) {
      curIndex = targetIndex
    } else if (targetIndex !== curIndex) {
      curIndex = targetIndex
    }
    hover = lerp(hover, hoverTarget, 0.08)

    const i = clamp(curIndex, 0, textures.length - 1)
    const next = clamp(i + 1, 0, textures.length - 1)
    program.uniforms.uFrom.value = textures[i]
    program.uniforms.uTo.value = textures[next]
    program.uniforms.uFromSize.value = sizes[i]
    program.uniforms.uToSize.value = sizes[next]
    program.uniforms.uProgress.value = curFrac
    program.uniforms.uHover.value = hover

    const mu = program.uniforms.uMouse.value as Vec2
    mu.set(lerp(mu.x, mouseTarget.x, 0.06), lerp(mu.y, mouseTarget.y, 0.06))

    renderer.render({ scene: mesh })
  }

  resize()

  return {
    setProgress,
    setHover,
    setMouse,
    resize,
    render,
    destroy() {
      const ext = gl.getExtension('WEBGL_lose_context')
      ext?.loseContext()
    },
    ready: Promise.all(loaded).then(() => undefined),
  }
}

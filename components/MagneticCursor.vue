<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useEnvFlags } from '~/composables/useReducedMotion'
import { clamp, damp } from '~/utils/motion'

/**
 * A magnetic, framerate-independent custom cursor.
 *
 * Two tracked points: the raw pointer (instant) and a damped follower (the
 * ring) that eases toward it via `damp()` — `target + (pos-target)*k^dt`, so
 * the feel is identical at 60 and 120Hz. Over interactive elements tagged
 * `[data-magnetic]` the ring snaps to the element's centre and grows, giving
 * the "lock-on" read. A subtle velocity squash adds life.
 *
 * Entirely gated: it only mounts its listeners on fine-pointer, no-reduced-
 * motion devices. Otherwise the native cursor is left untouched — a real
 * fallback, not a degraded one. Driven off gsap.ticker (one rАF for the app).
 */
const { reducedMotion, finePointer } = useEnvFlags()
const { $gsap } = useNuxtApp()

const dot = ref<HTMLElement | null>(null)
const ring = ref<HTMLElement | null>(null)
const visible = ref(false)

// Raw pointer target and the damped follower position.
const target = { x: 0, y: 0 }
const pos = { x: 0, y: 0 }
let lastX = 0
let active = false // hovering an interactive element
let magnetEl: HTMLElement | null = null
let cleanup: Array<() => void> = []

function onMove(e: PointerEvent) {
  target.x = e.clientX
  target.y = e.clientY
  if (!visible.value) {
    // First sight — snap the follower so it doesn't fly in from a corner.
    pos.x = target.x
    pos.y = target.y
    lastX = target.x
    visible.value = true
  }
  // Mirror onto CSS vars so ambient glows can track the pointer cheaply.
  document.documentElement.style.setProperty('--mx', `${e.clientX}px`)
  document.documentElement.style.setProperty('--my', `${e.clientY}px`)
}

function onOver(e: PointerEvent) {
  const el = (e.target as HTMLElement)?.closest<HTMLElement>('[data-magnetic]')
  if (el) {
    active = true
    magnetEl = el
  }
}

function onOut(e: PointerEvent) {
  const el = (e.target as HTMLElement)?.closest<HTMLElement>('[data-magnetic]')
  if (el && el === magnetEl) {
    active = false
    magnetEl = null
  }
}

function onLeaveWindow() {
  visible.value = false
}

// Per-frame update, driven by the GSAP ticker (deltaRatio()/60 == seconds).
function tick() {
  const dt = $gsap.ticker.deltaRatio() / 60
  // When locked onto an element, ease the *target* toward its centre so the
  // ring magnetically settles on the control rather than the bare pointer.
  let tx = target.x
  let ty = target.y
  if (active && magnetEl) {
    const r = magnetEl.getBoundingClientRect()
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    // Pull 45% of the way to the centre — present but not glued.
    tx = target.x + (cx - target.x) * 0.45
    ty = target.y + (cy - target.y) * 0.45
  }

  // damping 0.0008/s for the ring (lags, weighty), tighter for the dot.
  pos.x = damp(pos.x, tx, 0.0008, dt)
  pos.y = damp(pos.y, ty, 0.0008, dt)

  // Horizontal velocity -> a gentle directional squash (Cuberto signature).
  const vx = pos.x - lastX
  lastX = pos.x
  const squash = clamp(Math.abs(vx) * 0.012, 0, 0.18)
  const scale = active ? 2.6 : 1
  const sx = scale * (1 + squash)
  const sy = scale * (1 - squash)

  if (ring.value) {
    ring.value.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0) translate(-50%, -50%) scale(${sx}, ${sy})`
  }
  if (dot.value) {
    // The dot tracks the raw pointer almost 1:1 (very light damping).
    dot.value.style.transform = `translate3d(${target.x}px, ${target.y}px, 0) translate(-50%, -50%)`
  }
}

onMounted(() => {
  if (reducedMotion.value || !finePointer.value) return

  document.documentElement.classList.add('has-custom-cursor')
  window.addEventListener('pointermove', onMove, { passive: true })
  window.addEventListener('pointerover', onOver, { passive: true })
  window.addEventListener('pointerout', onOut, { passive: true })
  document.addEventListener('mouseleave', onLeaveWindow)
  $gsap.ticker.add(tick)

  cleanup = [
    () => window.removeEventListener('pointermove', onMove),
    () => window.removeEventListener('pointerover', onOver),
    () => window.removeEventListener('pointerout', onOut),
    () => document.removeEventListener('mouseleave', onLeaveWindow),
    () => $gsap.ticker.remove(tick),
    () => document.documentElement.classList.remove('has-custom-cursor'),
  ]
})

onBeforeUnmount(() => {
  cleanup.forEach((fn) => fn())
  cleanup = []
})
</script>

<template>
  <!-- aria-hidden: a decorative pointer enhancement; SR users get the native
       focus model untouched. Pointer-events none so it never eats clicks. -->
  <div
    v-show="visible"
    aria-hidden="true"
    class="pointer-events-none fixed inset-0 z-[100] hidden md:block"
  >
    <span
      ref="ring"
      class="absolute left-0 top-0 h-9 w-9 rounded-full border border-rose/80 mix-blend-difference will-change-transform"
    />
    <span
      ref="dot"
      class="absolute left-0 top-0 h-1.5 w-1.5 rounded-full bg-rose will-change-transform"
    />
  </div>
</template>

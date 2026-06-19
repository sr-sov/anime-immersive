<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useEnvFlags } from '~/composables/useReducedMotion'
import { loadGsap, type GsapMatchMedia } from '~/composables/useGsap'

/**
 * SplitText scroll-reveal. Splits the slotted text into lines + the chosen
 * unit (chars or words), masks each line (overflow clip), and reveals on
 * scroll-in with a staggered translate. Uses gsap.matchMedia so the reduced-
 * motion branch sets everything to its final state with NO animation — a real
 * static fallback. `autoSplit` re-splits on font load so the web font never
 * mis-measures the lines.
 *
 * Anti-flash: the wrapper carries `.split-arming` (opacity:0) ONLY until the
 * split has run and the unit from-state is set. After that the wrapper is fully
 * visible and the units carry the hidden state — so the revealed text never
 * gets trapped at opacity 0 (a class, not an inline-style fight with Vue).
 */
const props = withDefaults(
  defineProps<{
    as?: string
    unit?: 'chars' | 'words'
    start?: string
    stagger?: number
    duration?: number
  }>(),
  {
    as: 'div',
    unit: 'chars',
    start: 'top 85%',
    stagger: 0.012,
    duration: 0.9,
  },
)

const { reducedMotion } = useEnvFlags()
const el = ref<HTMLElement | null>(null)
// Starts armed (hidden) only when motion is allowed; reduced-motion is visible
// from the first paint. SSR-safe default: visible (reducedMotion starts true).
const arming = ref(!reducedMotion.value)
let mm: GsapMatchMedia | null = null

onMounted(async () => {
  if (!el.value) return
  // Arm synchronously (before the async GSAP chunk resolves) so motion-enabled
  // users hide the text immediately and never see a visible→hidden→reveal flash
  // while the chunk loads. Reduced-motion stays visible.
  if (!reducedMotion.value) arming.value = true
  // GSAP + SplitText are lazy-loaded after first paint.
  const { gsap, SplitText } = await loadGsap()
  if (!el.value) return
  mm = gsap.matchMedia()

  mm.add('(prefers-reduced-motion: no-preference)', () => {
    arming.value = true
    const split = SplitText.create(el.value as HTMLElement, {
      type: `lines,${props.unit}`,
      mask: 'lines',
      autoSplit: true,
      // 'auto' adds aria-label + aria-hidden to the split pieces. On a bare <p>
      // (no naming-capable role) that aria-label is *prohibited* (axe flags it),
      // and the split text nodes are real, readable DOM anyway — so we keep the
      // native text in the a11y tree and skip SplitText's ARIA rewrite.
      aria: 'none',
      linesClass: 'split-line',
      onSplit(self: { lines: Element[]; chars: Element[]; words: Element[] }) {
        const targets = props.unit === 'chars' ? self.chars : self.words
        // Hide the UNITS, then reveal the wrapper — no flash, no trap.
        gsap.set(targets, { yPercent: 110, opacity: 0 })
        arming.value = false
        return gsap.to(targets, {
          yPercent: 0,
          opacity: 1,
          duration: props.duration,
          ease: 'expo.out',
          stagger: props.stagger,
          scrollTrigger: { trigger: el.value, start: props.start, once: true },
        })
      },
    })
    return () => {
      split.revert()
      arming.value = false
    }
  })

  mm.add('(prefers-reduced-motion: reduce)', () => {
    arming.value = false
  })
})

onBeforeUnmount(() => mm?.revert())
</script>

<template>
  <component
    :is="props.as"
    ref="el"
    data-split
    :class="{ 'opacity-0': arming }"
  >
    <slot />
  </component>
</template>

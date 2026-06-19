<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useEnvFlags } from '~/composables/useReducedMotion'

/**
 * A velocity-reactive marquee: a base drift that speeds up and reverses with
 * scroll direction, the Cuberto "reeller" signature. Two copies of the content
 * are tiled and wrapped in [-100, 0] so it loops seamlessly. Driven off the
 * GSAP ticker (one rAF) and a ScrollTrigger that only reports scroll direction.
 *
 * Reduced motion: the strip is rendered static (one copy, no drift).
 */
const props = withDefaults(
  defineProps<{
    /** Base drift %/frame. Positive scrolls left. */
    speed?: number
  }>(),
  { speed: 0.04 },
)

const { reducedMotion } = useEnvFlags()
const { $gsap, $ScrollTrigger } = useNuxtApp()

const a = ref<HTMLElement | null>(null)
const b = ref<HTMLElement | null>(null)
let x = 0
let direction = 1
let velocityBoost = 1
let st: ReturnType<typeof $ScrollTrigger.create> | null = null
let tickerFn: (() => void) | null = null

const wrap = $gsap.utils.wrap(-100, 0)

function tick() {
  // Ease the scroll boost back toward 1 each frame.
  velocityBoost += (1 - velocityBoost) * 0.05
  x += props.speed * direction * velocityBoost
  const v = wrap(x)
  $gsap.set([a.value, b.value], { xPercent: v })
}

onMounted(() => {
  if (reducedMotion.value || !a.value) return

  st = $ScrollTrigger.create({
    onUpdate: (self: { direction: number; getVelocity: () => number }) => {
      direction = self.direction === -1 ? -1 : 1
      // A short kick proportional to scroll speed.
      const boost = 1 + Math.min(Math.abs(self.getVelocity()) / 1500, 4)
      velocityBoost = Math.max(velocityBoost, boost)
    },
  })
  tickerFn = tick
  $gsap.ticker.add(tickerFn)
})

onBeforeUnmount(() => {
  if (tickerFn) $gsap.ticker.remove(tickerFn)
  st?.kill()
})
</script>

<template>
  <div class="mask-x-fade relative flex w-full overflow-hidden">
    <div ref="a" class="flex shrink-0 items-center whitespace-nowrap will-change-transform">
      <slot />
    </div>
    <!-- Second copy trails the first for a seamless loop (hidden statically). -->
    <div
      v-if="!reducedMotion"
      ref="b"
      aria-hidden="true"
      class="flex shrink-0 items-center whitespace-nowrap will-change-transform"
    >
      <slot />
    </div>
  </div>
</template>

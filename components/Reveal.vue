<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * A composition-friendly scroll reveal for non-text blocks (cards, images,
 * stat rows). Translates + fades in on scroll-in using the house ease. Wrapped
 * in gsap.matchMedia so reduced-motion users get the final state instantly.
 *
 * Transform/opacity only — GPU-compositable, no layout thrash.
 */
const props = withDefaults(
  defineProps<{
    /** Travel distance in px (positive = rises up). */
    y?: number
    /** Stagger applied to direct children instead of the element itself. */
    stagger?: number
    /** Delay before the tween begins. */
    delay?: number
    start?: string
    duration?: number
  }>(),
  { y: 40, stagger: 0, delay: 0, start: 'top 88%', duration: 0.9 },
)

const { $gsap } = useNuxtApp()
const el = ref<HTMLElement | null>(null)
let mm: ReturnType<typeof $gsap.matchMedia> | null = null

onMounted(() => {
  if (!el.value) return
  mm = $gsap.matchMedia()

  mm.add('(prefers-reduced-motion: no-preference)', () => {
    const targets =
      props.stagger > 0 && el.value
        ? (Array.from(el.value.children) as HTMLElement[])
        : (el.value as HTMLElement)
    const tween = $gsap.from(targets, {
      y: props.y,
      opacity: 0,
      duration: props.duration,
      delay: props.delay,
      ease: 'power3.out',
      stagger: props.stagger,
      scrollTrigger: { trigger: el.value, start: props.start, once: true },
    })
    return () => tween.scrollTrigger?.kill()
  })

  mm.add('(prefers-reduced-motion: reduce)', () => {
    if (!el.value) return
    const nodes =
      props.stagger > 0
        ? (Array.from(el.value.children) as HTMLElement[])
        : [el.value]
    nodes.forEach((n) => {
      n.style.opacity = '1'
      n.style.transform = 'none'
    })
  })
})

onBeforeUnmount(() => mm?.revert())
</script>

<template>
  <div ref="el" data-reveal>
    <slot />
  </div>
</template>

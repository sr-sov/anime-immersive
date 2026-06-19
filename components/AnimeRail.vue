<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useEnvFlags } from '~/composables/useReducedMotion'
import { loadGsap } from '~/composables/useGsap'
import type { Anime } from '~/types/jikan'

/**
 * A horizontal cover rail with a scroll-velocity skew on the track (the
 * "liquid momentum" signature). Native horizontal overflow keeps it fully
 * keyboard- and touch-operable; the skew is pure transform and removed under
 * reduced motion.
 */
const props = defineProps<{
  items: Anime[]
  heading: string
  kicker?: string
}>()

const { reducedMotion } = useEnvFlags()

const track = ref<HTMLElement | null>(null)
let st: { kill: () => void } | null = null

onMounted(async () => {
  if (reducedMotion.value || !track.value) return
  // GSAP is lazy-loaded after first paint (kept out of the entry bundle).
  const { gsap, ScrollTrigger } = await loadGsap()
  if (reducedMotion.value || !track.value) return
  const clamp = gsap.utils.clamp(-8, 8)
  const skewSetter = gsap.quickSetter(track.value, 'skewX', 'deg')
  const proxy = { skew: 0 }

  st = ScrollTrigger.create({
    trigger: track.value,
    onUpdate: (self: { getVelocity: () => number }) => {
      const skew = clamp(self.getVelocity() / -1200)
      if (Math.abs(skew) > Math.abs(proxy.skew)) {
        proxy.skew = skew
        gsap.to(proxy, {
          skew: 0,
          duration: 0.8,
          ease: 'power3',
          overwrite: true,
          onUpdate: () => skewSetter(proxy.skew),
        })
      }
    },
  })
})

onBeforeUnmount(() => st?.kill())
</script>

<template>
  <section class="py-20">
    <div class="container-page">
      <Reveal :y="20" class="mb-8 flex items-end justify-between gap-6">
        <div>
          <p
            v-if="kicker"
            class="mb-2 font-mono text-xs uppercase tracking-[0.3em] text-rose"
          >
            {{ kicker }}
          </p>
          <h2 class="font-display text-3xl uppercase leading-none text-bone sm:text-5xl">
            {{ heading }}
          </h2>
        </div>
        <span class="hidden font-mono text-xs uppercase tracking-[0.2em] text-bone-faint sm:inline">
          Drag · scroll →
        </span>
      </Reveal>
    </div>

    <!-- Native horizontal scroll: keyboard + touch friendly. -->
    <div
      ref="track"
      class="flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-4 will-change-transform sm:px-8 lg:px-12 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <div
        v-for="(a, i) in props.items"
        :key="a.mal_id"
        class="w-[44vw] shrink-0 snap-start sm:w-[26vw] lg:w-[18vw] xl:w-[14vw]"
      >
        <AnimeCard :anime="a" :index="i" />
      </div>
    </div>
  </section>
</template>

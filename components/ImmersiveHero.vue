<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useEnvFlags } from '~/composables/useReducedMotion'
import { loadGsap, type GsapMatchMedia } from '~/composables/useGsap'
import { coverImage } from '~/composables/useFormat'
import { coverSrcSet } from '~/composables/useImage'
import type { Anime } from '~/types/jikan'

/**
 * The opening moment. A full-bleed title reveal over the single most acclaimed
 * cover, with a quiet parallax drift on scroll and a SplitText headline. One
 * hero, one breath — restraint before the loud gallery below.
 *
 * Reduced motion gets the same composition, statically: the headline is just
 * there, the cover sits still. Honored as a path, not a downgrade.
 */
const props = defineProps<{ featured: Anime | null }>()

const { reducedMotion } = useEnvFlags()

const root = ref<HTMLElement | null>(null)
const layer = ref<HTMLElement | null>(null)
const veil = ref<HTMLElement | null>(null)
let mm: GsapMatchMedia | null = null

onMounted(async () => {
  if (!root.value) return
  // GSAP is lazy-loaded after first paint (kept out of the entry bundle).
  const { gsap } = await loadGsap()
  if (!root.value) return
  mm = gsap.matchMedia()

  mm.add('(prefers-reduced-motion: no-preference)', () => {
    // Intro: the cover scales down from a slight zoom; veil lifts.
    const intro = gsap.timeline()
    intro.from(layer.value, { scale: 1.12, duration: 1.8, ease: 'expo.out' }, 0)
    intro.fromTo(
      veil.value,
      { opacity: 0.9 },
      { opacity: 0.5, duration: 1.6, ease: 'power2.out' },
      0,
    )

    // Parallax: cover drifts up slower than scroll; veil deepens.
    const para = gsap.timeline({
      scrollTrigger: {
        trigger: root.value,
        start: 'top top',
        end: 'bottom top',
        scrub: true,
      },
    })
    para.to(layer.value, { yPercent: 18, ease: 'none' }, 0)
    para.to(veil.value, { opacity: 0.85, ease: 'none' }, 0)

    return () => {
      intro.kill()
      para.scrollTrigger?.kill()
      para.kill()
    }
  })
})

onBeforeUnmount(() => mm?.revert())
</script>

<template>
  <header
    ref="root"
    class="relative flex h-screen min-h-[640px] w-full flex-col justify-end overflow-hidden"
  >
    <!-- Cover layer (parallax) -->
    <div ref="layer" class="absolute inset-0 will-change-transform">
      <img
        v-if="props.featured"
        :src="coverImage(props.featured.images)"
        :srcset="coverSrcSet(props.featured.images)"
        sizes="100vw"
        :alt="`Cover art for ${props.featured.title}`"
        fetchpriority="high"
        class="h-full w-full object-cover object-top"
      />
    </div>
    <!-- Cinematic veil + vignette -->
    <div
      ref="veil"
      class="absolute inset-0 bg-gradient-to-t from-void via-void/80 to-void/30"
      aria-hidden="true"
    />
    <div
      class="pointer-events-none absolute inset-0 [background:radial-gradient(120%_90%_at_50%_10%,transparent,rgba(14,10,16,0.85))]"
      aria-hidden="true"
    />

    <!-- Content -->
    <div class="container-page relative z-10 pb-[14vh]">
      <div class="mb-6 flex items-center gap-4 font-mono text-xs uppercase tracking-[0.4em] text-rose">
        <span class="h-px w-12 bg-gradient-to-r from-rose to-ice" />
        An immersive index
      </div>

      <SplitReveal
        as="h1"
        unit="chars"
        :stagger="0.018"
        :duration="1"
        class="font-display text-[clamp(3rem,12vw,11rem)] uppercase leading-[0.82] tracking-tightest text-bone"
      >
        Sakura Noir
      </SplitReveal>

      <SplitReveal
        as="p"
        unit="words"
        :stagger="0.03"
        :start="'top 95%'"
        class="mt-7 max-w-2xl text-pretty text-base leading-relaxed text-bone-dim sm:text-lg"
      >
        The most acclaimed anime ever made, rendered as a scroll. Built with
        Nuxt, GSAP and WebGL — a study in motion held to sixty frames.
      </SplitReveal>

      <Reveal :y="24" :delay="0.4" class="mt-10">
        <a
          href="#gallery"
          data-magnetic
          class="inline-flex items-center gap-3 rounded-full border border-bone-faint/30 px-6 py-3 text-sm font-medium uppercase tracking-[0.2em] text-bone transition-colors duration-300 ease-house hover:border-rose hover:text-rose focus-visible:border-rose"
        >
          Begin the descent
          <span aria-hidden="true">↓</span>
        </a>
      </Reveal>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useEnvFlags } from '~/composables/useReducedMotion'
import { loadGsap, type GsapMatchMedia } from '~/composables/useGsap'
import { canvasSuitability, type DeviceTier } from '~/composables/useDeviceTier'
import type { GalleryGL } from '~/composables/useGalleryGL'
import { coverImage, useFormat } from '~/composables/useFormat'
import { coverSrcSet, GALLERY_SIZES } from '~/composables/useImage'
import type { Anime } from '~/types/jikan'

/**
 * The signature interaction: a pinned, scroll-orchestrated gallery — rendered
 * on a TIERED strategy, never a binary WebGL/no-WebGL flip.
 *
 *  tier 'gl'       — an OGL canvas crossfades cover textures with a displacement
 *                    + chromatic shader keyed to scroll (the atmospheric layer).
 *                    OGL is code-split: it loads AFTER first paint, only here.
 *  tier 'parallax' — the SAME pinned composition with NO canvas and NO shader: a
 *                    pure DOM crossfade + a GPU-cheap parallax drift. A real
 *                    cinematic fallback for weak GPUs / no-WebGL, not a downgrade.
 *  tier 'static'   — reduced-motion / genuinely weak device: a clean, legible,
 *                    keyboard-navigable card stack. No pin, no animation.
 *
 * In every tier the readable content (rank, title, score, genres, the "Enter"
 * link) lives in the DOM, so it stays accessible. `canvasSuitability()` picks
 * the tier on mount from the real device profile.
 */
const props = defineProps<{ items: Anime[] }>()

const { reducedMotion } = useEnvFlags()
const { score, year, episodes, synopsisLead } = useFormat()

const root = ref<HTMLElement | null>(null)
const canvasEl = ref<HTMLCanvasElement | null>(null)
const active = ref(0)
const progress = ref(0) // 0..1 across the whole pinned scroll (drives parallax)
// SSR + first-paint default is 'static' so the server render matches hydration;
// the real tier is resolved in onMounted (client-only) after this paints.
const tier = ref<DeviceTier>('static')

const covers = computed(() => props.items.map((a) => coverImage(a.images)))
const count = computed(() => props.items.length)

const isImmersive = computed(() => tier.value === 'gl' || tier.value === 'parallax')

let gl: GalleryGL | null = null
let mm: GsapMatchMedia | null = null
let gsap: import('~/composables/useGsap').GsapBundle['gsap'] | null = null
let tickerFn: (() => void) | null = null
let resizeFn: (() => void) | null = null
let mouseFn: ((e: PointerEvent) => void) | null = null

onMounted(async () => {
  if (!root.value) return
  // GSAP is lazy-loaded after first paint (kept out of the entry bundle).
  const bundle = await loadGsap()
  if (!root.value) return
  gsap = bundle.gsap
  mm = gsap.matchMedia()

  mm.add('(prefers-reduced-motion: no-preference)', () => {
    if (!root.value || !gsap) return

    // Resolve the device tier now (real GPU/DPR/renderer inspection).
    tier.value = canvasSuitability(reducedMotion.value)
    if (tier.value === 'static') return

    const wantGL = tier.value === 'gl' && !!canvasEl.value && covers.value.length > 1

    // Code-split OGL: dynamically import the GL composable so its ~10kB + the
    // shader plumbing never lands in the main bundle (the first-paint cost).
    if (wantGL && canvasEl.value) {
      import('~/composables/useGalleryGL')
        .then(({ createGalleryGL }) => {
          if (!canvasEl.value || tier.value !== 'gl' || !gsap) return
          gl = createGalleryGL(canvasEl.value, covers.value)
          tickerFn = () => gl?.render()
          gsap.ticker.add(tickerFn)
          resizeFn = () => gl?.resize()
          window.addEventListener('resize', resizeFn)
          mouseFn = (e: PointerEvent) =>
            gl?.setMouse(e.clientX / window.innerWidth, e.clientY / window.innerHeight)
          window.addEventListener('pointermove', mouseFn, { passive: true })
        })
        .catch(() => {
          // If the chunk fails, fall back to the DOM parallax tier.
          tier.value = 'parallax'
        })
    }

    const n = count.value
    // Pin the section and scrub through n slides. Each slide gets one viewport
    // of scroll; the last sits a moment before release.
    const trigger = gsap.context(() => {
      const scrollLen = n * 0.9
      const t = gsap!.timeline({
        scrollTrigger: {
          trigger: root.value,
          start: 'top top',
          end: () => `+=${window.innerHeight * scrollLen}`,
          pin: true,
          scrub: 0.6,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self: { progress: number }) => {
            progress.value = self.progress
            const p = self.progress * (n - 1)
            const idx = Math.min(Math.floor(p), n - 1)
            const frac = p - idx
            active.value = Math.round(p)
            gl?.setProgress(idx, frac)
            gl?.setHover(0.4)
          },
        },
      })
      return t
    }, root.value)

    return () => {
      trigger.revert()
      if (tickerFn) gsap?.ticker.remove(tickerFn)
      if (resizeFn) window.removeEventListener('resize', resizeFn)
      if (mouseFn) window.removeEventListener('pointermove', mouseFn)
      gl?.destroy()
      gl = null
    }
  })
})

onBeforeUnmount(() => {
  mm?.revert()
})

// DOM-parallax drift: a small, GPU-cheap translate driven by scroll progress.
// Only meaningful in the 'parallax' tier (no canvas), so the cover still moves.
const parallaxStyle = computed(() => ({
  transform: `translate3d(0, ${(progress.value - 0.5) * 8}%, 0) scale(1.08)`,
}))

// Panel transition for the active-slide swap (JS-driven so it survives pin).
// `gsap` is set once the lazy chunk resolves; before that (it won't fire, since
// the panels only swap on scroll which needs the timeline) we no-op gracefully.
function onPanelEnter(el: Element, done: () => void) {
  if (reducedMotion.value || !gsap) return done()
  gsap.fromTo(
    el,
    { opacity: 0, y: 28 },
    { opacity: 1, y: 0, duration: 0.7, ease: 'expo.out', onComplete: done },
  )
}
function onPanelLeave(el: Element, done: () => void) {
  if (reducedMotion.value || !gsap) return done()
  gsap.to(el, { opacity: 0, y: -20, duration: 0.4, ease: 'power2.in', onComplete: done })
}
</script>

<template>
  <!-- ============================ IMMERSIVE ============================ -->
  <!-- One pinned section for both the 'gl' and 'parallax' tiers; the canvas is
       present only on the GL tier, the DOM crossfade only otherwise. -->
  <section
    v-if="isImmersive"
    ref="root"
    class="relative h-screen w-full overflow-hidden"
    aria-roledescription="scroll gallery"
    aria-label="Top anime, scroll-driven gallery"
  >
    <!-- WebGL atmospheric layer (GL tier only) -->
    <canvas
      v-show="tier === 'gl'"
      ref="canvasEl"
      class="absolute inset-0 h-full w-full"
      aria-hidden="true"
    />

    <!-- DOM crossfade + parallax drift (parallax tier — no canvas, no shader) -->
    <div v-if="tier === 'parallax'" class="absolute inset-0" aria-hidden="true">
      <div class="absolute inset-0 will-change-transform" :style="parallaxStyle">
        <img
          v-for="(a, i) in props.items"
          :key="a.mal_id"
          :src="coverImage(a.images)"
          :srcset="coverSrcSet(a.images)"
          sizes="100vw"
          alt=""
          decoding="async"
          class="absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ease-house"
          :style="{ opacity: i === active ? 0.6 : 0 }"
        />
      </div>
      <div class="absolute inset-0 bg-gradient-to-t from-void via-void/70 to-void/30" />
      <div
        class="pointer-events-none absolute inset-0 [background:radial-gradient(120%_90%_at_50%_10%,transparent,rgba(14,10,16,0.8))]"
      />
    </div>

    <!-- Readable DOM overlay (identical in both immersive tiers) -->
    <div class="container-page relative z-10 flex h-full flex-col justify-end pb-[12vh]">
      <div class="grid grid-cols-12 items-end gap-6">
        <div class="col-span-12 md:col-span-8 lg:col-span-7">
          <Transition :css="false" @enter="onPanelEnter" @leave="onPanelLeave" mode="out-in">
            <article :key="active" class="space-y-5">
              <div class="flex items-center gap-3 font-mono text-xs uppercase tracking-[0.3em] text-rose">
                <span class="nums">{{ String(active + 1).padStart(2, '0') }}</span>
                <span class="h-px w-10 bg-gradient-to-r from-rose to-ice" />
                <span class="text-bone-dim">Top {{ count }}</span>
              </div>
              <h2
                class="font-display text-[clamp(2.4rem,7vw,6rem)] uppercase leading-[0.92] tracking-tightest text-balance text-bone"
              >
                {{ props.items[active]?.title }}
              </h2>
              <p class="max-w-xl text-pretty text-sm leading-relaxed text-bone-dim sm:text-base">
                {{ synopsisLead(props.items[active]?.synopsis, 200) }}
              </p>
              <div class="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-bone-dim">
                <span class="nums">
                  <span class="text-rose">★</span>
                  {{ score(props.items[active]?.score) }}
                </span>
                <span class="nums">{{ year(props.items[active]!) }}</span>
                <span class="nums">{{ episodes(props.items[active]?.episodes) }}</span>
                <span v-if="props.items[active]?.type" class="uppercase tracking-wide text-ice">
                  {{ props.items[active]?.type }}
                </span>
              </div>
              <NuxtLink
                :to="`/anime/${props.items[active]?.mal_id}`"
                data-magnetic
                class="group inline-flex items-center gap-3 rounded-full border border-rose/40 bg-rose/5 px-6 py-3 text-sm font-medium uppercase tracking-[0.2em] text-bone transition-colors duration-300 hover:border-rose hover:bg-rose/15 focus-visible:bg-rose/15"
              >
                Enter
                <span class="transition-transform duration-300 ease-house group-hover:translate-x-1" aria-hidden="true">→</span>
              </NuxtLink>
            </article>
          </Transition>
        </div>

        <!-- Vertical progress index -->
        <div class="col-span-12 hidden md:col-span-4 md:block lg:col-span-5">
          <ol class="ml-auto flex max-w-[14rem] flex-col gap-1 text-right">
            <li
              v-for="(a, i) in props.items"
              :key="a.mal_id"
              class="flex items-center justify-end gap-3 font-mono text-xs transition-colors duration-300"
              :class="i === active ? 'text-bone' : 'text-bone-dim/70'"
            >
              <span class="truncate" :class="i === active ? 'max-w-[10rem]' : 'max-w-0 opacity-0'">
                {{ a.title }}
              </span>
              <span class="nums">{{ String(i + 1).padStart(2, '0') }}</span>
              <span
                class="h-px transition-all duration-300"
                :class="i === active ? 'w-8 bg-rose' : 'w-3 bg-ice/40'"
              />
            </li>
          </ol>
        </div>
      </div>

      <!-- Scroll hint: a smoothly-eased drop, not a bounce. -->
      <div class="mt-12 flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-bone-dim">
        <span class="relative flex h-8 w-5 items-start justify-center overflow-hidden rounded-full border border-ice/40 p-1">
          <span class="scroll-cue h-2 w-1 rounded-full bg-rose" />
        </span>
        Scroll to traverse
      </div>
    </div>
  </section>

  <!-- ======================= STATIC / REDUCED FALLBACK ======================= -->
  <section v-else class="container-page py-16" aria-label="Top anime">
    <ul class="grid gap-10">
      <li
        v-for="(a, i) in props.items"
        :key="a.mal_id"
        class="grid items-center gap-6 border-t hairline pt-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]"
      >
        <NuxtLink :to="`/anime/${a.mal_id}`" class="block overflow-hidden rounded-lg">
          <img
            :src="coverImage(a.images)"
            :srcset="coverSrcSet(a.images)"
            :sizes="GALLERY_SIZES"
            :alt="`Cover art for ${a.title}`"
            loading="lazy"
            class="aspect-[3/4] w-full object-cover"
          />
        </NuxtLink>
        <div class="space-y-3">
          <div class="font-mono text-xs uppercase tracking-[0.3em] text-rose nums">
            {{ String(i + 1).padStart(2, '0') }} / {{ count }}
          </div>
          <h2 class="font-display text-4xl uppercase leading-none text-bone">
            {{ a.title }}
          </h2>
          <p class="max-w-prose text-sm leading-relaxed text-bone-dim">
            {{ synopsisLead(a.synopsis, 220) }}
          </p>
          <div class="flex flex-wrap gap-x-5 gap-y-1 text-sm text-bone-dim nums">
            <span><span class="text-rose">★</span> {{ score(a.score) }}</span>
            <span>{{ year(a) }}</span>
            <span>{{ episodes(a.episodes) }}</span>
          </div>
          <NuxtLink
            :to="`/anime/${a.mal_id}`"
            class="inline-flex items-center gap-2 text-sm font-medium uppercase tracking-[0.2em] text-rose underline-offset-4 hover:underline"
          >
            Enter →
          </NuxtLink>
        </div>
      </li>
    </ul>
  </section>
</template>

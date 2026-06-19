<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useEnvFlags } from '~/composables/useReducedMotion'
import { createGalleryGL, type GalleryGL } from '~/composables/useGalleryGL'
import { coverImage, useFormat } from '~/composables/useFormat'
import type { Anime } from '~/types/jikan'

/**
 * The signature interaction: a pinned, scroll-orchestrated WebGL gallery.
 *
 * Full-motion path
 *  - One pinned full-viewport section; vertical scroll scrubs a ScrollTrigger.
 *  - An OGL canvas crossfades between cover textures with a displacement +
 *    chromatic shader keyed to scroll progress (the atmospheric layer).
 *  - A DOM overlay carries the *readable* content (rank, title, score, genres,
 *    a magnetic "Enter" link). The active slide's panel swaps as progress
 *    crosses each step; panels animate with transform/opacity only.
 *  - A vertical progress index tracks position.
 *
 * Reduced-motion / no-WebGL path
 *  - No pin, no canvas. A clean vertical stack of cinematic cover cards, each
 *    fully legible and keyboard-navigable. A real fallback, not a degraded one.
 */
const props = defineProps<{ items: Anime[] }>()

const { reducedMotion } = useEnvFlags()
const { $gsap } = useNuxtApp()
const { score, year, episodes, synopsisLead } = useFormat()

const root = ref<HTMLElement | null>(null)
const canvasEl = ref<HTMLCanvasElement | null>(null)
const active = ref(0)
const webglOn = ref(false)

const covers = computed(() => props.items.map((a) => coverImage(a.images)))
const count = computed(() => props.items.length)

let gl: GalleryGL | null = null
let st: { kill: () => void } | null = null
let mm: ReturnType<typeof $gsap.matchMedia> | null = null
let tickerFn: (() => void) | null = null
let resizeFn: (() => void) | null = null
let mouseFn: ((e: PointerEvent) => void) | null = null

function supportsWebGL(): boolean {
  try {
    const c = document.createElement('canvas')
    return !!(
      window.WebGLRenderingContext &&
      (c.getContext('webgl') || c.getContext('experimental-webgl'))
    )
  } catch {
    return false
  }
}

onMounted(() => {
  if (!root.value) return
  mm = $gsap.matchMedia()

  mm.add('(prefers-reduced-motion: no-preference)', () => {
    if (!root.value) return

    const useGL = !!canvasEl.value && supportsWebGL() && covers.value.length > 1
    if (useGL && canvasEl.value) {
      gl = createGalleryGL(canvasEl.value, covers.value)
      webglOn.value = true
      tickerFn = () => gl?.render()
      $gsap.ticker.add(tickerFn)
      resizeFn = () => gl?.resize()
      window.addEventListener('resize', resizeFn)
      mouseFn = (e: PointerEvent) =>
        gl?.setMouse(e.clientX / window.innerWidth, e.clientY / window.innerHeight)
      window.addEventListener('pointermove', mouseFn, { passive: true })
    }

    const n = count.value
    // Pin the section and scrub through n slides. Each slide gets one viewport
    // of scroll; the last sits a moment before release.
    const trigger = $gsap.context(() => {
      const scrollLen = n * 0.9
      const t = $gsap.timeline({
        scrollTrigger: {
          trigger: root.value,
          start: 'top top',
          end: () => `+=${window.innerHeight * scrollLen}`,
          pin: true,
          scrub: 0.6,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self: { progress: number }) => {
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

    st = trigger
    return () => {
      trigger.revert()
      if (tickerFn) $gsap.ticker.remove(tickerFn)
      if (resizeFn) window.removeEventListener('resize', resizeFn)
      if (mouseFn) window.removeEventListener('pointermove', mouseFn)
      gl?.destroy()
      gl = null
      webglOn.value = false
    }
  })
})

onBeforeUnmount(() => {
  mm?.revert()
  st?.kill()
})

// Panel transition for the active-slide swap (JS-driven so it survives pin).
function onPanelEnter(el: Element, done: () => void) {
  if (reducedMotion.value) return done()
  $gsap.fromTo(
    el,
    { opacity: 0, y: 28 },
    { opacity: 1, y: 0, duration: 0.7, ease: 'expo.out', onComplete: done },
  )
}
function onPanelLeave(el: Element, done: () => void) {
  if (reducedMotion.value) return done()
  $gsap.to(el, { opacity: 0, y: -20, duration: 0.4, ease: 'power2.in', onComplete: done })
}
</script>

<template>
  <!-- ============================ FULL MOTION ============================ -->
  <section
    v-if="!reducedMotion"
    ref="root"
    class="relative h-screen w-full overflow-hidden"
    aria-roledescription="scroll gallery"
    aria-label="Top anime, scroll-driven gallery"
  >
    <!-- WebGL atmospheric layer -->
    <canvas
      ref="canvasEl"
      class="absolute inset-0 h-full w-full"
      aria-hidden="true"
    />
    <!-- CSS crossfade fallback when WebGL is unavailable -->
    <div v-if="!webglOn" class="absolute inset-0" aria-hidden="true">
      <img
        v-for="(c, i) in covers"
        :key="c"
        :src="c"
        alt=""
        class="absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ease-house"
        :style="{ opacity: i === active ? 0.5 : 0 }"
      />
      <div class="absolute inset-0 bg-gradient-to-t from-void via-void/70 to-void/30" />
    </div>

    <!-- Readable DOM overlay -->
    <div class="container-page relative z-10 flex h-full flex-col justify-end pb-[12vh]">
      <div class="grid grid-cols-12 items-end gap-6">
        <div class="col-span-12 md:col-span-8 lg:col-span-7">
          <Transition :css="false" @enter="onPanelEnter" @leave="onPanelLeave" mode="out-in">
            <article :key="active" class="space-y-5">
              <div class="flex items-center gap-3 font-mono text-xs uppercase tracking-[0.3em] text-rose">
                <span class="nums">{{ String(active + 1).padStart(2, '0') }}</span>
                <span class="h-px w-10 bg-rose/50" />
                <span class="text-bone-faint">Top {{ count }}</span>
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
                <span v-if="props.items[active]?.type" class="uppercase tracking-wide">
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
              :class="i === active ? 'text-bone' : 'text-bone-faint/50'"
            >
              <span class="truncate" :class="i === active ? 'max-w-[10rem]' : 'max-w-0 opacity-0'">
                {{ a.title }}
              </span>
              <span class="nums">{{ String(i + 1).padStart(2, '0') }}</span>
              <span
                class="h-px transition-all duration-300"
                :class="i === active ? 'w-8 bg-rose' : 'w-3 bg-bone-faint/40'"
              />
            </li>
          </ol>
        </div>
      </div>

      <!-- Scroll hint: a smoothly-eased drop, not a bounce. -->
      <div class="mt-12 flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-bone-faint">
        <span class="relative flex h-8 w-5 items-start justify-center overflow-hidden rounded-full border border-bone-faint/40 p-1">
          <span class="scroll-cue h-2 w-1 rounded-full bg-rose" />
        </span>
        Scroll to traverse
      </div>
    </div>
  </section>

  <!-- ====================== REDUCED-MOTION FALLBACK ====================== -->
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

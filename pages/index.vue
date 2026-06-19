<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Anime } from '~/types/jikan'

/**
 * The immersive landing journey.
 *
 *   Hero (one cinematic moment)
 *     → a velocity marquee band
 *     → the pinned, scroll-orchestrated WebGL gallery (the top titles)
 *     → a "now airing" horizontal rail
 *
 * Two feeds, both client-side: the top-anime list powers the hero + gallery;
 * the current season powers the rail. Every feed renders its four states
 * (loading / error / empty / loaded) explicitly.
 */
const { getTopAnime, getSeasonNow } = useJikan()

// --- Top titles: hero + gallery -------------------------------------------
// topFailed/seasonFailed are set INSIDE the handlers (rather than letting them
// reject) so an SSR/build-time fetch timeout never 500s the prerender — the
// page ships its loading/error state and the client re-fetch recovers.
const topFailed = ref(false)
const {
  data: topData,
  pending: topPending,
  refresh: refreshTop,
} = await useAsyncData<Anime[]>(
  'top-anime',
  async () => {
    try {
      topFailed.value = false
      // A tight, curated set — the gallery is a deliberate dozen, not a wall.
      const res = await getTopAnime(1, { type: 'tv', limit: 12 })
      return res.data
    } catch {
      topFailed.value = true
      return []
    }
  },
  { default: () => [] },
)
const topError = computed(() => topFailed.value)

const featured = computed(() => topData.value[0] ?? null)
const gallery = computed(() => topData.value)

// --- Now airing: the rail --------------------------------------------------
const seasonFailed = ref(false)
const {
  data: seasonData,
  pending: seasonPending,
  refresh: refreshSeason,
} = await useAsyncData<Anime[]>(
  'season-now',
  async () => {
    try {
      seasonFailed.value = false
      const res = await getSeasonNow(1, 20)
      // De-dupe (Jikan occasionally repeats across a season) and trim.
      const seen = new Set<number>()
      return res.data.filter((a) => {
        if (seen.has(a.mal_id)) return false
        seen.add(a.mal_id)
        return true
      })
    } catch {
      seasonFailed.value = true
      return []
    }
  },
  // The "now airing" rail is below the fold and lives in <ClientOnly>, so fetch
  // it client-side only (server:false) and lazily — it never blocks the home
  // prerender or hydration, only the hero+gallery do.
  { default: () => [], server: false, lazy: true },
)
const seasonError = computed(() => seasonFailed.value)

const showTopLoading = computed(() => topPending.value && gallery.value.length === 0)
const showTopError = computed(() => !!topError.value && gallery.value.length === 0)
</script>

<template>
  <div>
    <!-- ============================== HERO ============================== -->
    <ImmersiveHero v-if="featured" :featured="featured" />

    <!-- Hero loading shell: a dark, calm hold (no jarring spinner). -->
    <div
      v-else-if="showTopLoading"
      class="flex h-screen items-end"
      aria-busy="true"
      aria-label="Loading the featured title"
    >
      <div class="container-page pb-[14vh]">
        <div class="skeleton h-4 w-40 rounded" />
        <div class="skeleton mt-6 h-[14vw] w-3/4 rounded" />
        <div class="skeleton mt-6 h-4 w-1/2 rounded" />
      </div>
    </div>

    <!-- Hero/gallery error -->
    <div v-else-if="showTopError" class="flex h-screen items-center">
      <div class="container-page">
        <ErrorState @retry="() => refreshTop()" />
      </div>
    </div>

    <!-- Velocity marquee band — a moment of pure motion between sections. -->
    <div
      v-if="gallery.length"
      class="border-y hairline bg-void-50/40 py-6"
      aria-hidden="true"
    >
      <Marquee :speed="0.05">
        <span
          v-for="(word, i) in ['SAKURA NOIR', 'TOP RATED', 'AN IMMERSIVE INDEX', 'BUILT WITH NUXT · GSAP · OGL']"
          :key="word"
          class="flex items-center"
        >
          <span class="px-8 font-display text-3xl uppercase tracking-tight text-bone sm:text-5xl">
            {{ word }}
          </span>
          <!-- Duotone separators: the rose / cyan brand pair, alternating. -->
          <span :class="i % 2 === 0 ? 'text-rose' : 'text-ice'">✦</span>
        </span>
      </Marquee>
    </div>

    <!-- ============================ GALLERY ============================ -->
    <div id="gallery">
      <ScrollGallery v-if="gallery.length" :items="gallery" />
    </div>

    <!-- ============================== RAIL ============================== -->
    <ClientOnly>
      <section v-if="seasonError && !seasonData.length" class="container-page py-20">
        <ErrorState
          title="Couldn’t load the season"
          message="The current-season feed failed, often a brief Jikan rate limit. The gallery above still works."
          @retry="() => refreshSeason()"
        />
      </section>

      <section v-else-if="seasonPending && !seasonData.length" class="py-20">
        <div class="container-page mb-8">
          <div class="skeleton h-10 w-64 rounded" />
        </div>
        <div class="px-5 sm:px-8 lg:px-12">
          <LoadingGrid :count="8" />
        </div>
      </section>

      <section v-else-if="!seasonData.length" class="container-page py-20">
        <EmptyState
          title="Nothing airing"
          message="The current-season feed came back empty. Check back next cour."
        />
      </section>

      <AnimeRail
        v-else
        :items="seasonData"
        kicker="Currently broadcasting"
        heading="Now airing"
      />
    </ClientOnly>
  </div>
</template>

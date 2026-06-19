<script setup lang="ts">
import { computed } from 'vue'
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
const {
  data: topData,
  pending: topPending,
  error: topError,
  refresh: refreshTop,
} = await useAsyncData<Anime[]>(
  'top-anime',
  async () => {
    // A tight, curated set — the gallery is a deliberate dozen, not a wall.
    const res = await getTopAnime(1, { type: 'tv', limit: 12 })
    return res.data
  },
  { default: () => [] },
)

const featured = computed(() => topData.value[0] ?? null)
const gallery = computed(() => topData.value)

// --- Now airing: the rail --------------------------------------------------
const {
  data: seasonData,
  pending: seasonPending,
  error: seasonError,
  refresh: refreshSeason,
} = await useAsyncData<Anime[]>(
  'season-now',
  async () => {
    const res = await getSeasonNow(1, 20)
    // De-dupe (Jikan occasionally repeats across a season) and trim.
    const seen = new Set<number>()
    return res.data.filter((a) => {
      if (seen.has(a.mal_id)) return false
      seen.add(a.mal_id)
      return true
    })
  },
  { default: () => [] },
)

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
          v-for="word in ['SAKURA NOIR', 'TOP RATED', 'AN IMMERSIVE INDEX', 'BUILT WITH NUXT · GSAP · OGL']"
          :key="word"
          class="flex items-center"
        >
          <span class="px-8 font-display text-3xl uppercase tracking-tight text-bone sm:text-5xl">
            {{ word }}
          </span>
          <span class="text-rose">✦</span>
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

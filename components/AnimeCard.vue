<script setup lang="ts">
import { computed } from 'vue'
import { coverImage, useFormat } from '~/composables/useFormat'
import type { Anime } from '~/types/jikan'

/**
 * A cinematic cover card for the horizontal rails. The cover is the surface;
 * metadata sits on a gradient at the base and the title rises on hover. Tagged
 * `data-magnetic` so the custom cursor locks onto it.
 */
const props = defineProps<{ anime: Anime; index?: number }>()
const { score, year } = useFormat()

const cover = computed(() => coverImage(props.anime.images))
const hasScore = computed(() => typeof props.anime.score === 'number')
// Defensive: recommendation-mapped items carry only id/title/images, so
// `genres`/`type` may be absent. Never index into a possibly-undefined array.
const topGenre = computed(
  () => props.anime.genres?.[0]?.name ?? props.anime.type ?? '',
)
</script>

<template>
  <NuxtLink
    :to="`/anime/${anime.mal_id}`"
    data-magnetic
    class="group relative block aspect-[3/4] overflow-hidden rounded-lg bg-void-100 transition-transform duration-500 ease-house hover:-translate-y-2 focus-visible:-translate-y-2"
  >
    <img
      v-if="cover"
      :src="cover"
      :alt="`Cover art for ${anime.title}`"
      loading="lazy"
      decoding="async"
      class="h-full w-full object-cover transition-transform duration-700 ease-house group-hover:scale-[1.06]"
    />
    <div
      v-else
      class="flex h-full w-full items-center justify-center text-xs text-bone-faint"
      aria-hidden="true"
    >
      No image
    </div>

    <!-- Legibility gradient -->
    <div
      class="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-void via-void/60 to-transparent"
      aria-hidden="true"
    />

    <!-- Rank index -->
    <span
      v-if="typeof index === 'number'"
      class="absolute left-3 top-3 font-mono text-xs uppercase tracking-[0.2em] text-bone/70 nums"
    >
      {{ String(index + 1).padStart(2, '0') }}
    </span>

    <!-- Score -->
    <span
      v-if="hasScore"
      class="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-void/80 px-2 py-0.5 text-xs font-semibold text-rose backdrop-blur nums"
    >
      <span aria-hidden="true">★</span>
      <span class="sr-only">Score</span>{{ score(anime.score) }}
    </span>

    <!-- Title block -->
    <div class="absolute inset-x-0 bottom-0 p-4">
      <h3
        class="line-clamp-2 text-sm font-semibold leading-snug text-bone transition-transform duration-500 ease-house group-hover:-translate-y-0.5"
        :title="anime.title"
      >
        {{ anime.title }}
      </h3>
      <div class="mt-1.5 flex items-center gap-2 text-xs text-bone-dim nums">
        <span>{{ year(anime) }}</span>
        <span v-if="topGenre" class="text-bone-faint" aria-hidden="true">·</span>
        <span v-if="topGenre" class="truncate">{{ topGenre }}</span>
      </div>
    </div>
  </NuxtLink>
</template>

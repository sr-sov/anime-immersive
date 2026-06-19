<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import { coverImage, useFormat } from '~/composables/useFormat'
import type {
  Anime,
  AnimeCharacter,
  AnimeRecommendation,
} from '~/types/jikan'

/**
 * The detail experience — a cinematic spread that keeps the motion language of
 * the index (no jarring context switch). A full-bleed cover hero with a
 * SplitText title, a typeset stat sidebar, the synopsis as a feature column,
 * a character rail and a recommendations rail. Every section reveals on scroll;
 * reduced motion shows the full, legible record statically.
 */
const route = useRoute()
const id = computed(() => route.params.id as string)

const { getAnimeById, getCharacters, getRecommendations } = useJikan()
const { score, year, compact, episodes, synopsisLead } = useFormat()

const { data, pending, error, refresh } = await useAsyncData<Anime | null>(
  () => `anime:${id.value}`,
  async () => (await getAnimeById(id.value)).data,
  { watch: [id], default: () => null },
)
const anime = computed(() => data.value)

// Cast + recommendations are secondary; failures are swallowed to empty rails
// so a rate-limited sub-request never breaks the page.
const { data: castData } = await useAsyncData<AnimeCharacter[]>(
  () => `chars:${id.value}`,
  async () => {
    try {
      const res = await getCharacters(id.value)
      return res.data.slice(0, 14)
    } catch {
      return []
    }
  },
  { watch: [id], default: () => [] },
)

const { data: recData } = await useAsyncData<AnimeRecommendation[]>(
  () => `recs:${id.value}`,
  async () => {
    try {
      const res = await getRecommendations(id.value)
      return res.data.slice(0, 12)
    } catch {
      return []
    }
  },
  { watch: [id], default: () => [] },
)

// Map recommendations into the minimal Anime-ish shape the rail card reads.
// `genres` is filled with an empty array so the card never indexes undefined.
const recItems = computed<Anime[]>(() =>
  recData.value.map(
    (r) =>
      ({
        mal_id: r.entry.mal_id,
        title: r.entry.title,
        images: r.entry.images,
        genres: [],
        score: null,
        year: null,
        type: null,
        aired: null,
      }) as unknown as Anime,
  ),
)

const cover = computed(() => (anime.value ? coverImage(anime.value.images) : ''))
const trailerUrl = computed(() => anime.value?.trailer?.url || null)
const trailerEmbed = computed(() => anime.value?.trailer?.embed_url || null)
const englishTitle = computed(() => {
  const a = anime.value
  if (!a?.title_english || a.title_english === a.title) return null
  return a.title_english
})

const stats = computed(() => {
  const a = anime.value
  if (!a) return []
  return [
    { label: 'Score', value: score(a.score), sub: a.scored_by ? `${compact(a.scored_by)} votes` : '' },
    { label: 'Rank', value: a.rank ? `#${a.rank}` : '—', sub: '' },
    { label: 'Episodes', value: episodes(a.episodes), sub: '' },
    { label: 'Aired', value: year(a), sub: a.season ? a.season : '' },
    { label: 'Members', value: compact(a.members), sub: '' },
    { label: 'Favorites', value: compact(a.favorites), sub: '' },
  ]
})

watchEffect(() => {
  if (anime.value) {
    useHead({ title: `${anime.value.title} · Sakura Noir` })
  }
})
</script>

<template>
  <div>
    <!-- Loading -->
    <div v-if="pending" class="flex min-h-screen flex-col justify-end">
      <div class="container-page pb-[12vh] pt-32">
        <div class="skeleton h-4 w-32 rounded" />
        <div class="skeleton mt-6 h-[12vw] w-2/3 rounded" />
        <div class="mt-8 grid max-w-2xl grid-cols-3 gap-4">
          <div class="skeleton h-16 rounded" />
          <div class="skeleton h-16 rounded" />
          <div class="skeleton h-16 rounded" />
        </div>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error || !anime" class="flex min-h-screen items-center pt-20">
      <div class="container-page">
        <ErrorState
          title="Couldn’t load this title"
          message="We couldn’t fetch this record. It may not exist, or the API may be rate-limited. Retry in a moment."
          @retry="() => refresh()"
        />
        <NuxtLink
          to="/"
          class="mt-6 inline-block font-mono text-xs uppercase tracking-[0.2em] text-bone-faint hover:text-bone"
        >
          ← Back to the index
        </NuxtLink>
      </div>
    </div>

    <!-- Loaded -->
    <article v-else>
      <!-- Cover hero -->
      <header class="relative flex min-h-[88vh] flex-col justify-end overflow-hidden">
        <div class="absolute inset-0">
          <img
            v-if="cover"
            :src="cover"
            :alt="`Cover art for ${anime.title}`"
            fetchpriority="high"
            class="h-full w-full object-cover object-center"
          />
          <div class="absolute inset-0 bg-gradient-to-t from-void via-void/80 to-void/40" />
          <div
            class="pointer-events-none absolute inset-0 [background:radial-gradient(120%_90%_at_50%_0%,transparent,rgba(14,10,16,0.7))]"
          />
        </div>

        <div class="container-page relative z-10 pb-[10vh] pt-28">
          <NuxtLink
            to="/"
            data-magnetic
            class="mb-8 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-bone-dim transition-colors duration-300 hover:text-rose"
          >
            <span aria-hidden="true">←</span> The index
          </NuxtLink>

          <div class="flex flex-wrap items-center gap-3 font-mono text-xs uppercase tracking-[0.3em] text-rose">
            <span v-if="anime.type">{{ anime.type }}</span>
            <span v-if="anime.status" class="text-bone-faint">· {{ anime.status }}</span>
            <span v-if="anime.season || anime.year" class="text-bone-faint">
              · {{ anime.season ? anime.season + ' ' : '' }}{{ year(anime) }}
            </span>
          </div>

          <SplitReveal
            as="h1"
            unit="chars"
            :stagger="0.014"
            :start="'top 95%'"
            class="mt-5 max-w-5xl font-display text-[clamp(2.5rem,8vw,7rem)] uppercase leading-[0.86] tracking-tightest text-balance text-bone"
          >
            {{ anime.title }}
          </SplitReveal>

          <p v-if="englishTitle" class="mt-4 text-lg text-bone-dim">{{ englishTitle }}</p>
          <p v-if="anime.title_japanese" class="text-sm text-bone-faint">
            {{ anime.title_japanese }}
          </p>

          <div class="mt-8 flex flex-wrap gap-3">
            <a
              :href="anime.url"
              target="_blank"
              rel="noopener noreferrer"
              data-magnetic
              class="inline-flex items-center gap-2 rounded-full bg-rose px-6 py-3 text-sm font-medium uppercase tracking-[0.15em] text-void transition-transform duration-300 ease-house hover:-translate-y-0.5"
            >
              MyAnimeList ↗
            </a>
            <a
              v-if="trailerUrl"
              :href="trailerUrl"
              target="_blank"
              rel="noopener noreferrer"
              data-magnetic
              class="inline-flex items-center gap-2 rounded-full border border-bone-faint/30 px-6 py-3 text-sm font-medium uppercase tracking-[0.15em] text-bone transition-colors duration-300 hover:border-rose hover:text-rose"
            >
              <span aria-hidden="true">▶</span> Trailer
            </a>
          </div>
        </div>
      </header>

      <!-- Stats + synopsis spread -->
      <section class="container-page py-24">
        <div class="grid gap-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <!-- Typeset stat sidebar -->
          <Reveal :y="30" :stagger="0.06" class="grid grid-cols-2 gap-px self-start border hairline bg-void-200/40">
            <div
              v-for="s in stats"
              :key="s.label"
              class="bg-void p-5"
            >
              <dt class="font-mono text-[11px] uppercase tracking-[0.2em] text-bone-faint">
                {{ s.label }}
              </dt>
              <dd class="mt-2 font-display text-3xl uppercase leading-none text-bone nums">
                {{ s.value }}
              </dd>
              <dd v-if="s.sub" class="mt-1 text-xs text-bone-faint nums">{{ s.sub }}</dd>
            </div>
          </Reveal>

          <!-- Synopsis as a feature column -->
          <div>
            <Reveal :y="20" class="mb-6 flex items-center gap-4">
              <span class="font-mono text-xs uppercase tracking-[0.3em] text-rose">Synopsis</span>
              <span class="h-px flex-1 bg-void-200" />
            </Reveal>

            <SplitReveal
              as="p"
              unit="words"
              :stagger="0.006"
              :duration="0.7"
              class="max-w-2xl text-pretty text-xl leading-relaxed text-bone sm:text-2xl"
            >
              {{ synopsisLead(anime.synopsis, 320) || 'No synopsis on record for this title.' }}
            </SplitReveal>

            <p
              v-if="anime.synopsis && anime.synopsis.length > 320"
              class="mt-6 max-w-2xl whitespace-pre-line text-pretty leading-relaxed text-bone-dim"
            >
              {{ anime.synopsis }}
            </p>

            <!-- Genres + studios -->
            <Reveal :y="20" class="mt-10 grid gap-8 sm:grid-cols-2">
              <div v-if="anime.genres.length">
                <h2 class="font-mono text-xs uppercase tracking-[0.2em] text-bone-faint">Genres</h2>
                <ul class="mt-3 flex flex-wrap gap-2">
                  <li
                    v-for="g in anime.genres"
                    :key="g.mal_id"
                    class="rounded-full border border-rose/30 bg-rose/5 px-3 py-1 text-sm text-rose-soft"
                  >
                    {{ g.name }}
                  </li>
                </ul>
              </div>
              <div v-if="anime.studios.length">
                <h2 class="font-mono text-xs uppercase tracking-[0.2em] text-bone-faint">Studios</h2>
                <p class="mt-3 text-bone-dim">
                  {{ anime.studios.map((s) => s.name).join(' · ') }}
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <!-- Trailer -->
      <section v-if="trailerEmbed" class="container-page pb-24">
        <Reveal :y="24">
          <div class="mb-6 flex items-center gap-4">
            <span class="font-mono text-xs uppercase tracking-[0.3em] text-rose">Trailer</span>
            <span class="h-px flex-1 bg-void-200" />
          </div>
          <div class="aspect-video w-full overflow-hidden rounded-xl border hairline bg-void-50">
            <iframe
              :src="trailerEmbed"
              :title="`${anime.title} trailer`"
              class="h-full w-full"
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowfullscreen
            />
          </div>
        </Reveal>
      </section>

      <!-- Character rail -->
      <section v-if="castData.length" class="py-12">
        <div class="container-page mb-8">
          <Reveal :y="20" class="flex items-center gap-4">
            <span class="font-mono text-xs uppercase tracking-[0.3em] text-rose">Cast</span>
            <span class="h-px flex-1 bg-void-200" />
          </Reveal>
        </div>
        <div
          class="flex gap-5 overflow-x-auto px-5 pb-4 sm:px-8 lg:px-12 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <figure
            v-for="c in castData"
            :key="c.character.mal_id"
            class="w-32 shrink-0"
          >
            <div class="aspect-[3/4] overflow-hidden rounded-lg bg-void-100">
              <img
                :src="coverImage(c.character.images)"
                :alt="`Portrait of ${c.character.name}`"
                loading="lazy"
                class="h-full w-full object-cover"
              />
            </div>
            <figcaption class="mt-2 space-y-0.5">
              <p class="truncate text-sm text-bone" :title="c.character.name">
                {{ c.character.name }}
              </p>
              <p class="text-xs text-bone-faint">{{ c.role }}</p>
            </figcaption>
          </figure>
        </div>
      </section>

      <!-- Recommendations -->
      <AnimeRail
        v-if="recItems.length"
        :items="recItems"
        kicker="If you liked this"
        heading="Go deeper"
      />
    </article>
  </div>
</template>

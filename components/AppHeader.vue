<script setup lang="ts">
/**
 * A thin floating chrome that stays out of the immersive content's way. It
 * does not have a solid bar — just the wordmark and a single utility link,
 * blended over whatever is behind. The chrome disappears; the work is the star.
 */
</script>

<template>
  <header class="pointer-events-none fixed inset-x-0 top-0 z-50">
    <div class="container-page flex h-16 items-center justify-between gap-4">
      <NuxtLink
        to="/"
        data-magnetic
        class="pointer-events-auto inline-flex items-center gap-2.5 rounded-full"
        aria-label="Sakura Noir — home"
      >
        <span class="h-2 w-2 rounded-full bg-rose shadow-glow" aria-hidden="true" />
        <span class="font-mono text-sm uppercase tracking-[0.3em] text-bone">
          Sakura<span class="text-rose">Noir</span>
        </span>
      </NuxtLink>

      <a
        href="https://docs.api.jikan.moe"
        target="_blank"
        rel="noopener noreferrer"
        data-magnetic
        class="pointer-events-auto hidden font-mono text-xs uppercase tracking-[0.2em] text-bone-faint transition-colors duration-300 hover:text-bone sm:inline"
      >
        Jikan · MyAnimeList ↗
      </a>
    </div>
  </header>
</template>

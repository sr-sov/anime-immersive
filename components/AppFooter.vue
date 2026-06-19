<script setup lang="ts">
const year = new Date().getFullYear()
</script>

<template>
  <footer class="relative border-t hairline bg-void">
    <div class="container-page py-16">
      <div class="flex flex-col gap-10 md:flex-row md:items-end md:justify-between">
        <div>
          <p class="font-display text-5xl uppercase leading-none text-bone sm:text-7xl">
            Sakura<span class="text-rose">Noir</span>
          </p>
          <p class="mt-4 max-w-md text-sm leading-relaxed text-bone-dim">
            An immersive, scroll-driven anime index. A senior frontend motion
            study — built with Nuxt, GSAP ScrollTrigger and OGL, held to sixty
            frames with a first-class reduced-motion path.
          </p>
        </div>
        <div class="flex flex-col gap-2 font-mono text-xs uppercase tracking-[0.2em] text-bone-faint md:text-right">
          <a
            href="https://jikan.moe"
            target="_blank"
            rel="noopener noreferrer"
            class="transition-colors duration-300 hover:text-bone"
          >
            Data · Jikan / MyAnimeList ↗
          </a>
          <a
            href="https://github.com/sr-sov/anime-immersive"
            target="_blank"
            rel="noopener noreferrer"
            class="transition-colors duration-300 hover:text-bone"
          >
            Source · GitHub ↗
          </a>
          <span class="mt-4 text-bone-faint">&copy; {{ year }} · Work sample</span>
        </div>
      </div>
    </div>
  </footer>
</template>

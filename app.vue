<script setup lang="ts">
import { useSmoothScroll } from '~/composables/useSmoothScroll'

/**
 * Root shell. Mounts the app-wide motion services once:
 *  - Lenis smooth scroll wired to the GSAP ticker (honors reduced motion),
 *  - the magnetic custom cursor (fine-pointer + no-reduced-motion only).
 * Page content cross-fades between routes (the cine transition).
 */
useSmoothScroll()
</script>

<template>
  <div class="relative flex min-h-screen flex-col bg-void">
    <a
      href="#content"
      class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded focus:bg-rose focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-void"
    >
      Skip to content
    </a>

    <AppHeader />

    <main id="content" class="flex-1">
      <NuxtPage />
    </main>

    <AppFooter />

    <ClientOnly>
      <MagneticCursor />
    </ClientOnly>
  </div>
</template>

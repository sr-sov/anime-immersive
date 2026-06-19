<script setup lang="ts">
/** Neutral empty state — e.g. a search with no matches. Teaches the space. */
withDefaults(
  defineProps<{
    title?: string
    message?: string
  }>(),
  {
    title: 'Nothing in frame',
    message: 'No titles matched. Try another name or genre.',
  },
)
</script>

<template>
  <div
    class="flex flex-col items-center justify-center rounded-lg border border-dashed hairline bg-void-50/40 px-6 py-16 text-center"
    role="status"
  >
    <svg
      class="mb-4 h-10 w-10 text-bone-faint"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path stroke-linecap="round" d="m21 21-4.3-4.3" />
    </svg>
    <h2 class="font-display text-2xl uppercase text-bone">{{ title }}</h2>
    <p class="mt-2 max-w-sm text-sm leading-relaxed text-bone-dim">{{ message }}</p>
    <slot />
  </div>
</template>

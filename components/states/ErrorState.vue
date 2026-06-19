<script setup lang="ts">
/**
 * Error state with a retry affordance. Emits `retry` so the parent can re-run
 * its useAsyncData `refresh()` (or any recovery action). Copy names the likely
 * cause (Jikan rate limit) and the next step.
 */
withDefaults(
  defineProps<{
    title?: string
    message?: string
  }>(),
  {
    title: 'The feed went dark',
    message:
      'We could not reach the anime database. This is usually a brief Jikan rate limit. Give it a moment, then retry.',
  },
)

const emit = defineEmits<{ retry: [] }>()
</script>

<template>
  <div
    class="flex flex-col items-center justify-center rounded-lg border border-rose/25 bg-rose/5 px-6 py-16 text-center"
    role="alert"
  >
    <svg
      class="mb-4 h-10 w-10 text-rose"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      aria-hidden="true"
    >
      <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v4" />
      <path stroke-linecap="round" stroke-linejoin="round" d="M12 17h.01" />
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.7 3.86a2 2 0 0 0-3.42 0Z"
      />
    </svg>
    <h2 class="font-display text-2xl uppercase text-bone">{{ title }}</h2>
    <p class="mt-2 max-w-sm text-sm leading-relaxed text-bone-dim">{{ message }}</p>
    <button
      type="button"
      data-magnetic
      class="mt-6 inline-flex items-center gap-2 rounded-full border border-rose/40 bg-rose/10 px-5 py-2.5 text-sm font-medium uppercase tracking-[0.15em] text-bone transition-colors duration-300 hover:border-rose hover:bg-rose/20"
      @click="emit('retry')"
    >
      <svg
        class="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="M3 12a9 9 0 1 0 3-6.7L3 8" />
        <path stroke-linecap="round" stroke-linejoin="round" d="M3 3v5h5" />
      </svg>
      Retry
    </button>
  </div>
</template>

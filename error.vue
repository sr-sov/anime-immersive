<script setup lang="ts">
import type { NuxtError } from '#app'

defineProps<{ error: NuxtError }>()

function goHome() {
  // clearError navigates back into the app and resets the error boundary.
  clearError({ redirect: '/' })
}
</script>

<template>
  <div class="flex min-h-screen flex-col bg-void">
    <AppHeader />
    <main class="container-page flex flex-1 flex-col items-center justify-center py-24 text-center">
      <p class="font-display text-[8rem] uppercase leading-none text-rose nums">
        {{ error.statusCode || 'Err' }}
      </p>
      <h1 class="mt-2 font-display text-3xl uppercase text-bone">
        {{ error.statusCode === 404 ? 'Lost the thread' : 'Something broke' }}
      </h1>
      <p class="mt-3 max-w-md leading-relaxed text-bone-dim">
        {{
          error.statusCode === 404
            ? 'That page does not exist. Head back to the index.'
            : 'An unexpected error occurred. Return home and start again.'
        }}
      </p>
      <button
        type="button"
        data-magnetic
        class="mt-8 inline-flex items-center gap-2 rounded-full bg-rose px-6 py-3 text-sm font-medium uppercase tracking-[0.15em] text-void transition-transform duration-300 ease-house hover:-translate-y-0.5"
        @click="goHome"
      >
        Back to the index
      </button>
    </main>
    <AppFooter />
  </div>
</template>
